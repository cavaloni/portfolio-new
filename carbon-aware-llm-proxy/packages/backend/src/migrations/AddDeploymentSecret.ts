import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeploymentSecret1710000000002 implements MigrationInterface {
  name = "AddDeploymentSecret1710000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);
    await queryRunner.query(`
      ALTER TABLE "model_deployments" 
      ADD COLUMN "secret" character varying;
    `);

    // Generate secrets for existing rows
    await queryRunner.query(`
      UPDATE "model_deployments" 
      SET "secret" = encode(gen_random_bytes(32), 'hex')
      WHERE "secret" IS NULL;
    `);

    // Make secret required
    await queryRunner.query(`
      ALTER TABLE "model_deployments" 
      ALTER COLUMN "secret" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "model_deployments" 
      DROP COLUMN "secret";
    `);
  }
}
