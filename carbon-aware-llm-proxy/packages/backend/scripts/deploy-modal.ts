import { spawn } from "node:child_process";
import { DataSource } from "typeorm";
import * as path from "node:path";
import * as fs from "node:fs";
import dbConfig from "../src/config/database";
import { ModelDeployment } from "../src/entities/ModelDeployment";

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
  
  const ds = new DataSource(dbConfig);
  await ds.initialize();
  const repo = ds.getRepository(ModelDeployment);

  const rows = await repo.find();
  for (const r of rows) {
    if (r.status === "deployed" && !forceRedeploy) continue;

    const env = {
      ...process.env,
      APP_NAME: r.appName,
      FUNCTION_NAME: r.functionName,
      DEFAULT_MODEL_ID: r.modelId,
      GPU_CLASS: r.gpuClass,
      SCALEDOWN_WINDOW: String(r.scaledownWindowSec),
      DEPLOYMENT_SECRET: r.secret, // Pass secret to worker
    } as Record<string, string>;
    if (r.region) env["REGION"] = r.region;

    console.log(
      `Deploying ${r.appName} (${r.modelId}) region=${r.region ?? "agnostic"}...`,
    );

    try {
      const { success, ingressUrl } = await runModalDeploy(env);

      if (success) {
        await repo.update(r.id, {
          status: "deployed",
          ingressUrl: ingressUrl || r.ingressUrl, // Keep existing if parse failed
        });
        console.log(
          `✅ Deployed ${r.appName}${ingressUrl ? ` at ${ingressUrl}` : ""}`,
        );
      } else {
        await repo.update(r.id, { status: "error" });
        console.error(`❌ Failed to deploy ${r.appName}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Deploy error for ${r.appName}:`, error);
      await repo.update(r.id, { status: "error" });
      process.exit(1);
    }
  }

  await ds.destroy();
  console.log("🎉 All deployments completed");
})();
