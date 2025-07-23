# RunPod Maintenance Guide

This document describes the maintenance features for managing RunPod deployments, including automatic cleanup and synchronization with the RunPod API.

## Overview

The maintenance system provides:
- **Automatic cleanup** of failed deployments older than a specified time
- **Synchronization** with RunPod API to detect orphaned resources
- **Scheduled maintenance** that runs automatically
- **Manual maintenance** via CLI and API endpoints

## CLI Commands

### Maintenance Command
Perform comprehensive maintenance operations:

```bash
# Run both cleanup and sync
npm run runpod maintenance

# Only cleanup failed deployments
npm run runpod maintenance --cleanup-failed

# Only sync with RunPod API
npm run runpod maintenance --sync

# Custom age threshold (default: 24 hours)
npm run runpod maintenance --older-than 48

# Dry run to see what would be done
npm run runpod maintenance --dry-run
```

### Cleanup Command
Clean up failed deployments:

```bash
# Clean up failed deployments older than 24 hours
npm run runpod cleanup

# Custom age threshold
npm run runpod cleanup --older-than 48

# Dry run
npm run runpod cleanup --dry-run
```

### Sync Command
Synchronize with RunPod API:

```bash
# Sync deployment status with RunPod
npm run runpod sync
```

## API Endpoints

### POST /v1/runpod/maintenance
Perform maintenance operations:

```json
{
  "cleanupFailed": true,
  "sync": true,
  "olderThanHours": 24,
  "dryRun": false
}
```

### POST /v1/runpod/cleanup
Clean up failed deployments:

```json
{
  "olderThanHours": 24,
  "dryRun": false
}
```

### POST /v1/runpod/sync
Sync with RunPod API:

```json
{}
```

## Database vs API-Only Approach

### Current Hybrid Approach
The system uses a **hybrid approach** that combines the benefits of both:

**Database Storage:**
- Fast queries for deployment status
- Historical tracking and analytics
- Works even if RunPod API is temporarily down
- Can track custom metadata and health metrics

**API Synchronization:**
- Periodic sync to detect orphaned resources
- Updates deployment status from RunPod
- Identifies missing or orphaned endpoints

### Why Not API-Only?
While an API-only approach would eliminate cleanup concerns, it has significant drawbacks:

**API-Only Disadvantages:**
- Slower (API calls for every status check)
- Dependent on RunPod API availability
- No historical data
- Rate limiting concerns
- Harder to implement caching
- More complex error handling

**API-Only Advantages:**
- Always up-to-date information
- No cleanup needed
- Single source of truth
- Simpler data model

## Maintenance Strategy

### Automatic Cleanup
- Failed deployments are automatically cleaned up after 24 hours (configurable)
- Orphaned RunPod endpoints are identified but not automatically deleted
- Manual cleanup of RunPod resources may be required

### Synchronization
- Deployment status is synced with RunPod API
- Missing endpoints are marked as failed
- Orphaned endpoints in RunPod are identified
- Endpoint URLs are updated if available

### Scheduled Maintenance
The system can run maintenance automatically:

```typescript
import { MaintenanceService } from './services/maintenance.service';

const maintenanceService = new MaintenanceService();

// Start scheduled maintenance (every 6 hours)
maintenanceService.startScheduledMaintenance({
  intervalHours: 6,
  cleanupFailedOlderThanHours: 24,
  syncWithRunPod: true,
});
```

## Best Practices

### 1. Regular Maintenance
Run maintenance operations regularly:
```bash
# Daily maintenance
npm run runpod maintenance

# Weekly deep cleanup
npm run runpod maintenance --older-than 168 --cleanup-failed
```

### 2. Monitor Orphaned Resources
Check for orphaned RunPod endpoints:
```bash
npm run runpod sync
```

### 3. Use Dry Runs
Test maintenance operations before running them:
```bash
npm run runpod maintenance --dry-run
```

### 4. Manual Cleanup
For orphaned RunPod endpoints, use the RunPod console or API to delete them manually.

## Troubleshooting

### Failed Deployments Not Cleaned Up
- Check if the deployment is older than the cleanup threshold
- Verify the deployment status is `FAILED`
- Run manual cleanup: `npm run runpod cleanup`

### Orphaned RunPod Endpoints
- Use sync to identify orphaned endpoints: `npm run runpod sync`
- Delete orphaned endpoints manually in RunPod console
- Consider implementing automatic deletion (use with caution)

### Sync Issues
- Check RunPod API connectivity
- Verify API key permissions
- Review logs for specific error messages

## Configuration

### Environment Variables
```bash
# Maintenance settings
RUNPOD_MAINTENANCE_INTERVAL_HOURS=6
RUNPOD_CLEANUP_OLDER_THAN_HOURS=24
RUNPOD_ENABLE_SCHEDULED_MAINTENANCE=true
```

### Database Cleanup
The system automatically cleans up:
- Failed deployments older than 24 hours (configurable)
- Orphaned deployment records
- Stale health check data

## Future Enhancements

### Potential Improvements
1. **Automatic RunPod cleanup**: Automatically delete orphaned RunPod endpoints
2. **Smart retry logic**: Retry failed deployments with exponential backoff
3. **Deployment health scoring**: Score deployments based on success rate
4. **Cost optimization**: Automatically stop expensive failed deployments
5. **Notification system**: Alert on maintenance issues

### API-Only Alternative
If you prefer an API-only approach, consider:
1. Implementing a caching layer with TTL
2. Using background jobs for API calls
3. Storing only essential metadata locally
4. Implementing retry logic for API failures

The current hybrid approach provides the best balance of performance, reliability, and maintainability for most use cases. 