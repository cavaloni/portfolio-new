import { logger } from "../utils/logger";
import { runPodService } from "./runpod.service";

export class MaintenanceService {
  private runPodService = runPodService;
  private maintenanceInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor() {
    // Use the singleton instance
  }

  /**
   * Start scheduled maintenance
   */
  startScheduledMaintenance(options: {
    intervalHours?: number;
    cleanupFailedOlderThanHours?: number;
    syncWithRunPod?: boolean;
  } = {}): void {
    const {
      intervalHours = 6, // Run every 6 hours by default
      cleanupFailedOlderThanHours = 24,
      syncWithRunPod = true,
    } = options;

    if (this.maintenanceInterval) {
      logger.warn("Maintenance service is already running");
      return;
    }

    logger.info(`🔧 Starting scheduled maintenance (every ${intervalHours} hours)`);

    // Run initial maintenance
    this.performMaintenance({
      cleanupFailedOlderThanHours,
      syncWithRunPod,
    });

    // Schedule recurring maintenance
    this.maintenanceInterval = setInterval(() => {
      this.performMaintenance({
        cleanupFailedOlderThanHours,
        syncWithRunPod,
      });
    }, intervalHours * 60 * 60 * 1000);

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
  private async performMaintenance(options: {
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

      const result = await this.runPodService.performMaintenance(options);

      const duration = Date.now() - startTime;
      logger.info(`✅ Maintenance completed in ${duration}ms`);

      // Log summary
      if (result.cleanup.cleaned > 0) {
        logger.info(`🧹 Cleaned up ${result.cleanup.cleaned} failed deployments`);
      }

      if (result.sync.synced > 0) {
        logger.info(`🔄 Synced ${result.sync.synced} deployments with RunPod`);
      }

      if (result.sync.missingInRunPod.length > 0) {
        logger.warn(`⚠️  Found ${result.sync.missingInRunPod.length} deployments missing in RunPod`);
      }

      if (result.sync.orphanedInRunPod.length > 0) {
        logger.warn(`⚠️  Found ${result.sync.orphanedInRunPod.length} orphaned RunPod endpoints`);
      }

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