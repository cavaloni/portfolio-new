-- Database initialization script for Carbon-Aware LLM Proxy
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- But we can set up additional configurations here

-- Set timezone
SET timezone = 'UTC';

-- Create extensions that might be needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create a read-only user for monitoring/analytics (optional)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'readonly_user') THEN
        CREATE ROLE readonly_user WITH LOGIN PASSWORD 'readonly_password';
    END IF;
END
$$;

-- Grant connect permission to readonly user
GRANT CONNECT ON DATABASE carbon_aware_llm TO readonly_user;

-- Note: Table-specific permissions will be granted after migrations run
-- This is handled by the application startup process

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
END
$$;
