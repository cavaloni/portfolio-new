# Makefile for Carbon-Aware LLM Proxy Docker Management
# Provides convenient commands for Docker operations

.PHONY: help dev prod build clean logs test migrate backup restore

# Default target
help: ## Show this help message
	@echo "Carbon-Aware LLM Proxy Docker Management"
	@echo "========================================"
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development commands
dev: ## Start development environment
	@echo "🚀 Starting development environment..."
	@./scripts/docker-dev.sh

dev-up: ## Start development services (docker compose up)
	@echo "🚀 Starting development services..."
	@NEXT_PUBLIC_DISABLE_AUTH=true docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

dev-up-mock: ## Start development services in mock routing mode
	@echo "🎭 Starting development services (routing mock enabled)..."
	@NEXT_PUBLIC_DISABLE_AUTH=true ROUTING_MOCK_ENABLED=true docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
	@echo "✅ Mock mode active: backend will report mocked model/region and route to the always-warm deployment"

dev-down: ## Stop development services
	@echo "🛑 Stopping development services..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml down

dev-restart: ## Restart development services
	@echo "🔄 Restarting development services..."
	@NEXT_PUBLIC_DISABLE_AUTH=true docker compose -f docker-compose.yml -f docker-compose.override.yml restart

dev-restart-mock: ## Restart development services with mock routing enabled
	@echo "🔄 Restarting development services (routing mock enabled)..."
	@NEXT_PUBLIC_DISABLE_AUTH=true ROUTING_MOCK_ENABLED=true docker compose -f docker-compose.yml -f docker-compose.override.yml down
	@NEXT_PUBLIC_DISABLE_AUTH=true ROUTING_MOCK_ENABLED=true docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
	@echo "✅ Mock mode active"

dev-logs: ## Show development logs
	@docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f

dev-build: ## Build development images
	@echo "🔨 Building development images..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml build

dev-rebuild: ## Rebuild development images without cache
	@echo "🔨 Rebuilding development images..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml build --no-cache

# Backend dependency maintenance
backend-refresh-deps: ## Refresh deps after adding packages (reset backend node_modules volume, rebuild backend+frontend images, start both)
	@echo "🧰 Refreshing dependencies (backend node_modules volume reset + rebuild backend & frontend)..."
	@echo "⏹️  Stopping services..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml stop backend frontend || true
	@echo "🗑️  Removing containers (if exist)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml rm -f backend frontend || true
	@echo "🧹 Removing persistent backend node_modules volume..."
	@docker volume rm carbon-aware-backend-node-modules || true
	@echo "🔨 Rebuilding images without cache (backend & frontend)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml build --no-cache backend frontend
	@echo "🚀 Starting services (backend & frontend)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml up -d backend frontend
	@echo "✅ Dependencies refreshed (backend & frontend)"

backend-refresh-deps-mock: ## Same as backend-refresh-deps but starts both services with routing mock enabled for backend
	@echo "🧰 Refreshing dependencies (mock mode)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml stop backend frontend || true
	@docker compose -f docker-compose.yml -f docker-compose.override.yml rm -f backend frontend || true
	@docker volume rm carbon-aware-backend-node-modules || true
	@docker compose -f docker-compose.yml -f docker-compose.override.yml build --no-cache backend frontend
	@echo "🎭 Starting services (backend mock enabled + frontend)..."
	@ROUTING_MOCK_ENABLED=true docker compose -f docker-compose.yml -f docker-compose.override.yml up -d backend frontend
	@echo "✅ Dependencies refreshed (mock mode)"

# Production commands
prod: ## Deploy to production
	@echo "🚀 Deploying to production..."
	@./scripts/docker-prod.sh

prod-up: ## Start production services
	@echo "🚀 Starting production services..."
	@docker compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production services
	@echo "🛑 Stopping production services..."
	@docker compose -f docker-compose.prod.yml down

prod-restart: ## Restart production services
	@echo "🔄 Restarting production services..."
	@docker compose -f docker-compose.prod.yml restart

prod-logs: ## Show production logs
	@docker compose -f docker-compose.prod.yml logs -f

prod-build: ## Build production images
	@echo "🔨 Building production images..."
	@docker compose -f docker-compose.prod.yml build

