# Supabase Migration Guide

This document provides a comprehensive guide for migrating the Carbon-Aware LLM Proxy from PostgreSQL with TypeORM to Supabase.

## Overview

The migration implements a **hybrid approach** that allows the application to work with both PostgreSQL and Supabase simultaneously, enabling a gradual transition with zero downtime.

### Migration Strategy

1. **Phase 1**: Add Supabase support alongside existing PostgreSQL setup
2. **Phase 2**: Migrate data from PostgreSQL to Supabase
3. **Phase 3**: Switch to hybrid mode (read from Supabase, write to both)
4. **Phase 4**: Switch to Supabase-only mode
5. **Phase 5**: Remove PostgreSQL dependencies (optional)

## Prerequisites

### Supabase Setup

1. **Supabase Project**: Already configured at `https://ttyezboapfpyvlyxiqjw.supabase.co`
2. **API Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWV6Ym9hcGZweXZseXhpcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTQ3NzIsImV4cCI6MjA3MzAzMDc3Mn0.BX8WjVExYR0W5NhMGLumIaoYh4dvD2bl_ItZVQIWTfE`

### Environment Configuration

Update your `.env` file with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://ttyezboapfpyvlyxiqjw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWV6Ym9hcGZweXZseXhpcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTQ3NzIsImV4cCI6MjA3MzAzMDc3Mn0.BX8WjVExYR0W5NhMGLumIaoYh4dvD2bl_ItZVQIWTfE

# Database Mode (postgres|supabase|hybrid)
DATABASE_MODE=hybrid
```

## Step-by-Step Migration Process

### Step 1: Install Dependencies

The Supabase client library has been added to the backend package:

```bash
cd packages/backend
npm install @supabase/supabase-js
```

### Step 2: Create Supabase Schema

1. Open the Supabase SQL Editor: https://ttyezboapfpyvlyxiqjw.supabase.co/project/ttyezboapfpyvlyxiqjw/sql
2. Copy and execute the contents of `scripts/supabase-schema.sql`

Alternatively, use the Makefile command:
```bash
make supabase-schema
```

### Step 3: Test Supabase Connection

Test the Supabase connection and basic operations:

```bash
make test-supabase
```

### Step 4: Data Migration

#### Option A: Full Migration
```bash
# Dry run to preview the migration
make migrate-to-supabase-dry

# Perform the actual migration
make migrate-to-supabase
```

#### Option B: Table-by-Table Migration
```bash
# Migrate specific tables
make migrate-to-supabase-table TABLE=users
make migrate-to-supabase-table TABLE=model_info
make migrate-to-supabase-table TABLE=conversations
make migrate-to-supabase-table TABLE=messages
make migrate-to-supabase-table TABLE=carbon_footprints
```

#### Option C: Using npm scripts
```bash
cd packages/backend

# Dry run
npm run migrate:supabase:dry

# Full migration
npm run migrate:supabase

# Specific table
npm run migrate:supabase:table -- --table=users
```

### Step 5: Switch Database Mode

Update your environment configuration to use the desired database mode:

```bash
# Use only PostgreSQL (current default)
DATABASE_MODE=postgres

# Use only Supabase
DATABASE_MODE=supabase

# Use hybrid mode (recommended during transition)
DATABASE_MODE=hybrid
```

## Database Modes Explained

### PostgreSQL Mode (`DATABASE_MODE=postgres`)
- Uses only the existing PostgreSQL database with TypeORM
- No Supabase integration
- Default mode for backward compatibility

### Supabase Mode (`DATABASE_MODE=supabase`)
- Uses only Supabase for all database operations
- TypeORM is not initialized
- Recommended for new deployments

### Hybrid Mode (`DATABASE_MODE=hybrid`)
- Initializes both PostgreSQL and Supabase connections
- Reads from Supabase first, falls back to PostgreSQL
- Writes to both databases for data consistency
- Recommended during migration period

## Architecture Changes

### New Components

1. **SupabaseConfig** (`src/config/supabase.ts`)
   - Manages Supabase client configuration and initialization
   - Provides typed database schema definitions

2. **SupabaseService** (`src/services/supabase.service.ts`)
   - Provides database operations using Supabase client
   - Mirrors the interface of existing database operations

3. **HybridDatabaseService** (`src/services/hybrid-database.service.ts`)
   - Manages both PostgreSQL and Supabase connections
   - Provides unified interface for database operations
   - Handles mode switching and fallback logic

### Updated Components

1. **Main Application** (`src/index.ts`)
   - Initializes hybrid database service
   - Maintains backward compatibility

2. **Health Check** (`src/routes/healthCheck.ts`)
   - Reports status of both database connections
   - Provides detailed health information

## Data Migration Details

### Migration Order
The data migration follows this order to maintain referential integrity:

