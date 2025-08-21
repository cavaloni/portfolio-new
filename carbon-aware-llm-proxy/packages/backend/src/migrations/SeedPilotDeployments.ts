import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedPilotDeployments1710000000001 implements MigrationInterface {
  name = "SeedPilotDeployments1710000000001";

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      INSERT INTO "model_deployments"
        ("modelId", "appName", "functionName", "region", "gpuClass", "alwaysWarm", "warmDepth", "scaledownWindowSec", "status", "preference", "scoreCost", "scoreSpeed", "scoreQuality", "scoreGreen", "metadata")
      VALUES
        ('meta-llama/Llama-2-7b-chat-hf', 'routly-cost-llama2-7b', 'asgi-app', NULL, 'A10G', TRUE, 'light', 180, 'pending', 'cost', 100, 0, 0, 0, '{"note":"region-agnostic"}'::jsonb),
        ('mistralai/Mistral-7B-Instruct-v0.3', 'routly-speed-mistral-7b', 'asgi-app', NULL, 'A10G', TRUE, 'light', 180, 'pending', 'speed', 0, 100, 0, 0, '{"note":"region-agnostic"}'::jsonb),
        ('Qwen/Qwen3-14B', 'routly-quality-qwen3-14b-toronto', 'asgi-app', 'ca-toronto-1', 'A10G', FALSE, 'light', 180, 'pending', 'quality', 0, 0, 100, 0, '{"note":"toronto only"}'::jsonb)
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DELETE FROM "model_deployments" WHERE "appName" IN (
        'routly-cost-llama2-7b',
        'routly-speed-mistral-7b',
        'routly-quality-qwen3-14b-toronto'
      )
    `);
  }
}
