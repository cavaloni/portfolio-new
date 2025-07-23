// Script to remove a RunPod deployment from the database
const { databaseService } = require('../packages/backend/src/services/database.service');
const { RunPodDeployment } = require('../packages/backend/src/entities/RunPodDeployment');

async function removeDeployment(deploymentId) {
  try {
    // Initialize database connection
    await databaseService.initialize();
    
    const deploymentRepo = databaseService
      .getDataSource()
      .getRepository(RunPodDeployment);

    // Find the deployment
    const deployment = await deploymentRepo.findOne({
      where: { id: deploymentId }
    });

    if (!deployment) {
      console.error(`❌ No deployment found with ID: ${deploymentId}`);
      return false;
    }

    console.log(`Found deployment ${deploymentId} (Model: ${deployment.modelId}, Region: ${deployment.region})`);
    
    // Delete the deployment
    const result = await deploymentRepo.delete(deploymentId);
    const success = (result.affected || 0) > 0;

    if (success) {
      console.log(`✅ Successfully deleted deployment ${deploymentId} from database`);
      console.log('\n⚠️  Note: If this deployment has an associated RunPod endpoint, you may need to delete it manually from the RunPod console.');
    } else {
      console.error(`❌ Failed to delete deployment ${deploymentId}`);
    }

    return success;
  } catch (error) {
    console.error('Error removing deployment:', error);
    return false;
  } finally {
    // Close the database connection
    if (databaseService.getDataSource().isInitialized) {
      await databaseService.getDataSource().destroy();
    }
  }
}

// Get deployment ID from command line arguments
const deploymentId = process.argv[2];

if (!deploymentId) {
  console.error('❌ Please provide a deployment ID');
  console.log('Usage: node scripts/remove-runpod-deployment.js <deployment-id>');
  process.exit(1);
}

console.log(`Starting removal of deployment ${deploymentId}...`);
removeDeployment(deploymentId)
  .then(success => {
    console.log(`Removal ${success ? 'completed successfully' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error during removal:', error);
    process.exit(1);
  });
