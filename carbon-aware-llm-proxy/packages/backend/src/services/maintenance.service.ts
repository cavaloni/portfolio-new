import { logger } from "../utils/logger";
// Removed RunPod maintenance integration

export class MaintenanceService {
  // No provider maintenance required in Modal MVP
  private maintenanceInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor() {
    // Use the singleton instance
  }

  /**
   * Start scheduled maintenance
   */
  startScheduledMaintenance(
    _options: {
      intervalHours?: number;
      cleanupFailedOlderThanHours?: number;
      syncWithRunPod?: boolean;
    } = {},
  ): void {
    if (this.maintenanceInterval) {
      logger.warn("Maintenance service is already running");
      return;
    }

    const { intervalHours = 6 } = (_options || {}) as {
      intervalHours?: number;
    };
    logger.info(
      `🔧 Starting scheduled maintenance (every ${intervalHours} hours)`,
    );

    // Run initial maintenance
    this.performMaintenance({});

    // Schedule recurring maintenance
    this.maintenanceInterval = setInterval(
      () => {
        this.performMaintenance({});
      },
      intervalHours * 60 * 60 * 1000,
    );

    logger.info("✅ Scheduled maintenance started");
  }

  /**
   * Stop scheduled maintenance
   */
  stopScheduledMaintenance(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = undefined;
      logger.info("🛑 Scheduled maintenance stopped");
    }
  }

  /**
   * Perform maintenance operations
   */
  private async performMaintenance(_options: {
    cleanupFailedOlderThanHours?: number;
    syncWithRunPod?: boolean;
  }): Promise<void> {
    if (this.isRunning) {
      logger.warn("Maintenance already running, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info("🔧 Starting maintenance operations...");

      // No-op for now; placeholder for future provider maintenance
      const duration = Date.now() - startTime;
      logger.info(`✅ Maintenance placeholder completed in ${duration}ms`);
    } catch (error) {
      logger.error("❌ Maintenance failed:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get maintenance status
   */
  getStatus(): {
    isRunning: boolean;
    hasScheduledMaintenance: boolean;
    lastRun?: Date;
  } {
    return {
      isRunning: this.isRunning,
      hasScheduledMaintenance: !!this.maintenanceInterval,
    };
  }
}
