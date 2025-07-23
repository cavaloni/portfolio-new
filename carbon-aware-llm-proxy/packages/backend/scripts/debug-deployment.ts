#!/usr/bin/env ts-node

import "dotenv/config";
import { databaseService } from "../src/services/database.service";
import { RunPodDeployment } from "../src/entities/RunPodDeployment";
import { logger } from "../src/utils/logger";

async function debugDeployment() {
  try {
    await databaseService.initialize();

    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    const deployments = await deploymentRepo.find({
      relations: ["instances"],
    });

    logger.info(`Found ${deployments.length} deployments:`);
    
    deployments.forEach((deployment, index) => {
      logger.info(`\n=== Deployment ${index + 1} ===`);
      logger.info(`Full ID: ${deployment.id}`);
      logger.info(`Model: ${deployment.modelId}`);
      logger.info(`Region: ${deployment.region}`);
      logger.info(`Status: ${deployment.status}`);
      logger.info(`Health Status: ${deployment.healthStatus}`);
      logger.info(`Endpoint URL: ${deployment.endpointUrl || 'Not set'}`);
      logger.info(`RunPod Endpoint ID: ${deployment.runpodEndpointId || 'Not set'}`);
      logger.info(`Error Message: ${deployment.errorMessage || 'None'}`);
      logger.info(`Created: ${deployment.createdAt}`);
      logger.info(`Updated: ${deployment.updatedAt}`);
      logger.info(`Instances: ${deployment.instances?.length || 0}`);
    });

  } catch (error) {
    logger.error("Failed to debug deployment:", error);
  } finally {
    await databaseService.close();
  }
}

debugDeployment().catch(console.error); 