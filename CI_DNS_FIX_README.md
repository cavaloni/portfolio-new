# GitLab CI DNS Resolution Fix

## Problem
The GitLab CI pipeline was failing with the error:
```
Error: getaddrinfo ENOTFOUND [MASKED]
    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
```

This DNS resolution error occurred during TypeORM migration runs in the CI environment.

## Root Causes
1. **Missing environment variables**: Database connection parameters not properly configured in GitLab CI
2. **DNS resolution failures**: Containerized CI environment unable to resolve database hostnames
3. **Service dependency issues**: Database service not ready when migrations start
4. **Network connectivity problems**: CI containers unable to reach external database services

## Solutions Implemented

### 1. Enhanced GitLab CI Configuration (`.gitlab-ci.yml`)
- **PostgreSQL Service Integration**: Added local PostgreSQL service for CI testing
- **DNS Resolution Testing**: Built-in troubleshooting job to diagnose connectivity issues
- **Retry Logic**: Automatic retry mechanism for transient failures
- **Environment Variables**: Comprehensive environment variable configuration
- **Service Health Checks**: Proper waiting for database readiness before running migrations

### 2. CI-Specific Database Configuration (`database.ci.ts`)
- **Enhanced Connection Settings**: Improved connection timeout and retry configurations
- **Connection Pool Management**: Optimized connection pooling for CI environments
- **SSL Configuration**: Flexible SSL settings for different database providers
- **Error Handling**: Better error messages and connection diagnostics
- **Migration Isolation**: Each migration runs in its own transaction for safety

### 3. Enhanced Migration Script (`scripts/migrate-with-retry.sh`)
- **DNS Resolution Testing**: Validates hostname resolution before attempting connections
- **Database Connectivity Checks**: Verifies database is ready before running migrations
- **Retry Mechanism**: Automatic retry with exponential backoff for failed operations
- **Comprehensive Logging**: Detailed logging for troubleshooting CI issues
- **Service Dependency Management**: Ensures all required services are available

### 4. Updated Package Scripts
- **CI-Specific Migration Command**: `npm run migration:run:ci` for CI environments
- **Enhanced TypeORM Configuration**: Uses CI-optimized database configuration

## Usage

### For Local Development
```bash
# Use standard migration command
npm run migration:run
```

### For CI/GitLab
```bash
# Use CI-optimized migration command
npm run migration:run:ci

# Use enhanced migration script (recommended for CI)
./scripts/migrate-with-retry.sh
```

### Using Enhanced Migration Script
```bash
# Run the enhanced migration script directly
./scripts/migrate-with-retry.sh
```

## Deployment Options

The GitLab CI pipeline includes multiple deployment options for different scenarios:

### 1. Mock Deployment (`mock_deploy`)
- **Purpose**: Actually deploys the app with mock routing enabled
- **Triggers**: Runs on `main`, `develop`, and merge requests
- **Safety**: Deploys to staging environment with mock backend behavior
- **Use case**: Testing deployed app functionality with mock routing without production impact

```bash
# This job actually deploys the app with:
# - ROUTING_MOCK_ENABLED=true (enables mock routing)
# - NEXT_PUBLIC_DISABLE_AUTH=true (disables authentication)
# - Full deployment to staging environment
# - Mock backend behavior for testing
```

### 2. Development Deployment (`deploy`)
- **Purpose**: Automatic deployment for development branches
- **Triggers**: Runs automatically on `develop` branch
- **Environment**: Staging environment
- **Safety**: `allow_failure: true` to prevent blocking development

### 3. Production Deployment (`deploy_production`)
- **Purpose**: Manual production deployment
- **Triggers**: Manual trigger only on `main` branch
- **Environment**: Production environment
- **Safety**: Requires manual approval to prevent accidental deployments

### Triggering Deployments

```bash
# Mock deployment (automatic on pushes to main/develop/merge_requests)
# Actually deploys the app to staging with:
# - ROUTING_MOCK_ENABLED=true (enables mock routing)
# - NEXT_PUBLIC_DISABLE_AUTH=true (disables authentication)
# - Full deployment using flyctl deploy --remote-only

# Development deployment (automatic on develop branch)
# Can be controlled via GitLab CI variables:
# - Set ROUTING_MOCK_ENABLED=true to enable mock routing
# - Set NEXT_PUBLIC_DISABLE_AUTH=true to disable authentication

# Production deployment (manual)
# Go to GitLab CI/CD → Pipelines → Select pipeline → Manual jobs → deploy_production
```

### Mock Mode Configuration

The CI pipeline supports mock mode deployment for testing and development:

#### Mock Deployment Job (`mock_deploy`)
- **Always enabled**: `ROUTING_MOCK_ENABLED=true`
- **Authentication disabled**: `NEXT_PUBLIC_DISABLE_AUTH=true`
- **Purpose**: Full deployment testing with mock backend behavior
- **Use case**: Testing deployment pipeline without real backend dependencies

