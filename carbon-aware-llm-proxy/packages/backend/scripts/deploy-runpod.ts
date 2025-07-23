#!/usr/bin/env ts-node

import "dotenv/config";
import "reflect-metadata";
import { Command } from "commander";
import { databaseService } from "../src/services/database.service";
import { runPodService } from "../src/services/runpod.service";
import {
  MODEL_CONFIGS,
  RUNPOD_REGIONS,
  GPU_TYPES,
  ModelConfig,
  RunPodRegion,
  GpuType,
} from "../src/config/runpod.config";
import { logger } from "../src/utils/logger";

const program = new Command();

program
  .name("deploy-runpod")
  .description("Deploy VLLM models to RunPod")
  .version("1.0.0");

// Deploy command
program
  .command("deploy")
  .description("Deploy a model to RunPod")
  .requiredOption(
    "-m, --model <model>",
    "Model to deploy (e.g., llama-3-8b-instruct)",
  )
  .option(
    "-r, --regions <regions>",
    "Comma-separated list of regions",
    "US-OR-1",
  )
  .option("-g, --gpu <gpu>", "GPU type", "NVIDIA GeForce RTX 4090")
  .option("--min-replicas <number>", "Minimum number of replicas", "1")
  .option("--max-replicas <number>", "Maximum number of replicas", "3")
  .option("--no-auto-scaling", "Disable auto-scaling")
  .option("--dry-run", "Show what would be deployed without actually deploying")
  .action(async (options) => {
    try {
      await databaseService.initialize();

      const modelId = options.model as ModelConfig;
      const regions = options.regions
        .split(",")
        .map((r: string) => r.trim()) as RunPodRegion[];
      const gpuType = options.gpu as GpuType;
      const minReplicas = parseInt(options.minReplicas);
      const maxReplicas = parseInt(options.maxReplicas);
      const autoScaling = options.autoScaling !== false;

      // Validate inputs
      if (!MODEL_CONFIGS[modelId]) {
        logger.error(`Invalid model: ${modelId}`);
        logger.info(
          `Available models: ${Object.keys(MODEL_CONFIGS).join(", ")}`,
        );
        process.exit(1);
      }

      for (const region of regions) {
        if (!RUNPOD_REGIONS[region]) {
          logger.error(`Invalid region: ${region}`);
          logger.info(
            `Available regions: ${Object.keys(RUNPOD_REGIONS).join(", ")}`,
          );
          process.exit(1);
        }
      }

      if (!GPU_TYPES[gpuType]) {
        logger.error(`Invalid GPU type: ${gpuType}`);
        logger.info(
          `Available GPU types: ${Object.keys(GPU_TYPES).join(", ")}`,
        );
        process.exit(1);
      }

      const modelConfig = MODEL_CONFIGS[modelId];
      const gpuConfig = GPU_TYPES[gpuType];

      // Check if GPU has enough memory for the model
      if (gpuConfig.memory < modelConfig.minGpuMemory) {
        logger.error(
          `GPU ${gpuType} has ${gpuConfig.memory}GB memory, but model ${modelId} requires ${modelConfig.minGpuMemory}GB`,
        );
        process.exit(1);
      }

      logger.info("🚀 RunPod Deployment Configuration:");
      logger.info(`  Model: ${modelConfig.displayName} (${modelId})`);
      logger.info(`  Regions: ${regions.join(", ")}`);
      logger.info(`  GPU Type: ${gpuType}`);
      logger.info(
        `  Replicas: ${minReplicas}-${maxReplicas} (auto-scaling: ${autoScaling})`,
      );
      logger.info(
        `  Estimated cost per hour: $${(gpuConfig.costPerHour * maxReplicas * regions.length).toFixed(2)}`,
      );

      if (options.dryRun) {
        logger.info("🧪 Dry run completed. No actual deployment performed.");
        process.exit(0);
      }

      // Perform deployment
      logger.info("\n🚀 Starting RunPod deployment...");
      const deployments = await runPodService.deployModel(modelId, regions, {
        gpuType,
        minReplicas,
        maxReplicas,
        autoScaling,
      });

      logger.info(`\n✅ Successfully initiated ${deployments.length} deployments`);
      for (const deployment of deployments) {
        logger.info(
          `  📍 ${deployment.region}: ${deployment.id.substring(0, 8)}... (${deployment.status})`,
        );
      }
      
      logger.info("\n💡 Tip: Use 'make runpod-api-status' to check endpoint status directly from RunPod");
      logger.info("💡 Tip: Use 'make runpod-update-urls' to fetch endpoint URLs for deployments that don't have them");
    } catch (error) {
      logger.error("Deployment failed:", error);
      process.exit(1);
    } finally {
      await databaseService.close();
    }
  });

