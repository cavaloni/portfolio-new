#!/bin/bash

# Enhanced migration script with DNS resolution and retry logic
# This script addresses the ENOTFOUND DNS resolution error in CI environments

set -e

# Configuration
MAX_RETRIES=5
RETRY_DELAY=3
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-carbon_aware_llm}"

echo "🔄 Starting enhanced migration process..."
echo "Database Host: $DB_HOST"
echo "Database Port: $DB_PORT"
echo "Database Name: $DB_NAME"

# Function to test DNS resolution
test_dns_resolution() {
    local host=$1
    echo "🔍 Testing DNS resolution for $host..."

    if command -v nslookup &> /dev/null; then
        if nslookup "$host" &> /dev/null; then
            echo "✅ DNS resolution successful for $host"
            return 0
        else
            echo "❌ DNS resolution failed for $host"
            return 1
        fi
    elif command -v dig &> /dev/null; then
        if dig +short "$host" | grep -q .; then
            echo "✅ DNS resolution successful for $host"
            return 0
        else
            echo "❌ DNS resolution failed for $host"
            return 1
        fi
    else
        # Fallback: try to ping the host
        if ping -c 1 -W 5 "$host" &> /dev/null; then
            echo "✅ Host reachable: $host"
            return 0
        else
            echo "❌ Host unreachable: $host"
            return 1
        fi
    fi
}

# Function to test database connectivity
test_database_connection() {
    echo "🔍 Testing database connectivity..."

    if command -v pg_isready &> /dev/null; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME"; then
            echo "✅ Database is ready"
            return 0
        else
            echo "❌ Database is not ready"
            return 1
        fi
    elif command -v psql &> /dev/null; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
            echo "✅ Database connection successful"
            return 0
        else
            echo "❌ Database connection failed"
            return 1
        fi
    else
        echo "⚠️  No PostgreSQL client tools available for testing"
        return 0  # Continue anyway
    fi
}

# Function to wait for services
wait_for_services() {
    # If DATABASE_URL is set, we skip the granular checks and let the migration command handle it.
    # The URL is expected to be correct and the service reachable.
    if [ -n "$DATABASE_URL" ]; then
        echo "✅ DATABASE_URL is set. Skipping manual service checks and proceeding directly to migration."
        return 0
    fi

    local attempt=1
    local max_attempts=30

    echo "⏳ Waiting for services to be ready..."

    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt/$max_attempts..."

        # Test DNS resolution
        if ! test_dns_resolution "$DB_HOST"; then
            echo "DNS resolution failed, retrying in 2 seconds..."
            sleep 2
            ((attempt++))
            continue
        fi

        # Test database connectivity
        if test_database_connection; then
            echo "🎉 All services are ready!"
            return 0
        fi

        echo "Services not ready, waiting 2 seconds..."
        sleep 2
        ((attempt++))
    done

    echo "❌ Services failed to become ready after $max_attempts attempts"
    return 1
}

# Function to run migration with retry
run_migration() {
    local attempt=1

    while [ $attempt -le $MAX_RETRIES ]; do
        echo "🚀 Running migration (attempt $attempt/$MAX_RETRIES)..."

        if yarn migration:run; then
            echo "✅ Migration completed successfully!"
            return 0
        else
            echo "❌ Migration failed (attempt $attempt/$MAX_RETRIES)"

            if [ $attempt -lt $MAX_RETRIES ]; then
                echo "⏳ Retrying in $RETRY_DELAY seconds..."
                sleep $RETRY_DELAY
            fi
        fi

        ((attempt++))
    done

    echo "❌ Migration failed after $MAX_RETRIES attempts"
    return 1
}

# Main execution
echo "🌟 Enhanced Migration Script for Carbon-Aware LLM Proxy"
echo "=================================================="

# Change to backend directory
cd carbon-aware-llm-proxy/packages/backend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd ../..
    yarn install --frozen-lockfile
    cd packages/backend
fi

# Wait for services to be ready
if ! wait_for_services; then
    echo "❌ Failed to establish service connectivity"
    exit 1
fi

# Run migration with retry logic
if run_migration; then
    echo "🎉 Migration process completed successfully!"
    exit 0
else
    echo "❌ Migration process failed"
    exit 1
fi