#### Development Deployment Job (`deploy`)
- **Configurable via GitLab variables**:
  - `ROUTING_MOCK_ENABLED`: Set to `true` to enable mock routing mode
  - `NEXT_PUBLIC_DISABLE_AUTH`: Set to `true` to disable authentication
- **Default**: Both variables default to `false` for production-like behavior
- **Use case**: Flexible development deployments with optional mock features

#### Setting GitLab CI Variables

1. Go to **GitLab Project → Settings → CI/CD → Variables**
2. Add the following variables:
   - **Variable**: `ROUTING_MOCK_ENABLED`
   - **Value**: `true` (or `false`)
   - **Environment**: Choose appropriate environment (e.g., development)

   - **Variable**: `NEXT_PUBLIC_DISABLE_AUTH`
   - **Value**: `true` (or `false`)
   - **Environment**: Choose appropriate environment

3. **Variable Types**:
   - **Protected**: Only available on protected branches
   - **Masked**: Hide sensitive values in logs
   - **Environment-scoped**: Different values per environment

#### Mock Mode Behavior

When `ROUTING_MOCK_ENABLED=true`:
- Backend reports mocked model/region data
- Routes to always-warm deployment instead of real routing logic
- Useful for testing frontend without complex backend dependencies
- Reduces external API dependencies during development

When `NEXT_PUBLIC_DISABLE_AUTH=true`:
- Authentication is completely bypassed
- Frontend operates in development mode
- No login requirements
- Useful for rapid prototyping and testing

## Environment Variables

### Required for CI
```bash
# Option 1: Individual connection parameters
DB_HOST=your-database-host
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name
DB_SSL=false

# Option 2: DATABASE_URL (preferred for managed databases)
DATABASE_URL=postgresql://username:password@host:port/database
```

### Optional CI Variables
```bash
CI_DEBUG=true          # Enable detailed logging
NODE_ENV=production    # Environment setting
```

## GitLab CI Setup

### Option 1: Using Local PostgreSQL Service
The pipeline includes a PostgreSQL service that runs locally in the CI environment:
```yaml
services:
  - postgres:15-alpine

variables:
  POSTGRES_DB: $DB_NAME
  POSTGRES_USER: $DB_USERNAME
  POSTGRES_PASSWORD: $DB_PASSWORD
```

### Option 2: Using External Database
For production databases, set the `DATABASE_URL` environment variable in GitLab:
1. Go to your GitLab project → Settings → CI/CD → Variables
2. Add `DATABASE_URL` with your database connection string
3. The pipeline will automatically use external database configuration

## Troubleshooting

### Run Diagnostics Job
```bash
# Manually trigger the troubleshoot job in GitLab CI
# This will test DNS resolution and database connectivity
```

### Common Issues and Solutions

#### 1. DNS Resolution Still Failing
```bash
# Check if hostname is resolvable
nslookup your-database-host

# Test network connectivity
ping your-database-host
```

#### 2. Database Connection Timeout
- Increase connection timeouts in `database.ci.ts`
- Check database firewall settings
- Verify database is accepting connections from CI IP ranges

#### 3. SSL Connection Issues
```bash
# For self-signed certificates
DB_SSL=true

# For managed databases (disable SSL verification)
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
```

#### 4. Environment Variables Not Set
- Verify GitLab CI variables are properly configured
- Check variable protection settings
- Ensure variables are available in the correct environments

## Security Considerations

### Environment Variables
- Never commit database credentials to version control
- Use GitLab's protected and masked variables for sensitive data
- Rotate credentials regularly
- Use different credentials for CI and production environments

### Network Security
- Restrict database access to known CI IP ranges
- Use SSL/TLS for database connections
- Implement connection timeouts to prevent hanging connections

## Monitoring and Alerts

### GitLab CI Monitoring
- Monitor pipeline success rates
- Set up alerts for migration failures
- Review CI logs regularly for connection issues

### Database Monitoring
- Monitor connection pool usage
- Set up alerts for database connectivity issues
- Review database logs for failed connection attempts

## Next Steps

1. **Test the CI Pipeline**: Push these changes and verify the pipeline runs successfully
2. **Monitor Performance**: Watch for connection timeouts and optimize as needed
3. **Update Documentation**: Keep this guide updated as configurations change
4. **Security Review**: Ensure all database credentials are properly secured

## Support

If you continue to experience DNS resolution issues:

1. Run the troubleshoot job in GitLab CI for diagnostics
2. Check GitLab CI logs for detailed error messages
3. Verify environment variables are correctly configured
4. Test database connectivity from your local environment
5. Contact your database administrator for network/firewall issues

This comprehensive solution addresses the DNS resolution error and provides robust database connectivity for CI/CD pipelines.