// List command
program
  .command("list")
  .description("List all deployments")
  .option("-m, --model <model>", "Filter by model")
  .option("-r, --region <region>", "Filter by region")
  .option("--status <status>", "Filter by status")
  .action(async (options) => {
    try {
      await databaseService.initialize();

      const deploymentRepo = databaseService
        .getDataSource()
        .getRepository(
          (await import("../src/entities/RunPodDeployment")).RunPodDeployment,
        );

      const where: any = {};
      if (options.model) where.modelId = options.model;
      if (options.region) where.region = options.region;
      if (options.status) where.status = options.status;

      const deployments = await deploymentRepo.find({
        where,
        relations: ["instances"],
        order: { createdAt: "DESC" },
      });

      if (deployments.length === 0) {
        logger.info("No deployments found");
        return;
      }

      logger.info(`Found ${deployments.length} deployments:`);
      console.table(
        deployments.map((d) => ({
          ID: d.id.substring(0, 8),
          Model: d.modelId,
          Region: d.region,
          Status: d.status,
          Replicas: `${d.currentReplicas}/${d.maxReplicas}`,
          Health: d.healthStatus,
          "Cost/hr": d.calculateTotalCostPerHour().toFixed(2),
          Created: d.createdAt.toISOString().split("T")[0],
        })),
      );
    } catch (error) {
      logger.error("Failed to list deployments:", error);
      process.exit(1);
    } finally {
      await databaseService.close();
    }
  });

// Status command
program
  .command("status <deploymentId>")
  .description("Get detailed status of a deployment")
  .action(async (deploymentId) => {
    try {
      await databaseService.initialize();

      const deploymentRepo = databaseService
        .getDataSource()
        .getRepository(
          (await import("../src/entities/RunPodDeployment")).RunPodDeployment,
        );

      const deployment = await deploymentRepo.findOne({
        where: { id: deploymentId },
        relations: ["instances"],
      });

      if (!deployment) {
        logger.error(`Deployment ${deploymentId} not found`);
        process.exit(1);
      }

      logger.info(`Deployment Status: ${deployment.id}`);
      logger.info(`  Model: ${deployment.modelId}`);
      logger.info(`  Region: ${deployment.region}`);
      logger.info(`  Status: ${deployment.status}`);
      logger.info(`  Health: ${deployment.healthStatus}`);
      logger.info(`  GPU Type: ${deployment.gpuType}`);
      logger.info(
        `  Replicas: ${deployment.currentReplicas}/${deployment.maxReplicas} (min: ${deployment.minReplicas})`,
      );
      logger.info(`  Auto Scaling: ${deployment.autoScaling}`);
      logger.info(
        `  Endpoint URL: ${deployment.endpointUrl || "Not available"}`,
      );
      logger.info(
        `  Cost per hour: $${deployment.calculateTotalCostPerHour().toFixed(2)}`,
      );
      logger.info(
        `  Carbon intensity: ${deployment.carbonIntensity} kg CO2e/kWh`,
      );
      logger.info(
        `  Last health check: ${deployment.lastHealthCheck?.toISOString() || "Never"}`,
      );
      logger.info(`  Created: ${deployment.createdAt.toISOString()}`);
      logger.info(`  Updated: ${deployment.updatedAt.toISOString()}`);

      if (deployment.errorMessage) {
        logger.info(`  Error: ${deployment.errorMessage}`);
      }

      if (deployment.instances && deployment.instances.length > 0) {
        logger.info(`  Instances (${deployment.instances.length}):`);
        for (const instance of deployment.instances) {
          logger.info(
            `    ${instance.id.substring(0, 8)}: ${instance.status} (${instance.runpodPodId})`,
          );
        }
      }
    } catch (error) {
      logger.error("Failed to get deployment status:", error);
      process.exit(1);
    } finally {
      await databaseService.close();
    }
  });

// Stop command
program
  .command("stop <deploymentId>")
  .description("Stop a deployment")
  .action(async (deploymentId) => {
    try {
      await databaseService.initialize();

      // TODO: Implement stop functionality in runPodService
      logger.info(`Stopping deployment ${deploymentId}...`);
      logger.warn("Stop functionality not yet implemented");
    } catch (error) {
      logger.error("Failed to stop deployment:", error);
      process.exit(1);
    } finally {
      await databaseService.close();
    }
  });

// Health check command
program
  .command("health-check")
  .description("Perform health checks on all RunPod deployments")
  .action(async () => {
    try {
      await databaseService.initialize();
      await runPodService.performHealthChecks();
    } catch (error) {
      logger.error("Health check failed:", error);
      process.exit(1);
    } finally {
      await databaseService.close();
    }
  });

