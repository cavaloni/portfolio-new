import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateModelDeployments1710000000000 implements MigrationInterface {
  name = "CreateModelDeployments1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "model_deployments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "modelId" character varying NOT NULL,
        "appName" character varying NOT NULL,
        "functionName" character varying NOT NULL,
        "region" character varying,
        "gpuClass" character varying NOT NULL,
        "alwaysWarm" boolean NOT NULL DEFAULT false,
        "warmDepth" character varying NOT NULL DEFAULT 'light',
        "scaledownWindowSec" integer NOT NULL DEFAULT 180,
        "status" character varying NOT NULL DEFAULT 'pending',
        "ingressUrl" character varying,
        "preference" character varying,
        "scoreCost" smallint NOT NULL DEFAULT 0,
        "scoreSpeed" smallint NOT NULL DEFAULT 0,
        "scoreQuality" smallint NOT NULL DEFAULT 0,
        "scoreGreen" smallint NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_model_deployments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_model_deployments_appName" UNIQUE ("appName")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "model_deployments"`);
  }
}