1. `users` - Base user accounts
2. `model_info` - Model information and metadata
3. `conversations` - User conversations (depends on users)
4. `messages` - Individual messages (depends on conversations)
5. `carbon_footprints` - Carbon footprint data (depends on messages)

### Migration Features

- **Batch Processing**: Processes records in configurable batches (default: 1000)
- **Error Handling**: Continues migration even if individual records fail
- **Progress Tracking**: Provides detailed progress information
- **Dry Run Mode**: Preview migration without actually transferring data
- **Selective Migration**: Migrate specific tables only
- **Data Transformation**: Automatically transforms data between PostgreSQL and Supabase formats

### Migration Statistics

The migration script provides detailed statistics:
- Total records per table
- Successfully migrated records
- Error count
- Processing time
- Overall summary

## Testing

### Unit Tests

Run Supabase-specific tests:
```bash
npm test -- --testNamePattern="supabase"
```

### Integration Tests

Test the hybrid database service:
```bash
npm test -- --testNamePattern="hybrid"
```

### Health Checks

Monitor database health:
```bash
curl http://localhost:3001/health
```

Expected response includes database status:
```json
{
  "status": "UP",
  "database": {
    "mode": "hybrid",
    "postgres": true,
    "supabase": true,
    "overall": true
  }
}
```

## CI/CD Integration

### GitLab CI Pipeline

The CI pipeline has been updated to support Supabase:

1. **Test Stage**: Includes Supabase integration tests
2. **Migration Stage**: Automated data migration for production
3. **Deploy Stage**: Supports hybrid and Supabase-only deployments

### Environment Variables

Set these variables in your CI/CD environment:

```bash
SUPABASE_URL=https://ttyezboapfpyvlyxiqjw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWV6Ym9hcGZweXZseXhpcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTQ3NzIsImV4cCI6MjA3MzAzMDc3Mn0.BX8WjVExYR0W5NhMGLumIaoYh4dvD2bl_ItZVQIWTfE
DATABASE_MODE=hybrid
```

## Rollback Strategy

### Emergency Rollback

If issues occur during migration:

1. **Switch back to PostgreSQL mode**:
   ```bash
   DATABASE_MODE=postgres
   ```

2. **Restart the application**:
   ```bash
   make dev-restart
   ```

### Data Rollback

If data corruption occurs in Supabase:

1. **Stop writes to Supabase** by switching to PostgreSQL mode
2. **Clear Supabase data** using the SQL editor
3. **Re-run the migration** with corrected data

## Performance Considerations

### Hybrid Mode Performance

- **Read Operations**: Supabase first, PostgreSQL fallback (slight latency increase)
- **Write Operations**: Both databases (2x write operations)
- **Connection Overhead**: Maintains connections to both databases

### Optimization Tips

1. **Use Supabase mode** once migration is complete and verified
2. **Monitor connection pools** in hybrid mode
3. **Implement caching** for frequently accessed data
4. **Use batch operations** for bulk data operations

## Security Considerations

### Row Level Security (RLS)

Supabase schema includes RLS policies:
- Users can only access their own data
- Model information is publicly readable
- Carbon footprints are restricted to message owners

### API Key Management

- **Anon Key**: Used for client-side operations (already configured)
- **Service Role Key**: Required for server-side operations (configure if needed)
- **Database Password**: Not exposed in Supabase (managed by Supabase)

## Monitoring and Observability

### Health Monitoring

The health check endpoint provides comprehensive database status:
- Individual database connection status
- Overall system health
- Performance metrics

### Logging

Enhanced logging for database operations:
- Connection status changes
- Migration progress
- Error details
- Performance metrics

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check Supabase URL and API key
   - Verify network connectivity
   - Check Supabase project status

2. **Permission Denied**
   - Review RLS policies
   - Check API key permissions
   - Verify user authentication

3. **Migration Failures**
   - Check data integrity constraints
   - Review error logs
   - Use dry-run mode to identify issues

4. **Performance Issues**
   - Monitor connection pool usage
   - Check query performance
   - Consider switching from hybrid to single-database mode

### Debug Commands

```bash
# Test Supabase connection
make test-supabase

# Check health status
curl http://localhost:3001/health

# View migration logs
make migrate-to-supabase-dry

# Test specific database operations
npm test -- --testNamePattern="supabase" --verbose
```

## Next Steps

1. **Complete Phase 1**: Verify all components are working in hybrid mode
2. **Data Migration**: Execute the data migration process
3. **Testing**: Thoroughly test all functionality in hybrid mode
4. **Switch to Supabase**: Change to Supabase-only mode once confident
5. **Cleanup**: Remove PostgreSQL dependencies (optional)

## Support

For issues or questions regarding the Supabase migration:

1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Consult the Supabase documentation: https://supabase.com/docs
4. Check the application logs for detailed error information

---

**Agent Note**: This migration maintains full backward compatibility while providing a smooth transition path to Supabase. The hybrid approach ensures zero downtime and allows for thorough testing before fully committing to the new database system.
