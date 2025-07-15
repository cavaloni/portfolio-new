# Docker Compose V2 Migration Guide

## Overview

This project has been updated to use the newer `docker compose` command (Compose V2) instead of the legacy `docker-compose` command (Compose V1). This guide explains the changes and how to migrate.

## What Changed

### Command Syntax
- **Old (V1)**: `docker-compose [command]`
- **New (V2)**: `docker compose [command]`

### Key Differences
1. **Hyphen vs Space**: `docker-compose` → `docker compose`
2. **Installation**: V2 is now a Docker plugin, not a separate binary
3. **Performance**: V2 is faster and more efficient
4. **Features**: V2 includes new features and better error messages

## Installation Requirements

### Docker Desktop Users
If you're using Docker Desktop, Compose V2 is already included. No additional installation needed.

### Linux Users
Install Docker Compose V2 plugin:

```bash
# Remove old docker-compose if installed
sudo rm /usr/local/bin/docker-compose

# Install Docker Compose V2 plugin
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Or using the official installation script
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p $DOCKER_CONFIG/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
```

### Verify Installation
```bash
# Check if V2 is available
docker compose version

# Should output something like:
# Docker Compose version v2.x.x
```

## Command Migration

### Basic Commands
```bash
# Old V1 syntax
docker-compose up -d
docker-compose down
docker-compose logs -f
docker-compose ps
docker-compose build

# New V2 syntax
docker compose up -d
docker compose down
docker compose logs -f
docker compose ps
docker compose build
```

### File-specific Commands
```bash
# Old V1 syntax
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml down

# New V2 syntax
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down
```

### Container Execution
```bash
# Old V1 syntax
docker-compose exec backend npm run migration:run
docker-compose exec postgres pg_dump -U postgres dbname

# New V2 syntax
docker compose exec backend npm run migration:run
docker compose exec postgres pg_dump -U postgres dbname
```

## Updated Project Files

The following files have been updated to use the new syntax:

### Scripts
- `scripts/docker-dev.sh` - Development setup script
- `scripts/docker-prod.sh` - Production deployment script

### Makefile
- `Makefile` - All make targets now use `docker compose`

### Documentation
- `README.md` - Updated installation and usage instructions
- `DOCKER.md` - Comprehensive Docker guide with V2 syntax
- `DOCKER_SETUP_SUMMARY.md` - Implementation summary

### Configuration
- `docker-compose.override.yml.example` - Override file example

## Backward Compatibility

### If You Still Have V1 Installed
If you still have the old `docker-compose` binary installed, you can:

1. **Use V1 temporarily**: The old syntax will still work with your existing installation
2. **Create an alias**: Add this to your shell profile (`.bashrc`, `.zshrc`, etc.):
   ```bash
   alias docker-compose='docker compose'
   ```
3. **Migrate to V2**: Follow the installation instructions above

### Checking Your Version
```bash
# Check if you have V1 (separate binary)
docker-compose --version

# Check if you have V2 (plugin)
docker compose version

# Check Docker version
docker --version
```

## Troubleshooting

### "docker: 'compose' is not a docker command"
This means you don't have Compose V2 installed. Install it using the instructions above.

### "command not found: docker-compose"
This is expected if you've removed V1 and are using V2. Use `docker compose` instead.

### Scripts Fail with "command not found"
Make sure you've updated all scripts to use the new syntax, or create an alias as mentioned above.

### Performance Issues
V2 is generally faster than V1. If you experience issues, try:
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker compose build --no-cache
```

## Migration Checklist

- [ ] Verify Docker Compose V2 is installed: `docker compose version`
- [ ] Update any custom scripts to use `docker compose`
- [ ] Update CI/CD pipelines to use new syntax
- [ ] Update team documentation and runbooks
- [ ] Test all Docker operations with new syntax
- [ ] Remove old `docker-compose` binary if no longer needed

## Benefits of V2

1. **Better Performance**: Faster startup and execution
2. **Improved Error Messages**: More helpful debugging information
3. **New Features**: Additional functionality and options
4. **Active Development**: V2 is actively maintained, V1 is deprecated
5. **Better Integration**: Tighter integration with Docker CLI

## Getting Help

If you encounter issues during migration:

1. Check the [official Docker Compose documentation](https://docs.docker.com/compose/)
2. Review the troubleshooting section above
3. Check project-specific documentation in `DOCKER.md`
4. Verify your Docker and Compose versions are up to date

## Quick Reference

### Most Common Commands
```bash
# Start development environment
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Run migrations
docker compose exec backend npm run migration:run

# Check service status
docker compose ps

# Build images
docker compose build

# Production deployment
docker compose -f docker-compose.prod.yml up -d
```

This migration ensures the project uses modern Docker tooling and provides better performance and reliability.