prod-rebuild: ## Rebuild production images without cache
	@echo "🔨 Rebuilding production images..."
	@docker compose -f docker-compose.prod.yml build --no-cache

redis-admin: ## Start Redis Commander admin tool
	@echo "📊 Starting Redis Commander..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml up -d redis-commander
	@echo "✅ Redis Commander available at http://localhost:8081 (admin/admin123)"

dev-tools: ## Start development tools (Redis Commander)
	@echo "🛠️ Starting development tools..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml up -d redis-commander
	@echo "✅ Development tools started:"
	@echo "   - Redis Commander: http://localhost:8081 (admin/admin123)"
dev-tools-down: ## Stop development tools
	@echo "🛑 Stopping development tools..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml stop redis-commander
# Supabase commands
supabase-schema: ## Apply Supabase schema (run this in Supabase SQL editor)
	@echo "📋 Supabase schema script location: scripts/supabase-schema.sql"
	@echo "📝 Copy the contents of this file and run it in your Supabase SQL editor"
	@echo "🔗 Supabase SQL Editor: https://ttyezboapfpyvlyxiqjw.supabase.co/project/ttyezboapfpyvlyxiqjw/sql"

# Modal deployment
deploy-modal: ## Deploy Modal workers using Supabase metadata
	@echo "🪄 Deploying Modal workers via Supabase metadata..."
	@yarn workspace @carbon-aware-llm/backend deploy:modal

deploy-modal-force: ## Force redeploy Modal workers regardless of status
	@echo "🪄 Force deploying Modal workers via Supabase metadata..."
	@yarn workspace @carbon-aware-llm/backend deploy:modal -- --force

deploy-modal-docker: ## Deploy Modal workers inside backend container (requires Modal CLI in container)
	@echo "🪄 Deploying Modal workers (docker exec)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run deploy:modal

deploy-modal-docker-force: ## Force redeploy Modal workers inside backend container (ignores current deployment status)
	@echo "🪄 Force deploying Modal workers (docker exec)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run deploy:modal -- --force

sync-modal: ## Sync Modal deployments with Supabase state
	@echo "🔄 Syncing Modal deployments with Supabase..."
	@yarn workspace @carbon-aware-llm/backend sync:modal

sync-modal-docker: ## Sync Modal deployments with Supabase (inside Docker)
	@echo "🔄 Syncing Modal deployments with Supabase (Docker)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run sync:modal

# Cloud Deployment Commands
deploy-fly: ## Deploy backend to Fly.io (requires FLY_APP_NAME and FLY_API_TOKEN)
	@echo "🚀 Deploying backend to Fly.io app: routly-backend..."
	@flyctl deploy --remote-only --dockerfile packages/backend/Dockerfile --config packages/backend/fly.toml --app "routly-backend"
	@echo "✅ Backend deployment to Fly.io completed."

deploy-vercel: ## Deploy frontend to Vercel
	@echo "🚀 Deploying frontend to Vercel..."
	@cd packages/frontend && vercel --prod
	@echo "✅ Frontend deployment to Vercel completed."

# Testing commands
test: ## Run tests in development environment
	@echo "🧪 Running tests..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm test

test-backend: ## Run backend tests
	@echo "🧪 Running backend tests..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm test

test-frontend: ## Run frontend tests
	@echo "🧪 Running frontend tests..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec frontend npm test

# TypeScript commands
type-check: ## Check TypeScript types across all packages
	@echo "🔍 Checking TypeScript types..."
	@yarn ts:check

type-fix: ## Attempt to fix TypeScript errors automatically
	@echo "🔧 Attempting to fix TypeScript errors..."
	@echo "🎨 Running Prettier to fix formatting issues..."
	@yarn prettier:fix
	@echo "📦 Running ESLint with auto-fix on backend..."
	@yarn workspace @carbon-aware-llm/backend lint --fix || true
	@echo "📦 Running ESLint with auto-fix on frontend..."
	@yarn workspace @carbon-aware-llm/frontend lint --fix || true
	@echo "🔍 Final type check..."
	@yarn ts:check || echo "⚠️  Some TypeScript errors may require manual intervention"
	@echo "✅ Type fixing process completed"

