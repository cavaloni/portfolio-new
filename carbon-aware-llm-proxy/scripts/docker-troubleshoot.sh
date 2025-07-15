#!/bin/bash

# Docker Troubleshooting Script
# Helps diagnose and fix common Docker build issues

set -e

echo "🔧 Docker Troubleshooting for Carbon-Aware LLM Proxy"
echo "=================================================="

# Function to check Docker resources
check_docker_resources() {
    echo ""
    echo "📊 Checking Docker Resources..."
    
    # Check Docker system info
    echo "Docker version: $(docker --version)"
    echo "Docker Compose version: $(docker compose version)"
    
    # Check available disk space
    echo "Available disk space:"
    df -h /var/lib/docker 2>/dev/null || df -h /
    
    # Check Docker system usage
    echo ""
    echo "Docker system usage:"
    docker system df
}

# Function to clean up Docker resources
cleanup_docker() {
    echo ""
    echo "🧹 Cleaning up Docker resources..."
    
    # Stop all containers for this project
    echo "Stopping project containers..."
    docker compose down 2>/dev/null || true
    
    # Remove unused containers, networks, images
    echo "Removing unused Docker resources..."
    docker system prune -f
    
    # Remove dangling images
    echo "Removing dangling images..."
    docker image prune -f
}

# Function to fix npm build issues
fix_npm_issues() {
    echo ""
    echo "🔧 Fixing npm build issues..."
    
    # Clear npm cache in containers if they exist
    echo "Clearing npm cache in containers..."
    docker compose exec backend npm cache clean --force 2>/dev/null || true
    docker compose exec frontend npm cache clean --force 2>/dev/null || true
}

# Function to rebuild with optimizations
rebuild_optimized() {
    echo ""
    echo "🔨 Rebuilding with optimizations..."
    
    # Set Docker buildkit for better performance
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
    
    # Build with no cache
    echo "Building with no cache..."
    docker compose build --no-cache
}

# Function to check for common issues
check_common_issues() {
    echo ""
    echo "🔍 Checking for common issues..."
    
    # Check if ports are in use
    echo "Checking if required ports are available..."
    for port in 3000 3001 5432 6379; do
        if lsof -i :$port >/dev/null 2>&1; then
            echo "⚠️ Port $port is in use"
        else
            echo "✅ Port $port is available"
        fi
    done
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker daemon is not running or accessible"
        exit 1
    else
        echo "✅ Docker daemon is running"
    fi
    
    # Check available memory
    available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}' 2>/dev/null || echo "unknown")
    if [ "$available_mem" != "unknown" ] && [ "$available_mem" -lt 2048 ]; then
        echo "⚠️ Low available memory: ${available_mem}MB (recommended: 2GB+)"
    else
        echo "✅ Memory check passed"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "Select an option:"
    echo "1) Check Docker resources and system info"
    echo "2) Clean up Docker resources"
    echo "3) Fix npm build issues"
    echo "4) Rebuild with optimizations"
    echo "5) Check for common issues"
    echo "6) Full troubleshooting (all of the above)"
    echo "7) Exit"
    echo ""
}

# Main script logic
main() {
    if [ "$1" = "--auto" ]; then
        echo "Running full troubleshooting automatically..."
        check_docker_resources
        check_common_issues
        cleanup_docker
        fix_npm_issues
        rebuild_optimized
        exit 0
    fi
    
    while true; do
        show_menu
        read -p "Enter your choice (1-7): " choice
        
        case $choice in
            1) check_docker_resources ;;
            2) cleanup_docker ;;
            3) fix_npm_issues ;;
            4) rebuild_optimized ;;
            5) check_common_issues ;;
            6) 
                check_docker_resources
                check_common_issues
                cleanup_docker
                fix_npm_issues
                rebuild_optimized
                ;;
            7) 
                echo "Exiting..."
                exit 0
                ;;
            *) 
                echo "Invalid option. Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"
