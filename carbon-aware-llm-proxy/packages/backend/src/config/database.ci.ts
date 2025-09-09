import { DataSource, DataSourceOptions } from "typeorm";
import dotenv from "dotenv";
import { User } from "../entities/User";
import { UserPreferences } from "../entities/UserPreferences";
import { Conversation } from "../entities/Conversation";
import { Message } from "../entities/Message";
import { ModelInfo } from "../entities/ModelInfo";
import { CarbonFootprint } from "../entities/CarbonFootprint";
import { ModelDeployment } from "../entities/ModelDeployment";

dotenv.config();

const isCompiled = !__filename.endsWith('.ts');

/**
 * CI-specific database configuration with enhanced error handling and DNS resolution
 * This configuration is designed to work in GitLab CI and other containerized environments
 */
export const dbConfigCI: DataSourceOptions = {
  type: "postgres",
  // Enhanced connection configuration for CI environments
  ...(process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        // Additional options for external databases
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        connectTimeoutMS: 30000, // 30 seconds
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
      }
    : {
        host: process.env.DB_HOST || "postgres",
        port: parseInt(process.env.DB_PORT || "5432"),
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "carbon_aware_llm",
        // Enhanced connection settings for CI
        connectTimeoutMS: 30000,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        // Retry logic for connection failures
        retryAttempts: 5,
        retryDelay: 3000,
      }),
  // SSL configuration with fallback
  ...(String(process.env.DB_SSL || process.env.DATABASE_SSL).toLowerCase() === "true"
    ? { ssl: { rejectUnauthorized: false } }
    : { ssl: false }),
  synchronize: false, // Never synchronize in CI/production
  logging: process.env.NODE_ENV !== "production" && process.env.CI_DEBUG === "true",
  // Enhanced entity loading
  entities: [
    User,
    UserPreferences,
    Conversation,
    Message,
    ModelInfo,
    CarbonFootprint,
    ModelDeployment,
  ],
  // Migration configuration for CI
  migrations: isCompiled ? ["dist/migrations/*.js"] : ["src/migrations/*.ts"],
  subscribers: [],
  // Additional options for CI stability
  extra: {
    // Connection pool settings
    max: 5, // Maximum connections
    min: 1, // Minimum connections
    // Connection validation
    connectionTimeoutMillis: 30000,
    query_timeout: 30000,
    statement_timeout: 30000,
    // Handle connection drops gracefully
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  },
};

// For CLI migration generation in CI
export const dataSourceCI = new DataSource({
  ...dbConfigCI,
  // Ensure migrations run with proper isolation
  migrationsTransactionMode: 'each', // Run each migration in its own transaction
});

export default dbConfigCI;
