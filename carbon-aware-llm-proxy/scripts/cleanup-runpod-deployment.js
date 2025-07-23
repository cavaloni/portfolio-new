// Simple script to clean up RunPod deployment from the database
const { databaseService } = require('../packages/backend/src/services/database.service');
const { RunPodDeployment } = require('../packages/backend/src/entities/RunPodDeployment');
const { logger } = require('../packages/backend/src/utils/logger');

async function cleanupRunPodDeployment(modelId, region) {
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
      console.error(`❌ No deployment found for model ${modelId} in region ${region}`);
      return false;
    }

    console.log(`Found deployment ${deployment.id} (Status: ${deployment.status})`);
    
    // Delete the deployment
    const result = await deploymentRepo.delete(deployment.id);
    const success = (result.affected || 0) > 0;

    if (success) {
      console.log(`✅ Successfully deleted deployment ${deployment.id} from database`);
      
      if (deployment.runpodEndpointId) {
        console.log(`⚠️  Note: The RunPod endpoint (ID: ${deployment.runpodEndpointId}) was not deleted from RunPod.`);
        console.log('You may want to delete it manually from the RunPod console.');
      }
    } else {
      console.error(`❌ Failed to delete deployment ${deployment.id}`);
    }

    return success;
  } catch (error) {
    console.error('Error cleaning up deployment:', error);
    return false;
  } finally {
    // Close the database connection
    if (databaseService.getDataSource().isInitialized) {
      await databaseService.getDataSource().destroy();
    }
  }
}

// Run with the model and region from the make command
const MODEL_ID = 'llama-3-8b-instruct';
const REGION = 'US-OR-1';

console.log(`Starting cleanup for ${MODEL_ID} in ${REGION}...`);
cleanupRunPodDeployment(MODEL_ID, REGION)
  .then(success => {
    console.log(`Cleanup ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error during cleanup:', error);
    process.exit(1);
  });
