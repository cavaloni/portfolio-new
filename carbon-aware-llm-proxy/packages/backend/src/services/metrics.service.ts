import { webSocketService } from "./websocket.service";
import { logger } from "../utils/logger";
import { redisService } from "./redis.service";

// Types for metrics
type SystemMetrics = {
  timestamp: number;
  cpu: {
    usage: number; // 0-100%
    cores: number;
    load: number[]; // 1, 5, 15 min load averages
  };
  memory: {
    total: number; // in bytes
    used: number; // in bytes
    free: number; // in bytes
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  clients: {
    websocket: number;
    http: number;
  };
  carbonIntensity: Record<string, number>; // region -> intensity
};

type UserMetrics = {
  userId: string;
  timestamp: number;
  requests: {
    total: number;
    lastHour: number;
    lastDay: number;
  };
  carbonFootprint: {
    total: number; // in gCO2eq
    lastHour: number;
    lastDay: number;
  };
  models: Array<{
    modelId: string;
    requests: number;
    tokens: number;
    carbon: number; // in gCO2eq
  }>;
};

class MetricsService {
  private systemMetrics: SystemMetrics | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private httpRequestCount = 0;
  private lastHourRequestCount = 0;
  private lastDayRequestCount = 0;
  private lastHourTimestamp = Date.now();
  private lastDayTimestamp = Date.now();

  // Initialize metrics collection
  initialize() {
    if (this.isInitialized) {
      logger.warn("Metrics service already initialized");
      return;
    }

    // Initial metrics collection
    this.collectSystemMetrics();

    // Set up periodic collection
    this.metricsInterval = setInterval(
      () => this.collectSystemMetrics(),
      60000, // Every minute
    );

    // Set up hourly and daily rollups
    setInterval(() => this.rollupHourlyMetrics(), 60 * 60 * 1000); // Every hour
    setInterval(() => this.rollupDailyMetrics(), 24 * 60 * 60 * 1000); // Every day

    this.isInitialized = true;
    logger.info("Metrics service initialized");
  }

  // Clean up resources
  shutdown() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.isInitialized = false;
  }

  // Record an HTTP request
  recordHttpRequest() {
    this.httpRequestCount++;
    this.lastHourRequestCount++;
    this.lastDayRequestCount++;
  }

  // Record model usage for carbon footprint calculation
  async recordModelUsage(
    userId: string,
    modelId: string,
    tokens: number,
    carbonGrams: number,
  ) {
    try {
      const now = Date.now();
      const dayKey = `metrics:user:${userId}:${this.getDayKey()}`;
      const hourKey = `metrics:user:${userId}:${this.getHourKey()}`;

      // Update Redis counters with transaction
      await redisService
        .multi()
        .hIncrBy(dayKey, "requests", 1)
        .hIncrBy(dayKey, "tokens", tokens)
        .hIncrByFloat(dayKey, "carbon", carbonGrams)
        .hIncrBy(dayKey, `model:${modelId}:count`, 1)
        .hIncrBy(dayKey, `model:${modelId}:tokens`, tokens)
        .hIncrByFloat(dayKey, `model:${modelId}:carbon`, carbonGrams)
        .expire(dayKey, 7 * 24 * 60 * 60) // Keep for 7 days
        .exec();

      // Also update hourly metrics
      await redisService
        .multi()
        .hIncrBy(hourKey, "requests", 1)
        .hIncrBy(hourKey, "tokens", tokens)
        .hIncrByFloat(hourKey, "carbon", carbonGrams)
        .expire(hourKey, 48 * 60 * 60) // Keep for 2 days
        .exec();

      // Broadcast user metrics update
      const userMetrics = await this.getUserMetrics(userId);
      webSocketService.broadcast("user_metrics", userMetrics);
    } catch (error) {
      logger.error("Error recording model usage:", error);
    }
  }

  // Get system metrics
  getSystemMetrics(): SystemMetrics | null {
    return this.systemMetrics;
  }

  // Get user metrics
  async getUserMetrics(userId: string): Promise<UserMetrics> {
    try {
      const now = Date.now();
      const dayKey = `metrics:user:${userId}:${this.getDayKey()}`;
      const hourKey = `metrics:user:${userId}:${this.getHourKey()}`;

      // Get daily metrics
      const [dayMetrics, hourMetrics] = await Promise.all([
        redisService.hGetAll(dayKey) as Promise<Record<string, string>>,
        redisService.hGetAll(hourKey) as Promise<Record<string, string>>,
      ]);

      // Get model usage for the day
      const modelMetrics = Object.entries(dayMetrics)
        .filter(([key]) => key.startsWith("model:") && key.endsWith(":count"))
        .map(([key, count]) => {
          const modelId = key.split(":")[1];
          return {
            modelId,
            requests: parseInt(count, 10) || 0,
            tokens: parseInt(dayMetrics[`model:${modelId}:tokens`] || "0", 10),
            carbon: parseFloat(dayMetrics[`model:${modelId}:carbon`] || "0"),
          };
        });

      return {
        userId,
        timestamp: now,
        requests: {
          total: parseInt(dayMetrics.requests || "0", 10),
          lastHour: parseInt(hourMetrics.requests || "0", 10),
          lastDay: parseInt(dayMetrics.requests || "0", 10),
        },
        carbonFootprint: {
          total: parseFloat(dayMetrics.carbon || "0"),
          lastHour: parseFloat(hourMetrics.carbon || "0"),
          lastDay: parseFloat(dayMetrics.carbon || "0"),
        },
        models: modelMetrics,
      };
    } catch (error) {
      logger.error("Error getting user metrics:", error);
      return {
        userId,
        timestamp: Date.now(),
        requests: { total: 0, lastHour: 0, lastDay: 0 },
        carbonFootprint: { total: 0, lastHour: 0, lastDay: 0 },
        models: [],
      };
    }
  }

  // Collect system metrics
  private async collectSystemMetrics() {
    try {
      const now = Date.now();

      // In a real app, you would collect actual system metrics here
      // This is a simplified version that generates mock data
      this.systemMetrics = {
        timestamp: now,
        cpu: {
          usage: Math.min(100, Math.max(0, 20 + Math.random() * 60)), // 20-80%
          cores: require("os").cpus().length,
          load: require("os").loadavg(),
        },
        memory: {
          total: require("os").totalmem(),
          free: require("os").freemem(),
          used: require("os").totalmem() - require("os").freemem(),
        },
        network: {
          bytesIn: Math.floor(Math.random() * 1024 * 1024), // Mock data
          bytesOut: Math.floor(Math.random() * 512 * 1024), // Mock data
        },
        clients: {
          websocket: webSocketService.getClientCount(),
          http: this.httpRequestCount,
        },
        carbonIntensity: {
          "us-west-2": 120 + Math.random() * 80, // 120-200 gCO2eq/kWh
          "us-east-1": 80 + Math.random() * 100, // 80-180 gCO2eq/kWh
          "eu-west-1": 60 + Math.random() * 80, // 60-140 gCO2eq/kWh
        },
      };

      // Broadcast system metrics to subscribers
      webSocketService.broadcast("system_status", this.systemMetrics);

      // Also broadcast carbon intensity updates
      for (const [region, intensity] of Object.entries(
        this.systemMetrics.carbonIntensity,
      )) {
        webSocketService.broadcast("carbon_intensity", {
          region,
          intensity,
          unit: "gCO2eq/kWh",
          timestamp: new Date(now).toISOString(),
        });
      }
    } catch (error) {
      logger.error("Error collecting system metrics:", error);
    }
  }

  // Roll up hourly metrics
  private rollupHourlyMetrics() {
    const now = new Date();
    this.lastHourRequestCount = 0;
    this.lastHourTimestamp = now.getTime();
    logger.info("Rolled up hourly metrics");
  }

  // Roll up daily metrics
  private rollupDailyMetrics() {
    const now = new Date();
    this.lastDayRequestCount = 0;
    this.lastDayTimestamp = now.getTime();
    logger.info("Rolled up daily metrics");
  }

  // Get current day key in YYYY-MM-DD format
  private getDayKey(date: Date = new Date()): string {
    return date.toISOString().split("T")[0];
  }

  // Get current hour key in YYYY-MM-DD-HH format
  private getHourKey(date: Date = new Date()): string {
    const isoStr = date.toISOString();
    const [dateStr, timeStr] = isoStr.split("T");
    const hour = timeStr.split(":")[0];
    return `${dateStr}-${hour}`;
  }
}

export const metricsService = new MetricsService();
