import { DataSource, DataSourceOptions } from "typeorm";
import dotenv from "dotenv";
import { User } from "../entities/User";
import { UserPreferences } from "../entities/UserPreferences";
import { Conversation } from "../entities/Conversation";
import { Message } from "../entities/Message";
import { ModelInfo } from "../entities/ModelInfo";
import { CarbonFootprint } from "../entities/CarbonFootprint";
// Removed RunPod and Novita entities

dotenv.config();

export const dbConfig: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "carbon_aware_llm",
  synchronize: false, // Use migrations instead of auto-sync
  logging: process.env.NODE_ENV !== "production",
  entities: [
    User,
    UserPreferences,
    Conversation,
    Message,
    ModelInfo,
    CarbonFootprint,
  ],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
};

// For CLI migration generation
export const dataSource = new DataSource(dbConfig);

export default dbConfig;
