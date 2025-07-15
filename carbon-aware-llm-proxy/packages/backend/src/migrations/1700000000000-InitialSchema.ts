import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums first
    await queryRunner.query(`
      CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'user');
      CREATE TYPE "public"."conversation_status_enum" AS ENUM('active', 'archived', 'deleted');
      CREATE TYPE "public"."message_role_enum" AS ENUM('system', 'user', 'assistant', 'function');
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "name" character varying,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'user',
        "emailVerified" boolean NOT NULL DEFAULT false,
        "avatarUrl" character varying,
        "resetPasswordToken" character varying,
        "resetPasswordExpires" TIMESTAMP,
        "emailVerificationToken" character varying,
        "emailVerificationExpires" TIMESTAMP,
        "oauthProvider" character varying,
        "oauthId" character varying,
        "oauthProfile" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    // Create user_preferences table
    await queryRunner.query(`
      CREATE TABLE "user_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "defaultModelId" character varying,
        "defaultTemperature" double precision NOT NULL DEFAULT '0.7',
        "defaultMaxTokens" integer,
        "carbonAware" boolean NOT NULL DEFAULT true,
        "preferredRegion" character varying,
        "showCarbonImpact" boolean NOT NULL DEFAULT true,
        "theme" character varying NOT NULL DEFAULT 'system',
        "emailNotifications" boolean NOT NULL DEFAULT true,
        "notificationPreferences" jsonb,
        "uiPreferences" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "REL_3f2e4d3f27e1e1b3a4c2e3b4d5" UNIQUE ("userId"),
        CONSTRAINT "PK_3f2e4d3f27e1e1b3a4c2e3b4d5" PRIMARY KEY ("id")
      )
    `);

    // Create model_info table
    await queryRunner.query(`
      CREATE TABLE "model_info" (
        "id" character varying NOT NULL,
        "name" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "description" text,
        "contextWindow" integer NOT NULL,
        "maxTokens" integer NOT NULL,
        "trainingData" character varying NOT NULL,
        "knowledgeCutoff" character varying NOT NULL,
        "capabilities" text array NOT NULL,
        "carbonIntensity" jsonb NOT NULL,
        "latency" jsonb NOT NULL,
        "isRecommended" boolean NOT NULL DEFAULT false,
        "isCarbonAware" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        "lastUpdated" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_1234567890abcdef1234567890" PRIMARY KEY ("id")
      )
    `);

    // Create conversations table
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying,
        "userId" uuid NOT NULL,
        "status" "public"."conversation_status_enum" NOT NULL DEFAULT 'active',
        "metadata" jsonb,
        "modelId" character varying,
        "temperature" double precision,
        "maxTokens" integer,
        "carbonAware" boolean NOT NULL DEFAULT true,
        "messageCount" integer NOT NULL DEFAULT 0,
        "totalTokens" integer NOT NULL DEFAULT 0,
        "totalEmissions" double precision NOT NULL DEFAULT 0,
        "totalEnergy" double precision NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_1234567890abcdef1234567891" PRIMARY KEY ("id")
      )
    `);

    // Create messages table
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "role" "public"."message_role_enum" NOT NULL,
        "content" text NOT NULL,
        "modelId" character varying,
        "tokens" integer,
        "isStreaming" boolean NOT NULL DEFAULT false,
        "isComplete" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "parentMessageId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_1234567890abcdef1234567892" PRIMARY KEY ("id")
      )
    `);

    // Create carbon_footprints table
    await queryRunner.query(`
      CREATE TABLE "carbon_footprints" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "messageId" uuid NOT NULL,
        "emissions" decimal(10,6) NOT NULL,
        "energy" decimal(10,6) NOT NULL,
        "intensity" decimal(10,2),
        "region" character varying,
        "modelName" character varying,
        "provider" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "REL_1234567890abcdef1234567893" UNIQUE ("messageId"),
        CONSTRAINT "PK_1234567890abcdef1234567894" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_user_email" ON "users" ("email");
      CREATE INDEX "IDX_conversation_user" ON "conversations" ("userId");
      CREATE INDEX "IDX_message_conversation" ON "messages" ("conversationId");
      CREATE INDEX "IDX_message_created" ON "messages" ("createdAt");
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "user_preferences" 
        ADD CONSTRAINT "FK_user_preferences_user" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION;

      ALTER TABLE "conversations" 
        ADD CONSTRAINT "FK_conversation_user" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION;

      ALTER TABLE "conversations" 
        ADD CONSTRAINT "FK_conversation_model" 
        FOREIGN KEY ("modelId") REFERENCES "model_info"("id") 
        ON DELETE SET NULL ON UPDATE NO ACTION;

      ALTER TABLE "messages" 
        ADD CONSTRAINT "FK_message_conversation" 
        FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION;

      ALTER TABLE "messages" 
        ADD CONSTRAINT "FK_message_model" 
        FOREIGN KEY ("modelId") REFERENCES "model_info"("id") 
        ON DELETE SET NULL ON UPDATE NO ACTION;

      ALTER TABLE "carbon_footprints" 
        ADD CONSTRAINT "FK_footprint_message" 
        FOREIGN KEY ("messageId") REFERENCES "messages"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.query(`
      ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "FK_user_preferences_user";
      ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversation_user";
      ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversation_model";
      ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_message_conversation";
      ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_message_model";
      ALTER TABLE "carbon_footprints" DROP CONSTRAINT IF EXISTS "FK_footprint_message";
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS "carbon_footprints";
      DROP TABLE IF EXISTS "messages";
      DROP TABLE IF EXISTS "conversations";
      DROP TABLE IF EXISTS "model_info";
      DROP TABLE IF EXISTS "user_preferences";
      DROP TABLE IF EXISTS "users";
    `);

    // Drop enums
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."message_role_enum";
      DROP TYPE IF EXISTS "public"."conversation_status_enum";
      DROP TYPE IF EXISTS "public"."user_role_enum";
    `);
  }
}
