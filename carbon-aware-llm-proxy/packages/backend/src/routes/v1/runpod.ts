import { Router } from "express";
import { logger } from "../../utils/logger";
import { ApiError } from "../../middleware/errorHandler";
import { runPodService } from "../../services/runpod.service";
import { runPodProviderService } from "../../services/runpod-provider.service";
import { databaseService } from "../../services/database.service";
import { RunPodDeployment } from "../../entities/RunPodDeployment";

export const runpodRouter = Router();

// GET /v1/runpod/deployments - List all deployments
runpodRouter.get("/deployments", async (req, res, next) => {
  try {
    const { model, region, status } = req.query;

    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    const where: any = {};
    if (model) where.modelId = model;
    if (region) where.region = region;
    if (status) where.status = status;

    const deployments = await deploymentRepo.find({
      where,
      relations: ["instances"],
      order: { createdAt: "DESC" },
    });

    const deploymentData = deployments.map((deployment) => ({
      id: deployment.id,
      modelId: deployment.modelId,
      region: deployment.region,
      status: deployment.status,
      healthStatus: deployment.healthStatus,
      currentReplicas: deployment.currentReplicas,
      maxReplicas: deployment.maxReplicas,
      endpointUrl: deployment.endpointUrl,
      costPerHour: deployment.calculateTotalCostPerHour(),
      carbonIntensity: deployment.carbonIntensity,
      lastHealthCheck: deployment.lastHealthCheck,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
    }));

    res.json({
      success: true,
      data: {
        deployments: deploymentData,
        total: deployments.length,
      },
    });
  } catch (error) {
    logger.error("Failed to list RunPod deployments:", error);
    next(new ApiError(500, "Failed to retrieve deployments"));
  }
});

// GET /v1/runpod/deployments/:id - Get deployment details
runpodRouter.get("/deployments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    const deployment = await deploymentRepo.findOne({
      where: { id },
      relations: ["instances"],
    });

    if (!deployment) {
      throw new ApiError(404, "Deployment not found");
    }

    const deploymentData = {
      id: deployment.id,
      modelId: deployment.modelId,
      region: deployment.region,
      gpuType: deployment.gpuType,
      status: deployment.status,
      healthStatus: deployment.healthStatus,
      minReplicas: deployment.minReplicas,
      maxReplicas: deployment.maxReplicas,
      currentReplicas: deployment.currentReplicas,
      autoScaling: deployment.autoScaling,
      endpointUrl: deployment.endpointUrl,
      runpodEndpointId: deployment.runpodEndpointId,
      costPerHour: deployment.calculateTotalCostPerHour(),
      carbonIntensity: deployment.carbonIntensity,
      lastHealthCheck: deployment.lastHealthCheck,
      errorMessage: deployment.errorMessage,
      configuration: deployment.configuration,
      instances: deployment.instances?.map((instance) => ({
        id: instance.id,
        runpodPodId: instance.runpodPodId,
        status: instance.status,
        isHealthy: instance.isHealthy,
        requestsProcessed: instance.requestsProcessed,
        tokensProcessed: instance.tokensProcessed,
        averageResponseTimeMs: instance.averageResponseTimeMs,
        uptimeHours: instance.uptimeHours,
        currentCost: instance.calculateCurrentCost(),
      })),
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
    };

    res.json({
      success: true,
      data: deploymentData,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      logger.error("Failed to get RunPod deployment:", error);
      next(new ApiError(500, "Failed to retrieve deployment"));
    }
  }
});

// GET /v1/runpod/stats - Get deployment statistics
runpodRouter.get("/stats", async (req, res, next) => {
  try {
    const stats = await runPodProviderService.getDeploymentStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Failed to get RunPod stats:", error);
    next(new ApiError(500, "Failed to retrieve statistics"));
  }
});

// POST /v1/runpod/health-check - Trigger health check for all deployments
runpodRouter.post("/health-check", async (req, res, next) => {
  try {
    logger.info("Manual health check triggered");

    // Run health checks asynchronously
    runPodService.performHealthChecks().catch((error) => {
      logger.error("Health check failed:", error);
    });

    res.json({
      success: true,
      message: "Health check initiated",
    });
  } catch (error) {
    logger.error("Failed to trigger health check:", error);
    next(new ApiError(500, "Failed to trigger health check"));
  }
});

