import { createClient } from "redis";
import { logger } from "../utils/logger";

class RedisService {
  private client: ReturnType<typeof createClient>;
  private isConnected: boolean = false;

  constructor() {
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = process.env.REDIS_PORT || "6379";
    const redisUrl =
      process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

    // Check if we're connecting to an external service that requires TLS
    const isExternalRedis = redisUrl.includes("upstash.io") || 
                           redisUrl.includes("redis.cloud") || 
                           redisUrl.includes("amazonaws.com") ||
                           process.env.NODE_ENV === "production";

    this.client = createClient({
      url: redisUrl,
      socket: {
        tls: isExternalRedis,
        rejectUnauthorized: false, // Accept self-signed certificates for some services
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            logger.error("Max Redis reconnection attempts reached");
            return new Error("Max reconnection attempts reached");
          }
          return Math.min(retries * 100, 5000); // Exponential backoff up to 5s
        },
        connectTimeout: 30000, // 30 second timeout
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on("connect", () => {
      const redisUrl = process.env.REDIS_URL || "localhost:6379";
      logger.info(`Redis client connected to ${redisUrl.replace(/\/\/[^:]*:[^@]*@/, '//[CREDENTIALS]@')}`);
      this.isConnected = true;
    });

    this.client.on("error", (error) => {
      const redisUrl = process.env.REDIS_URL || "localhost:6379";
      logger.error(`Redis error connecting to ${redisUrl.replace(/\/\/[^:]*:[^@]*@/, '//[CREDENTIALS]@')}:`, error);
      this.isConnected = false;
    });

    this.client.on("reconnecting", () => {
      logger.info("Redis client reconnecting...");
    });

    this.client.on("end", () => {
      logger.warn("Redis client connection closed");
      this.isConnected = false;
    });

    this.client.on("ready", () => {
      logger.info("Redis client ready for commands");
    });
  }

  async connect() {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
      } catch (error) {
        logger.error("Failed to connect to Redis:", error);
        throw error;
      }
    }
    return this.client;
  }

  async disconnect() {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async get(key: string) {
    try {
      if (!this.isConnected) await this.connect();
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error("Redis get error:", error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number) {
    try {
      if (!this.isConnected) await this.connect();
      const serializedValue = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }

      return true;
    } catch (error) {
      logger.error("Redis set error:", error);
      return false;
    }
  }

  async del(key: string) {
    try {
      if (!this.isConnected) await this.connect();
      return await this.client.del(key);
    } catch (error) {
      logger.error("Redis delete error:", error);
      return 0;
    }
  }

  async hGet(key: string, field: string) {
    try {
      if (!this.isConnected) await this.connect();
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error("Redis hGet error:", error);
      return null;
    }
  }

  async hSet(key: string, field: string, value: any) {
    try {
      if (!this.isConnected) await this.connect();
      const serializedValue = JSON.stringify(value);
      return await this.client.hSet(key, field, serializedValue);
    } catch (error) {
      logger.error("Redis hSet error:", error);
      return 0;
    }
  }

  async hDel(key: string, field: string) {
    try {
      if (!this.isConnected) await this.connect();
      return await this.client.hDel(key, field);
    } catch (error) {
      logger.error("Redis hDel error:", error);
      return 0;
    }
  }

  async hGetAll(key: string): Promise<Record<string, any>> {
    try {
      if (!this.isConnected) await this.connect();
      const result = await this.client.hGetAll(key);
      // Convert string values to their parsed values
      return Object.fromEntries(
        Object.entries(result).map(([field, value]) => [
          field,
          JSON.parse(value),
        ]),
      );
    } catch (error) {
      logger.error("Redis hGetAll error:", error);
      return {};
    }
  }

  async expire(key: string, seconds: number) {
    try {
      if (!this.isConnected) await this.connect();
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error("Redis expire error:", error);
      return false;
    }
  }

  async ttl(key: string) {
    try {
      if (!this.isConnected) await this.connect();
      return await this.client.ttl(key);
    } catch (error) {
      logger.error("Redis ttl error:", error);
      return -2; // Key doesn't exist or error occurred
    }
  }

  /**
   * Start a Redis transaction (MULTI/EXEC)
   * @returns A transaction object that can be used to chain commands
   */
  multi() {
    if (!this.isConnected) {
      // Note: This is a simplified implementation. In a real-world scenario,
      // you might want to handle the connection state more gracefully.
      throw new Error("Redis client is not connected");
    }
    return this.client.multi();
  }

  async withCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300, // 5 minutes default TTL
    forceRefresh: boolean = false,
  ): Promise<T> {
    try {
      // If not forcing refresh, try to get from cache first
      if (!forceRefresh) {
        const cached = await this.get(key);
        if (cached !== null) {
          logger.debug(`Cache hit for key: ${key}`);
          return cached;
        }
      }

      // If cache miss or force refresh, fetch fresh data
      logger.debug(`Cache miss for key: ${key}, fetching fresh data`);
      const data = await fetchFn();

      // Cache the result
      await this.set(key, data, ttlSeconds);

      return data;
    } catch (error) {
      // If there's an error with Redis, try to fetch fresh data anyway
      logger.error("Cache error, falling back to direct fetch:", error);
      return fetchFn();
    }
  }
}

export const redisService = new RedisService();

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down Redis client...");
  await redisService.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down Redis client...");
  await redisService.disconnect();
  process.exit(0);
});
