#!/bin/bash

# Quick Fix Script for Docker Build Issues
# Addresses common npm and Alpine package installation problems

set -e

echo "🔧 Fixing Docker Build Issues"
echo "============================="

# Function to check available resources
check_resources() {
    echo "📊 Checking system resources..."
    
    # Check available memory
    if command -v free >/dev/null 2>&1; then
        available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        echo "Available memory: ${available_mem}MB"
        
        if [ "$available_mem" -lt 1024 ]; then
            echo "⚠️ Warning: Low memory detected. Consider:"
            echo "   - Closing other applications"
            echo "   - Increasing Docker memory limit"
            echo "   - Using swap if available"
        fi
    fi
    
    # Check disk space
    echo "Available disk space:"
    df -h . | tail -1
    
    # Check Docker daemon memory
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker daemon is accessible"
    else
        echo "❌ Docker daemon is not accessible"
        exit 1
    fi
}

# Function to clean up Docker resources
cleanup_docker() {
    echo ""
    echo "🧹 Cleaning up Docker resources..."
    
    # Stop any running containers
    echo "Stopping containers..."
    docker compose down 2>/dev/null || true
    
    # Remove build cache
    echo "Removing build cache..."
    docker builder prune -f 2>/dev/null || true
    
    # Remove unused images
    echo "Removing unused images..."
    docker image prune -f
    
    # Remove unused containers
    echo "Removing unused containers..."
    docker container prune -f
    
    # Remove unused networks
    echo "Removing unused networks..."
    docker network prune -f
}

# Function to optimize Docker settings
optimize_docker() {
    echo ""
    echo "⚙️ Optimizing Docker settings..."
    
    # Enable BuildKit for better performance
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    
    echo "✅ BuildKit enabled"
    echo "✅ Compose CLI build enabled"
}

# Function to fix npm issues
fix_npm_issues() {
    echo ""
    echo "📦 Fixing npm issues..."
    
    # Check if package-lock.json exists in backend
    if [ -f "packages/backend/package-lock.json" ]; then
        echo "Found package-lock.json in backend"
    else
        echo "⚠️ No package-lock.json found in backend - this might cause issues"
    fi
    
    # Check if package-lock.json exists in frontend
    if [ -f "packages/frontend/package-lock.json" ]; then
        echo "Found package-lock.json in frontend"
    else
        echo "⚠️ No package-lock.json found in frontend - this might cause issues"
    fi
}

# Function to build with retries
build_with_retries() {
    echo ""
    echo "🔨 Building with retries and optimizations..."
    
    # Set memory limits for npm
    export NODE_OPTIONS="--max-old-space-size=2048"
    
    # Try building backend first
    echo "Building backend..."
    if ! docker compose build backend; then
        echo "⚠️ Backend build failed, retrying with no cache..."
        if ! docker compose build --no-cache backend; then
            echo "❌ Backend build failed twice. Check logs above."
            return 1
        fi
    fi
    
    # Try building frontend
    echo "Building frontend..."
    if ! docker compose build frontend; then
        echo "⚠️ Frontend build failed, retrying with no cache..."
        if ! docker compose build --no-cache frontend; then
            echo "❌ Frontend build failed twice. Check logs above."
            return 1
        fi
    fi
    
    # Build remaining services
    echo "Building remaining services..."
    docker compose build postgres redis
    
    echo "✅ All services built successfully"
}

# Function to test the build
test_build() {
    echo ""
    echo "🧪 Testing the build..."
    
    # Start services
    echo "Starting services..."
    docker compose up -d
    
    # Wait a bit for services to start
    echo "Waiting for services to initialize..."
    sleep 15
    
    # Check if services are running
    echo "Checking service status..."
    docker compose ps
    
    # Check backend health
    echo "Testing backend health..."
    if curl -f http://localhost:3001/health >/dev/null 2>&1; then
        echo "✅ Backend is healthy"
    else
        echo "⚠️ Backend health check failed (this might be normal if migrations haven't run)"
    fi
    
    # Check if frontend is accessible
    echo "Testing frontend accessibility..."
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        echo "✅ Frontend is accessible"
    else
        echo "⚠️ Frontend is not accessible yet"
    fi
}

# Main execution
main() {
    echo "Starting build issue fix process..."
    echo ""
    
    # Run all fix steps
    check_resources
    cleanup_docker
    optimize_docker
    fix_npm_issues
    
    if build_with_retries; then
        test_build
        echo ""
        echo "🎉 Build fix completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Run migrations: docker compose exec backend npm run migration:run"
        echo "2. Check logs: docker compose logs -f"
        echo "3. Access frontend: http://localhost:3000"
        echo "4. Access backend: http://localhost:3001"
    else
        echo ""
        echo "❌ Build fix failed. Please check the error messages above."
        echo ""
        echo "Additional troubleshooting:"
        echo "1. Check Docker logs: docker compose logs"
        echo "2. Try manual cleanup: make clean-all"
        echo "3. Run full troubleshooting: make troubleshoot"
        echo "4. Check system resources and free up memory/disk space"
        exit 1
    fi
}

# Run the main function
main "$@"
