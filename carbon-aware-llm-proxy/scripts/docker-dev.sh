#!/bin/bash

# Development Docker Setup Script
# This script helps set up the development environment with Docker

set -e

echo "🚀 Setting up Carbon-Aware LLM Proxy Development Environment"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose plugin or update Docker."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.docker template..."
    cp .env.docker .env
    echo "✅ .env file created. Please review and update the configuration as needed."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p config/ssl
mkdir -p scripts

# Pull the latest images
echo "📦 Pulling latest Docker images..."
docker compose pull

# Build the services with retry logic
echo "🔨 Building Docker services..."
if ! docker compose build; then
    echo "⚠️ Build failed, trying again with no cache..."
    docker compose build --no-cache
fi

# Start the services
echo "🚀 Starting development services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
docker compose ps

# Run database migrations
echo "🗄️ Running database migrations..."
docker compose exec backend npm run migration:run || echo "⚠️ Migration failed or no migrations to run"

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🌐 Services are available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   Database: localhost:5432"
echo "   Redis: localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker compose logs -f [service]"
echo "   Stop services: docker compose down"
echo "   Restart services: docker compose restart"
echo "   Run migrations: docker compose exec backend npm run migration:run"
echo ""
echo "🔧 To customize the configuration, edit the .env file and restart services."
