import { spawn } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { supabaseService } from "../src/services/supabase.service";
import { logger } from "../src/utils/logger";

function findModalAppPath(): string {
  // Try multiple possible locations for the modal app
  const possiblePaths = [
    path.join(process.cwd(), "../../modal/app.py"), // From packages/backend
    path.join(process.cwd(), "modal/app.py"),       // From project root
    path.join(__dirname, "../../../modal/app.py"),  // Relative to this script
    "/app/modal/app.py",                             // Docker container path
    path.join(__dirname, "../../modal/app.py"),     // Alternative relative path
  ];

  // Remove duplicates and resolve paths
  const uniquePaths = [...new Set(possiblePaths.map(p => path.resolve(p)))];
  
  console.log(`Searching for Modal app in ${uniquePaths.length} locations...`);
  for (const appPath of uniquePaths) {
    console.log(`Checking: ${appPath}`);
    if (fs.existsSync(appPath)) {
      console.log(`✅ Found Modal app at: ${appPath}`);
      return appPath;
    }
  }

  throw new Error(`Modal app not found. Tried paths:\n${uniquePaths.map(p => `  - ${p}`).join('\n')}`);
}

async function runModalDeploy(
  env: Record<string, string>,
): Promise<{ success: boolean; ingressUrl: string | null }> {
  return new Promise((resolve) => {
    const appPath = findModalAppPath();
    const proc = spawn("modal", ["deploy", appPath], { env });
    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      console.log(text);
    });

    proc.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      console.error(text);
    });

    proc.on("close", (code) => {
      const success = code === 0;
      let ingressUrl: string | null = null;

      if (success) {
        // Parse URL from Modal output (e.g., "App deployed to https://routly-cost-llama2-7b--asgi-app.modal.run")
        const urlMatch = stdout.match(/https:\/\/[^\s]+\.modal\.run/);
        ingressUrl = urlMatch ? urlMatch[0] : null;
        if (!ingressUrl) {
          console.warn(
            "Warning: Could not parse ingress URL from Modal output",
          );
        }
      }

      resolve({ success, ingressUrl });
    });
  });
}

(async () => {
  const forceRedeploy = process.argv.includes("--force");
  
  if (forceRedeploy) {
    console.log("🔄 Force redeployment mode enabled - will redeploy all deployments");
  }
  
  await supabaseService.initialize();
  const deployments = await supabaseService.getModelDeployments();

  for (const row of deployments || []) {
    const appName = row.app_name as string;
    const modelId = row.model_id as string;
    const functionName = row.function_name as string | null;
    const region = (row.region as string | null) ?? null;
    const status = row.status as string;
    const gpuClass = row.gpu_class as string | null;
    const scaledownWindowSec = Number(row.scaledown_window_sec ?? 180);
    const secret = row.secret as string | null;
    const ingressUrl = row.ingress_url as string | null;

    if (status === "deployed" && !forceRedeploy) {
      logger.info(`Skipping ${appName}, already deployed`);
      continue;
    }

    const env = {
      ...process.env,
      APP_NAME: appName,
      FUNCTION_NAME: functionName || "asgi-app",
      DEFAULT_MODEL_ID: modelId,
      GPU_CLASS: gpuClass || "standard",
      SCALEDOWN_WINDOW: String(scaledownWindowSec),
      DEPLOYMENT_SECRET: secret || "",
    } as Record<string, string>;

    if (region) env["REGION"] = region;

    console.log(
      `Deploying ${appName} (${modelId}) region=${region ?? "agnostic"}...`,
    );

    try {
      const { success, ingressUrl: newIngressUrl } = await runModalDeploy(env);

      if (success) {
        await supabaseService.updateModelDeployment(row.id, {
          status: "deployed",
          ingress_url: newIngressUrl || ingressUrl,
        });
        console.log(
          `✅ Deployed ${appName}${newIngressUrl ? ` at ${newIngressUrl}` : ""}`,
        );
      } else {
        await supabaseService.updateModelDeployment(row.id, { status: "error" });
        console.error(`❌ Failed to deploy ${appName}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Deploy error for ${appName}:`, error);
      await supabaseService.updateModelDeployment(row.id, { status: "error" });
      process.exit(1);
    }
  }

  console.log("🎉 All deployments completed");
})();
