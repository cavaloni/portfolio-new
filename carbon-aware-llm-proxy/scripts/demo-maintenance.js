#!/usr/bin/env node

/**
 * Demo script for RunPod maintenance features
 * This script demonstrates the automatic cleanup and sync functionality
 */

const { databaseService } = require('../packages/backend/src/services/database.service');
const { runPodService } = require('../packages/backend/src/services/runpod.service');
const { logger } = require('../packages/backend/src/utils/logger');

async function demoMaintenance() {
  try {
    console.log('🔧 RunPod Maintenance Demo');
    console.log('==========================\n');

    // Initialize database
    await databaseService.initialize();
    console.log('✅ Database connected');

    // Demo 1: Check current deployments
    console.log('\n📋 Current Deployments:');
    const deployments = await runPodService.getActiveDeployments();
    console.log(`Found ${deployments.length} active deployments`);
    
    deployments.forEach(deployment => {
      console.log(`  - ${deployment.modelId} in ${deployment.region} (${deployment.status})`);
    });

    // Demo 2: Perform maintenance (dry run)
    console.log('\n🧹 Maintenance Demo (Dry Run):');
    const maintenanceResult = await runPodService.performMaintenance({
      cleanupFailedOlderThanHours: 24,
      syncWithRunPod: true,
      dryRun: true,
    });

    console.log(`Cleanup: ${maintenanceResult.cleanup.cleaned} deployments would be removed`);
    console.log(`Sync: ${maintenanceResult.sync.synced} deployments would be updated`);
    
    if (maintenanceResult.sync.missingInRunPod.length > 0) {
      console.log(`⚠️  ${maintenanceResult.sync.missingInRunPod.length} endpoints missing in RunPod`);
    }
    
    if (maintenanceResult.sync.orphanedInRunPod.length > 0) {
      console.log(`⚠️  ${maintenanceResult.sync.orphanedInRunPod.length} orphaned endpoints in RunPod`);
    }

    // Demo 3: Show cleanup options
    console.log('\n🧹 Cleanup Options:');
    console.log('  npm run runpod cleanup --dry-run');
    console.log('  npm run runpod cleanup --older-than 48');
    console.log('  npm run runpod cleanup');

    // Demo 4: Show sync options
    console.log('\n🔄 Sync Options:');
    console.log('  npm run runpod sync');
    console.log('  npm run runpod maintenance --sync');

    // Demo 5: Show maintenance options
    console.log('\n🔧 Maintenance Options:');
    console.log('  npm run runpod maintenance --dry-run');
    console.log('  npm run runpod maintenance --cleanup-failed');
    console.log('  npm run runpod maintenance --sync');
    console.log('  npm run runpod maintenance');

    console.log('\n✅ Demo completed successfully!');
    console.log('\n💡 Tips:');
    console.log('  - Use --dry-run to see what would happen');
    console.log('  - Run maintenance regularly to keep things clean');
    console.log('  - Check for orphaned RunPod endpoints manually');
    console.log('  - Monitor logs for maintenance activities');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  } finally {
    await databaseService.close();
  }
}

// Run the demo
if (require.main === module) {
  demoMaintenance();
}

module.exports = { demoMaintenance }; 