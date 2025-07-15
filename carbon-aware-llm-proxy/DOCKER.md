# Docker Setup Guide for Carbon-Aware LLM Proxy

This guide provides comprehensive instructions for setting up and deploying the Carbon-Aware LLM Proxy using Docker and Docker Compose.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose Plugin 2.0+ (or Docker Desktop with Compose V2)
- At least 4GB RAM available for containers
- 10GB free disk space

## 🚀 Quick Start (Development)

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd carbon-aware-llm-proxy
   ```

2. **Run the development setup script:**
   ```bash
   ./scripts/docker-dev.sh
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

## 🏗️ Architecture Overview

The Docker setup includes the following services:

- **Frontend**: Next.js application (port 3000)
- **Backend**: Node.js/Express API (port 3001)
- **PostgreSQL**: Database server (port 5432)
- **Redis**: Cache and session store (port 6379)
- **Nginx**: Reverse proxy (production only, port 80/443)

## 📁 File Structure

```
carbon-aware-llm-proxy/
├── docker-compose.yml              # Development configuration
├── docker-compose.prod.yml         # Production configuration
├── .env.docker                     # Development environment template
├── .env.production                 # Production environment template
├── packages/
│   ├── backend/
│   │   ├── Dockerfile              # Production backend image
│   │   ├── Dockerfile.dev          # Development backend image
│   │   └── .dockerignore
│   └── frontend/
│       ├── Dockerfile              # Production frontend image
│       ├── Dockerfile.dev          # Development frontend image
│       ├── next.config.js          # Next.js configuration
│       └── .dockerignore
├── config/
│   ├── nginx.conf                  # Nginx configuration
│   └── redis.conf                  # Redis configuration
└── scripts/
    ├── docker-dev.sh               # Development setup script
    ├── docker-prod.sh              # Production deployment script
    └── init-db.sql                 # Database initialization
```

## 🛠️ Development Setup

### Manual Setup

1. **Create environment file:**
   ```bash
   cp .env.docker .env
   # Edit .env with your configuration
   ```

2. **Start services:**
   ```bash
   docker compose up -d
   ```

3. **Run database migrations:**
   ```bash
   docker compose exec backend npm run migration:run
   ```

4. **View logs:**
   ```bash
   docker compose logs -f
   ```

### Development Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart a specific service
docker compose restart backend

# View logs for a specific service
docker compose logs -f frontend

# Execute commands in a container
docker compose exec backend npm run migration:generate

# Rebuild services after code changes
docker compose build --no-cache
```

## 🚀 Production Deployment

### Prerequisites

1. **Configure environment:**
   ```bash
   cp .env.production .env
   # Update all CHANGE_THIS_* values with secure configurations
   ```

2. **Required environment variables:**
   - `DB_PASSWORD`: Secure database password
   - `JWT_SECRET`: Secure JWT signing key
   - `CORS_ORIGINS`: Your production domain(s)
   - API keys for external services (optional)

### Deployment

1. **Run production deployment script:**
   ```bash
   ./scripts/docker-prod.sh
   ```

2. **Or deploy manually:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

### Production Commands

```bash
# Deploy/update production
docker compose -f docker-compose.prod.yml up -d

# Stop production services
docker compose -f docker-compose.prod.yml down

# View production logs
docker compose -f docker-compose.prod.yml logs -f

# Scale services (if needed)
docker compose -f docker-compose.prod.yml up -d --scale backend=2
```

## 🔧 Configuration

### Environment Variables

Key environment variables for Docker deployment:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database hostname | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `REDIS_HOST` | Redis hostname | `redis` |
| `JWT_SECRET` | JWT signing secret | Required |
| `CORS_ORIGINS` | Allowed origins | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` |

### Volume Persistence

Data is persisted in Docker volumes:
- `postgres_data_dev/prod`: Database data
- `redis_data_dev/prod`: Redis data

### Networking

Services communicate through a custom Docker network:
- Development: `carbon-aware-network`
- Production: `carbon-aware-network-prod`

## 🔍 Monitoring and Health Checks

### Health Check Endpoints

- Backend: `http://localhost:3001/health`
- Frontend: `http://localhost:3000` (via Nginx in production)

### Container Health Checks

All services include health checks:
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- Backend: HTTP health endpoint
- Frontend: HTTP availability check

### Monitoring Commands

```bash
# Check service status
docker compose ps

# View resource usage
docker stats

# Check container health
docker compose exec backend curl http://localhost:3001/health
```

## 🐛 Troubleshooting

### Common Issues

1. **Build failures (exit code 137 - out of memory):**
   ```bash
   # Quick fix for build issues
   ./scripts/fix-build-issues.sh

   # Or use make command
   make fix-build

   # Manual steps:
   docker compose down
   docker system prune -f
   docker compose build --no-cache
   ```

2. **npm ci failures:**
   ```bash
   # Clean npm cache and rebuild
   docker compose down
   docker system prune -f
   export NODE_OPTIONS="--max-old-space-size=2048"
   docker compose build --no-cache
   ```

3. **Port conflicts:**
   ```bash
   # Check what's using the port
   lsof -i :3000
   # Stop conflicting services or change ports in docker-compose.yml
   ```

4. **Database connection issues:**
   ```bash
   # Check database logs
   docker compose logs postgres
   # Verify database is healthy
   docker compose exec postgres pg_isready -U postgres
   ```

5. **Migration failures:**
   ```bash
   # Run migrations manually
   docker compose exec backend npm run migration:run
   # Check migration status
   docker compose exec backend npm run typeorm migration:show
   ```

6. **General build failures:**
   ```bash
   # Clean build cache
   docker system prune -a
   # Rebuild without cache
   docker compose build --no-cache
   ```

### Logs and Debugging

```bash
# View all logs
docker compose logs

# Follow logs for specific service
docker compose logs -f backend

# Debug container
docker compose exec backend sh

# Check container resources
docker stats carbon-aware-backend-dev
```

## 🔒 Security Considerations

### Production Security

1. **Change default passwords:**
   - Database password
   - JWT secret
   - Redis password (if enabled)

2. **Network security:**
   - Use internal Docker networks
   - Expose only necessary ports
   - Configure firewall rules

3. **SSL/TLS:**
   - Configure SSL certificates in Nginx
   - Update `docker-compose.prod.yml` for HTTPS

4. **Regular updates:**
   - Update base images regularly
   - Monitor for security vulnerabilities
   - Keep dependencies updated

### Environment Security

```bash
# Secure .env file permissions
chmod 600 .env

# Don't commit .env files
echo ".env" >> .gitignore
```

## 📊 Performance Optimization

### Resource Limits

Production containers include resource limits:
- Backend: 512MB memory limit
- Frontend: 256MB memory limit
- Database: 512MB memory limit
- Redis: 256MB memory limit

### Scaling

```bash
# Scale backend horizontally
docker compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale with load balancer
# Update nginx.conf upstream configuration
```

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose build --no-cache
docker compose up -d

# Run any new migrations
docker compose exec backend npm run migration:run
```

### Database Backups

```bash
# Create backup
docker compose exec postgres pg_dump -U postgres carbon_aware_llm > backup.sql

# Restore backup
docker compose exec -T postgres psql -U postgres carbon_aware_llm < backup.sql
```

### Cleanup

```bash
# Remove unused containers and images
docker system prune -a

# Remove volumes (WARNING: This deletes data)
docker compose down -v
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review container logs: `docker compose logs`
3. Check service health: `docker compose ps`
4. Consult the main project README.md
