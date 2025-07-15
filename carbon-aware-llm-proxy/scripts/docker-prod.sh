#!/bin/bash

# Production Docker Deployment Script
# This script helps deploy the application in production

set -e

echo "🚀 Deploying Carbon-Aware LLM Proxy to Production"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose plugin or update Docker."
    exit 1
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found. Please create it from .env.production template."
    exit 1
fi

# Copy production environment
echo "📝 Using production environment configuration..."
cp .env.production .env

# Validate required environment variables
echo "🔍 Validating environment configuration..."
source .env

required_vars=("DB_PASSWORD" "JWT_SECRET" "CORS_ORIGINS")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "CHANGE_THIS_SECURE_PASSWORD" ] || [ "${!var}" = "CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_IN_PRODUCTION" ]; then
        echo "❌ Please set $var in .env.production file"
        exit 1
    fi
done

# Pull the latest images
echo "📦 Pulling latest Docker images..."
docker compose -f docker-compose.prod.yml pull

# Build the services
echo "🔨 Building production Docker services..."
docker compose -f docker-compose.prod.yml build --no-cache

# Stop existing services
echo "🛑 Stopping existing services..."
docker compose -f docker-compose.prod.yml down

# Start the services
echo "🚀 Starting production services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker compose -f docker-compose.prod.yml ps

# Run database migrations
echo "🗄️ Running database migrations..."
docker compose -f docker-compose.prod.yml exec backend npm run migration:run || echo "⚠️ Migration failed or no migrations to run"

# Test the deployment
echo "🧪 Testing deployment..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️ Health check failed - please check the logs"
fi

echo ""
echo "✅ Production deployment completed!"
echo ""
echo "🌐 Services are available at:"
echo "   Application: http://localhost (or your configured domain)"
echo "   Health Check: http://localhost/health"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker compose -f docker-compose.prod.yml logs -f [service]"
echo "   Stop services: docker compose -f docker-compose.prod.yml down"
echo "   Restart services: docker compose -f docker-compose.prod.yml restart"
echo "   Update deployment: ./scripts/docker-prod.sh"
echo ""
echo "🔒 Security reminders:"
echo "   - Ensure firewall is properly configured"
echo "   - Set up SSL certificates for HTTPS"
echo "   - Regularly update Docker images"
echo "   - Monitor application logs"
