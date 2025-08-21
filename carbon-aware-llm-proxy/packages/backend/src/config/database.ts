import { DataSource, DataSourceOptions } from "typeorm";
import dotenv from "dotenv";
import { User } from "../entities/User";
import { UserPreferences } from "../entities/UserPreferences";
import { Conversation } from "../entities/Conversation";
import { Message } from "../entities/Message";
import { ModelInfo } from "../entities/ModelInfo";
import { CarbonFootprint } from "../entities/CarbonFootprint";
import { ModelDeployment } from "../entities/ModelDeployment";
// Removed RunPod and Novita entities

dotenv.config();

export const dbConfig: DataSourceOptions = {
  type: "postgres",
  // Prefer a single DATABASE_URL if provided (e.g., from Fly Postgres attach)
  // Fallback to individual settings for local/dev environments
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "carbon_aware_llm",
      }),
  // Optional SSL support for managed Postgres providers
  ...(String(process.env.DB_SSL || process.env.DATABASE_SSL).toLowerCase() ===
  "true"
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
  synchronize: false, // Use migrations instead of auto-sync
  logging: process.env.NODE_ENV !== "production",
  entities: [
    User,
    UserPreferences,
    Conversation,
    Message,
    ModelInfo,
    CarbonFootprint,
    ModelDeployment,
  ],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
};

// For CLI migration generation
export const dataSource = new DataSource(dbConfig);

export default dbConfig;