type-fix-docker: ## Fix TypeScript errors inside Docker containers
	@echo "🔧 Fixing TypeScript errors (Docker)..."
	@echo "📦 Backend: ESLint auto-fix..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run lint -- --fix || true
	@echo "📦 Frontend: ESLint auto-fix..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec frontend npm run lint -- --fix || true
	@echo "🎨 Formatting with Prettier..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run format || true
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec frontend npm run format || true
	@echo "✅ Docker type fixing completed"

# Utility commands
status: ## Show service status
	@echo "📊 Service Status:"
	@docker compose -f docker-compose.yml -f docker-compose.override.yml ps

status-prod: ## Show production service status
	@echo "📊 Production Service Status:"
	@docker compose -f docker-compose.prod.yml ps

health: ## Check service health
	@echo "🔍 Checking service health..."
	@echo "Backend Health:"
	@curl -s http://localhost:3001/health | jq . || echo "❌ Backend health check failed"
	@echo ""
	@echo "Frontend Health:"
	@curl -s http://localhost:3000/api/health | jq . || echo "❌ Frontend health check failed"

logs-backend: ## Show backend logs
	@docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f backend

logs-frontend: ## Show frontend logs
	@docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f frontend

logs-redis: ## Show Redis logs
	@docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f redis

logs-redis-commander: ## Show Redis Commander logs
	@docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f redis-commander

# Shell access
shell-backend: ## Access backend container shell
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend sh

shell-frontend: ## Access frontend container shell
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec frontend sh

shell-redis: ## Access Redis container shell
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec redis redis-cli

# Cleanup commands
clean: ## Clean up containers, networks, and volumes
	@echo "🧹 Cleaning up Docker resources..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml down -v
	@docker system prune -f
	@echo "✅ Cleanup completed"

clean-all: ## Clean up everything including images
	@echo "🧹 Cleaning up all Docker resources..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml down -v
	@docker system prune -a -f
	@echo "✅ Complete cleanup finished"

# Troubleshooting commands
troubleshoot: ## Run Docker troubleshooting script
	@./scripts/docker-troubleshoot.sh

troubleshoot-auto: ## Run automated troubleshooting
	@./scripts/docker-troubleshoot.sh --auto

fix-build: ## Fix common build issues and rebuild
	@echo "🔧 Fixing build issues..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml down
	@docker system prune -f
	@docker compose -f docker-compose.yml -f docker-compose.override.yml build --no-cache
	@echo "✅ Build fix completed"

# Setup commands
setup: ## Initial setup for development
	@echo "⚙️ Setting up development environment..."
	@if [ ! -f .env ]; then cp .env.docker .env; echo "📝 Created .env file from template"; fi
	@mkdir -p backups
	@mkdir -p config/ssl
	@echo "✅ Setup completed"

setup-prod: ## Initial setup for production
	@echo "⚙️ Setting up production environment..."
	@if [ ! -f .env ]; then cp .env.production .env; echo "📝 Created .env file from production template"; fi
	@mkdir -p backups
	@mkdir -p config/ssl
	@echo "⚠️  Please update .env file with production values before deploying"
	@echo "✅ Production setup completed"

# Information commands
info: ## Show system information
	@echo "ℹ️ System Information:"
	@echo "Docker version: $(shell docker --version)"
	@echo "Docker Compose version: $(shell docker compose version)"
	@echo "Available disk space: $(shell df -h . | tail -1 | awk '{print $$4}')"
	@echo "Available memory: $(shell free -h | grep '^Mem:' | awk '{print $$7}')"

# Update commands
update: ## Update and restart development environment
	@echo "🔄 Updating development environment..."
	@git pull origin main
	@docker compose -f docker-compose.yml -f docker-compose.override.yml build --no-cache
	@docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
	@make migrate
	@echo "✅ Development environment updated"

update-prod: ## Update and restart production environment
	@echo "🔄 Updating production environment..."
	@git pull origin main
	@docker compose -f docker-compose.prod.yml build --no-cache
	@docker compose -f docker-compose.prod.yml up -d
	@make migrate-prod
	@echo "✅ Production environment updated"

## Modal setup info
modal-info: ## Show Modal setup info
	@echo "🪄 Modal setup:"
	@echo "  1) Install Python deps and Modal CLI in modal/: pip install -r requirements.txt"
	@echo "  2) Deploy: modal deploy modal/app.py"
	@echo "  3) Set MODAL_ENDPOINT_URL in .env to the deployed URL"
