import { Router } from "express";
import { z } from "zod";
import axios from "axios";
import crypto from "crypto";
import { databaseService } from "../../services/database.service";
import { redisService } from "../../services/redis.service";
import { ModelDeployment } from "../../entities/ModelDeployment";
import { auth } from "../../middleware/auth";

export const presenceRouter = Router();

const presenceSchema = z.object({
  region: z.string().optional(),
});

// Require authentication for presence heartbeat
presenceRouter.use(auth.authenticate);

function createSignature(
  body: string,
  timestamp: string,
  secret: string,
): string {
  const message = body + timestamp;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

async function warmDeployment(deployment: ModelDeployment): Promise<boolean> {
  if (!deployment.ingressUrl || !deployment.secret) {
    return false;
  }

  const lockKey = `warming:${deployment.appName}`;
  const lockExists = await redisService.get(lockKey);
  if (lockExists) {
    return true; // Already warming
  }

  try {
    // Set warming lock
    await redisService.set(lockKey, { timestamp: Date.now() }, 90); // 90s lock

    const body = JSON.stringify({});
    const timestamp = Date.now().toString();
    const signature = createSignature(body, timestamp, deployment.secret);

    await axios.post(`${deployment.ingressUrl}/warmup`, JSON.parse(body), {
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-timestamp": timestamp,
      },
      timeout: 15000,
    });

    // Mark as warm with TTL matching scaledown window
    const ttl = Math.max(60, deployment.scaledownWindowSec || 180);
    await redisService.set(`warm:${deployment.appName}`, true, ttl);

    return true;
  } catch (error) {
    console.error(`Failed to warm ${deployment.appName}:`, error);
    return false;
  }
}

presenceRouter.post("/", async (req, res) => {
  try {
    const parsed = presenceSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "invalid_request", details: parsed.error.issues });
    }

    const { region } = parsed.data;
    const ds = databaseService.getDataSource();
    const repo = ds.getRepository(ModelDeployment);

    // Find deployments that should be kept warm (alwaysWarm=true)
    const whereClause: any = { status: "deployed", alwaysWarm: true };
    if (region) {
      whereClause.region = region;
    }

    const deployments = await repo.find({ where: whereClause });

    // Warm each deployment (with debouncing via Redis locks)
    const warmResults = await Promise.allSettled(
      deployments.map((d) => warmDeployment(d)),
    );

    const warmed = warmResults.filter(
      (r) => r.status === "fulfilled" && r.value,
    ).length;
    const total = deployments.length;

    res.json({
      success: true,
      message: `Warmed ${warmed}/${total} deployments`,
      deployments: deployments.map((d) => ({
        appName: d.appName,
        modelId: d.modelId,
        region: d.region,
      })),
    });
  } catch (error: any) {
    console.error("Presence heartbeat error:", error);
    res.status(500).json({
      error: "internal_error",
      message: "Failed to process presence heartbeat",
    });
  }
});