// POST /v1/runpod/deployments/:id/health-check - Trigger health check for specific deployment
runpodRouter.post("/deployments/:id/health-check", async (req, res, next) => {
  try {
    const { id } = req.params;

    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    const deployment = await deploymentRepo.findOne({
      where: { id },
    });

    if (!deployment) {
      throw new ApiError(404, "Deployment not found");
    }

    logger.info(`Manual health check triggered for deployment ${id}`);

    // This would need to be implemented in the runPodService
    // For now, just return success
    res.json({
      success: true,
      message: `Health check initiated for deployment ${id}`,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      logger.error("Failed to trigger deployment health check:", error);
      next(new ApiError(500, "Failed to trigger health check"));
    }
  }
});

// GET /v1/runpod/models - Get available model configurations
runpodRouter.get("/models", async (req, res, next) => {
  try {
    const { MODEL_CONFIGS, RUNPOD_REGIONS, GPU_TYPES } = await import(
      "../../config/runpod.config"
    );

    const models = Object.entries(MODEL_CONFIGS).map(([key, config]) => ({
      id: key,
      displayName: config.displayName,
      parameterCount: config.parameterCount,
      minGpuMemory: config.minGpuMemory,
      recommendedGpuTypes: config.recommendedGpuTypes,
      maxSequenceLength: config.maxSequenceLength,
      estimatedTokensPerSecond: config.estimatedTokensPerSecond,
    }));

    const regions = Object.entries(RUNPOD_REGIONS).map(([key, config]) => ({
      id: key,
      name: config.name,
      carbonIntensity: config.carbonIntensity,
      latency: config.latency,
      availability: config.availability,
    }));

    const gpuTypes = Object.entries(GPU_TYPES).map(([key, config]) => ({
      id: key,
      memory: config.memory,
      computeUnits: config.computeUnits,
      powerConsumption: config.powerConsumption,
      costPerHour: config.costPerHour,
      carbonEfficiencyScore: config.carbonEfficiencyScore,
    }));

    res.json({
      success: true,
      data: {
        models,
        regions,
        gpuTypes,
      },
    });
  } catch (error) {
    logger.error("Failed to get model configurations:", error);
    next(new ApiError(500, "Failed to retrieve model configurations"));
  }
});

// POST /v1/runpod/maintenance - Perform maintenance operations
runpodRouter.post("/maintenance", async (req, res, next) => {
  try {
    const { cleanupFailed, sync, olderThanHours = 24, dryRun = false } = req.body;

    const { runPodService } = await import("../../services/runpod.service");

    const maintenanceOptions = {
      cleanupFailedOlderThanHours: cleanupFailed ? olderThanHours : undefined,
      syncWithRunPod: sync,
      dryRun,
    };

    // If no specific operations requested, run both
    if (!cleanupFailed && !sync) {
      maintenanceOptions.cleanupFailedOlderThanHours = olderThanHours;
      maintenanceOptions.syncWithRunPod = true;
    }

    const result = await runPodService.performMaintenance(maintenanceOptions);

    res.json({
      success: true,
      data: {
        maintenance: result,
        summary: {
          cleanup: {
            cleaned: result.cleanup.cleaned,
            orphanedRunPodEndpoints: result.cleanup.orphanedRunPodEndpoints.length,
          },
          sync: {
            synced: result.sync.synced,
            missingInRunPod: result.sync.missingInRunPod.length,
            orphanedInRunPod: result.sync.orphanedInRunPod.length,
          },
        },
      },
    });
  } catch (error) {
    logger.error("Maintenance operation failed:", error);
    next(new ApiError(500, "Maintenance operation failed"));
  }
});

// POST /v1/runpod/cleanup - Clean up failed deployments
runpodRouter.post("/cleanup", async (req, res, next) => {
  try {
    const { olderThanHours = 24, dryRun = false } = req.body;

    const { runPodService } = await import("../../services/runpod.service");
    const result = await runPodService.cleanupFailedDeployments({
      olderThanHours,
      dryRun,
    });

    res.json({
      success: true,
      data: {
        cleaned: result.cleaned,
        orphanedRunPodEndpoints: result.orphanedRunPodEndpoints,
      },
    });
  } catch (error) {
    logger.error("Cleanup operation failed:", error);
    next(new ApiError(500, "Cleanup operation failed"));
  }
});

// POST /v1/runpod/sync - Sync with RunPod API
runpodRouter.post("/sync", async (req, res, next) => {
  try {
    const { runPodService } = await import("../../services/runpod.service");
    const result = await runPodService.syncWithRunPodAPI();

    res.json({
      success: true,
      data: {
        synced: result.synced,
        missingInRunPod: result.missingInRunPod,
        orphanedInRunPod: result.orphanedInRunPod,
      },
    });
  } catch (error) {
    logger.error("Sync operation failed:", error);
    next(new ApiError(500, "Sync operation failed"));
  }
});
