require('reflect-metadata');
const { databaseService } = require('../packages/backend/src/services/database.service');
const { RunPodDeployment } = require('../packages/backend/src/entities/RunPodDeployment');
const { logger } = require('../packages/backend/src/utils/logger');

async function cleanupRunPodDeployment(modelId: string, region: string) {
  try {
    // Initialize database connection
    await databaseService.initialize();
    
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    // Find the deployment
    const deployment = await deploymentRepo.findOne({
      where: { 
        modelId,
        region 
      },
      order: { createdAt: 'DESC' } // Get the most recent one if there are multiple
    });

    if (!deployment) {
      logger.error(`❌ No deployment found for model ${modelId} in region ${region}`);
      return false;
    }

    logger.info(`Found deployment ${deployment.id} (Status: ${deployment.status})`);
    
    // Delete the deployment
    const result = await deploymentRepo.delete(deployment.id);
    const success = (result.affected ?? 0) > 0;

    if (success) {
      logger.info(`✅ Successfully deleted deployment ${deployment.id} from database`);
      
      if (deployment.runpodEndpointId) {
        logger.warn(`⚠️  Note: The RunPod endpoint (ID: ${deployment.runpodEndpointId}) was not deleted from RunPod.`);
        logger.warn('You may want to delete it manually from the RunPod console.');
      }
    } else {
      logger.error(`❌ Failed to delete deployment ${deployment.id}`);
    }

    return success;
  } catch (error) {
    logger.error('Error cleaning up deployment:', error);
    return false;
  } finally {
    // Close the database connection
    await databaseService.getDataSource().destroy();
  }
}

// Run with the model and region from the make command
const MODEL_ID = 'llama-3-8b-instruct';
const REGION = 'US-OR-1';

logger.info(`Starting cleanup for ${MODEL_ID} in ${REGION}...`);
cleanupRunPodDeployment(MODEL_ID, REGION)
  .then(success => {
    logger.info(`Cleanup ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logger.error('Unhandled error during cleanup:', error);
    process.exit(1);
  });