// RunPod API status command  
program
  .command("runpod-status")
  .description("Check RunPod endpoints directly from API")
  .option("-e, --endpoint-id <id>", "Check specific endpoint ID")
  .action(async (options) => {
    let initialized = false;
    try {
      // Log database connection attempt
      logger.info("🔌 Attempting to connect to database...");
      logger.info(`   Host: ${process.env.DB_HOST || "localhost"}`);
      logger.info(`   Port: ${process.env.DB_PORT || "5432"}`);
      logger.info(`   Database: ${process.env.DB_NAME || "carbon_aware_llm"}`);
      logger.info(`   Username: ${process.env.DB_USERNAME || "postgres"}`);
      
      await databaseService.initialize();
      initialized = true;
      logger.info("✅ Database connection established successfully");
      
      if (options.endpointId) {
        logger.info(`🔍 Checking RunPod endpoint: ${options.endpointId}`);
        await runPodService.checkEndpointStatus(options.endpointId);
        logger.info("✅ Endpoint status check completed");
      } else {
        logger.info("🔍 Checking all RunPod endpoints...");
        const endpoints = await runPodService.listRunPodEndpoints({ syncWithDatabase: true });
        logger.info(`✅ RunPod status check completed - found ${endpoints.length} endpoints`);
        if (endpoints.length === 0) {
          logger.info("💡 No deployments found. Deploy a model first using: make runpod-deploy MODEL=llama-3-8b-instruct REGIONS=US-OR-1");
        }
      }
      
      // Success - exit cleanly
      if (initialized) {
        await databaseService.close();
      }
      process.exit(0);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this is a database connection error
      if (!initialized) {
        logger.error(`❌ Database initialization failed: ${errorMessage}`);
        logger.error("🔧 Database troubleshooting:");
        logger.error("   1. Ensure the database service is running: docker compose ps");
        logger.error("   2. Check database health: docker compose exec postgres pg_isready -U postgres");
        logger.error("   3. Verify database connectivity: docker compose exec backend nc -zv postgres 5432");
        logger.error("   4. Check environment variables are set correctly");
        
        // Still try to run the command without database sync
        logger.info("\n⚠️ Attempting to run command without database sync...");
        try {
          if (options.endpointId) {
            logger.info(`🔍 Checking RunPod endpoint: ${options.endpointId}`);
            await runPodService.checkEndpointStatus(options.endpointId);
            logger.info("✅ Endpoint status check completed (without database sync)");
          } else {
            logger.info("🔍 Checking all RunPod endpoints...");
            const endpoints = await runPodService.listRunPodEndpoints({ syncWithDatabase: false });
            logger.info(`✅ RunPod status check completed - found ${endpoints.length} endpoints (without database sync)`);
            if (endpoints.length === 0) {
              logger.info("💡 No deployments found. Deploy a model first using: make runpod-deploy MODEL=llama-3-8b-instruct REGIONS=US-OR-1");
            }
          }
          process.exit(0);
        } catch (fallbackError) {
          const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          logger.error(`❌ Command failed even without database sync: ${fallbackErrorMessage}`);
        }
      } else {
        logger.error(`❌ RunPod status check failed: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          logger.error("Stack trace:", error.stack);
        }
      }
      
      if (initialized) {
        try {
          await databaseService.close();
        } catch (closeError) {
          logger.error("Failed to close database:", closeError);
        }
      }
      process.exit(1);
    }
  });

// Update endpoint URLs command
program
  .command("update-urls")
  .description("Update endpoint URLs for deployments that don't have them")
  .action(async () => {
    try {
      await databaseService.initialize();
      await runPodService.updateEndpointUrls();
    } catch (error) {
      logger.error("Failed to update endpoint URLs:", error);
      process.exit(1);
    } finally {
      await databaseService.close();
    }
  });

// Info command
program
  .command("info")
  .description("Show available models, regions, and GPU types")
  .action(() => {
    logger.info("Available Models:");
    Object.entries(MODEL_CONFIGS).forEach(([key, config]) => {
      logger.info(`  ${key}: ${config.displayName} (${config.parameterCount})`);
      logger.info(`    Min GPU Memory: ${config.minGpuMemory}GB`);
      logger.info(
        `    Recommended GPUs: ${config.recommendedGpuTypes.join(", ")}`,
      );
    });

    logger.info("\nAvailable Regions:");
    Object.entries(RUNPOD_REGIONS).forEach(([key, config]) => {
      logger.info(`  ${key}: ${config.name}`);
      logger.info(
        `    Carbon Intensity: ${config.carbonIntensity} kg CO2e/kWh`,
      );
      logger.info(`    Latency: ~${config.latency}ms`);
    });

    logger.info("\nAvailable GPU Types:");
    Object.entries(GPU_TYPES).forEach(([key, config]) => {
      logger.info(`  ${key}:`);
      logger.info(`    Memory: ${config.memory}GB`);
      logger.info(`    Power: ${config.powerConsumption}W`);
      logger.info(`    Cost: $${config.costPerHour}/hour`);
      logger.info(`    Carbon Efficiency: ${config.carbonEfficiencyScore}/1.0`);
    });
  });

// Maintenance command
program
  .command("maintenance")
  .description("Perform maintenance operations on deployments")
  .option("--cleanup-failed", "Clean up failed deployments older than 24 hours")
  .option("--sync", "Sync deployment status with RunPod API")
  .option("--older-than <hours>", "Age threshold for failed deployments (default: 24)", "24")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (options) => {
    try {
      await databaseService.initialize();
      const runPodService = new (await import("../src/services/runpod.service")).RunPodService();

      const maintenanceOptions = {
        cleanupFailedOlderThanHours: options.cleanupFailed ? parseInt(options.olderThan) : undefined,
        syncWithRunPod: options.sync,
        dryRun: options.dryRun,
      };

      // If no specific operations requested, run both
      if (!options.cleanupFailed && !options.sync) {
        maintenanceOptions.cleanupFailedOlderThanHours = parseInt(options.olderThan);
        maintenanceOptions.syncWithRunPod = true;
      }

      const result = await runPodService.performMaintenance(maintenanceOptions);

      logger.info("\n📋 Maintenance Summary:");
      
      if (maintenanceOptions.cleanupFailedOlderThanHours) {
        logger.info(`🧹 Cleanup: ${result.cleanup.cleaned} deployments removed`);
        if (result.cleanup.orphanedRunPodEndpoints.length > 0) {
          logger.warn(`  ⚠️  ${result.cleanup.orphanedRunPodEndpoints.length} RunPod endpoints may need manual cleanup`);
        }
      }
      
      if (maintenanceOptions.syncWithRunPod) {
        logger.info(`🔄 Sync: ${result.sync.synced} deployments updated`);
        if (result.sync.missingInRunPod.length > 0) {
          logger.warn(`  ⚠️  ${result.sync.missingInRunPod.length} endpoints missing in RunPod`);
        }
        if (result.sync.orphanedInRunPod.length > 0) {
          logger.warn(`  ⚠️  ${result.sync.orphanedInRunPod.length} orphaned endpoints in RunPod`);
        }
      }

    } catch (error) {
      logger.error("Maintenance failed:", error);
      process.exit(1);
    } finally {
      await databaseService.close();
    }
  });

// Cleanup command
program
  .command("cleanup")
  .description("Clean up failed deployments")
  .option("--older-than <hours>", "Age threshold for failed deployments (default: 24)", "24")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (options) => {
    try {
      await databaseService.initialize();
      const runPodService = new (await import("../src/services/runpod.service")).RunPodService();

      const result = await runPodService.cleanupFailedDeployments({
        olderThanHours: parseInt(options.olderThan),
        dryRun: options.dryRun,
      });

      logger.info(`\n🧹 Cleanup completed: ${result.cleaned} deployments removed`);
      
      if (result.orphanedRunPodEndpoints.length > 0) {
        logger.warn(`⚠️  ${result.orphanedRunPodEndpoints.length} RunPod endpoints may need manual cleanup:`);
        result.orphanedRunPodEndpoints.forEach(id => logger.warn(`  - ${id}`));
      }

    } catch (error) {
      logger.error("Cleanup failed:", error);
      process.exit(1);
    } finally {
      await databaseService.close();
    }
  });

// Sync command
program
  .command("sync")
  .description("Sync deployment status with RunPod API")
  .action(async () => {
    try {
      await databaseService.initialize();
      const runPodService = new (await import("../src/services/runpod.service")).RunPodService();

      const result = await runPodService.syncWithRunPodAPI();

      logger.info(`\n🔄 Sync completed:`);
      logger.info(`  ✅ Synced: ${result.synced} deployments`);
      logger.info(`  ⚠️  Missing in RunPod: ${result.missingInRunPod.length} endpoints`);
      logger.info(`  ⚠️  Orphaned in RunPod: ${result.orphanedInRunPod.length} endpoints`);

      if (result.missingInRunPod.length > 0) {
        logger.warn("\nMissing RunPod endpoints:");
        result.missingInRunPod.forEach(id => logger.warn(`  - ${id}`));
      }

      if (result.orphanedInRunPod.length > 0) {
        logger.warn("\nOrphaned RunPod endpoints:");
        result.orphanedInRunPod.forEach(id => logger.warn(`  - ${id}`));
      }

    } catch (error) {
      logger.error("Sync failed:", error);
      process.exit(1);
    } finally {
      await databaseService.close();
    }
  });

// Parse command line arguments
program.parse();
