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

# Development Tools Commands
adminer: ## Start adminer database admin tool
	@echo "🗄️ Starting adminer..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml up -d adminer
	@echo "✅ Adminer available at http://localhost:8080"

redis-admin: ## Start Redis Commander admin tool
	@echo "📊 Starting Redis Commander..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml up -d redis-commander
	@echo "✅ Redis Commander available at http://localhost:8081 (admin/admin123)"

dev-tools: ## Start all development tools (adminer, redis-commander)
	@echo "🛠️ Starting development tools..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml up -d adminer redis-commander
	@echo "✅ Development tools started:"
	@echo "   - Adminer: http://localhost:8080"
	@echo "   - Redis Commander: http://localhost:8081 (admin/admin123)"

dev-tools-down: ## Stop development tools
	@echo "🛑 Stopping development tools..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml stop adminer redis-commander

# Database commands
migrate: ## Run database migrations (development - inside Docker)
	@echo "🗄️ Running database migrations..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run migration:run

migrate-local: ## Run database migrations against LOCAL DB from host
	@echo "🗄️ Running database migrations (local DB from host)..."
	@DB_USER=${DB_USERNAME:-postgres} \
	DB_PASS=${DB_PASSWORD:-postgres} \
	DB_PORT=${DB_PORT:-5433} \
	DB_NAME=${DB_NAME:-postgres} \
	DATABASE_URL=postgres://$$DB_USER:$$DB_PASS@127.0.0.1:$$DB_PORT/$$DB_NAME \
	npm --prefix packages/backend run migration:run

migrate-prod: ## Run database migrations (production - requires DATABASE_URL)
	@if [ -z "$$DATABASE_URL" ]; then echo "❌ Please set DATABASE_URL for production migrations"; exit 1; fi
	@echo "🗄️ Running database migrations (production)..."
	@DATABASE_URL="$$DATABASE_URL" npm --prefix packages/backend run migration:run

migrate-generate: ## Generate new migration
	@echo "📝 Generating new migration..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run migration:generate

migrate-revert: ## Revert last migration
	@echo "⏪ Reverting last migration..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run migration:revert

# Modal deployment
# Local flow: make migrate-local && make deploy-modal-local
# Prod flow: Set DATABASE_URL and MODAL_API_KEY, then make migrate-prod && make deploy-modal-prod
deploy-modal-local: ## Deploy Modal workers against LOCAL DB (override DB_* to customize)
	@echo "🪄 Deploying Modal workers (local DB)..."
	@DB_USER=${DB_USERNAME:-postgres} \
	DB_PASS=${DB_PASSWORD:-postgres} \
	DB_PORT=${DB_PORT:-5433} \
	DB_NAME=${DB_NAME:-postgres} \
	DATABASE_URL=postgres://$$DB_USER:$$DB_PASS@127.0.0.1:$$DB_PORT/$$DB_NAME \
	npm --prefix packages/backend run deploy:modal

deploy-modal-local-force: ## Force redeploy Modal workers against LOCAL DB (ignores current deployment status)
	@echo "🪄 Force deploying Modal workers (local DB)..."
	@DB_USER=${DB_USERNAME:-postgres} \
	DB_PASS=${DB_PASSWORD:-postgres} \
	DB_PORT=${DB_PORT:-5433} \
	DB_NAME=${DB_NAME:-postgres} \
	DATABASE_URL=postgres://$$DB_USER:$$DB_PASS@127.0.0.1:$$DB_PORT/$$DB_NAME \
	npm --prefix packages/backend run deploy:modal -- --force

deploy-modal-prod: ## Deploy Modal workers against PROD DB (requires DATABASE_URL and MODAL_API_KEY)
	@if [ -z "$$DATABASE_URL" ]; then echo "❌ Please set DATABASE_URL for production deployment"; exit 1; fi
	@echo "🪄 Deploying Modal workers (prod DB)..."
	@env -u DB_HOST -u DB_PORT -u DB_USERNAME -u DB_PASSWORD -u DB_NAME \
	DATABASE_URL="$$DATABASE_URL" \
	npm --prefix packages/backend run deploy:modal

deploy-modal-prod-force: ## Force redeploy Modal workers against PROD DB (ignores current deployment status)
	@if [ -z "$$DATABASE_URL" ]; then echo "❌ Please set DATABASE_URL for production deployment"; exit 1; fi
	@echo "🪄 Force deploying Modal workers (prod DB)..."
	@env -u DB_HOST -u DB_PORT -u DB_USERNAME -u DB_PASSWORD -u DB_NAME \
	DATABASE_URL="$$DATABASE_URL" \
	npm --prefix packages/backend run deploy:modal -- --force

deploy-modal: ## Alias to deploy-modal-local (back-compat)
	@$(MAKE) deploy-modal-local

deploy-modal-docker: ## Deploy Modal workers inside backend container (requires Modal CLI in container)
	@echo "🪄 Deploying Modal workers (docker exec)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run deploy:modal

deploy-modal-docker-force: ## Force redeploy Modal workers inside backend container (ignores current deployment status)
	@echo "🪄 Force deploying Modal workers (docker exec)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run deploy:modal -- --force

sync-modal: ## Sync Modal deployments with database
	@echo "🔄 Syncing Modal deployments with database..."
	@DB_HOST=127.0.0.1 \
	DB_PORT=${DB_PORT:-5432} \
	DB_USERNAME=${DB_USERNAME:-postgres} \
	DB_PASSWORD=${DB_PASSWORD:-postgres} \
	DB_NAME=${DB_NAME:-postgres} \
	DATABASE_URL=postgres://$${DB_USERNAME}:$${DB_PASSWORD}@$${DB_HOST}:$${DB_PORT}/$${DB_NAME} \
	npm --prefix packages/backend run sync:modal

sync-modal-docker: ## Sync Modal deployments with database (inside Docker)
	@echo "🔄 Syncing Modal deployments with database (Docker)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run sync:modal

# Backup and restore
backup: ## Create database backup
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec postgres pg_dump -U postgres carbon_aware_llm > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ directory"

backup-prod: ## Create production database backup
	@echo "💾 Creating production database backup..."
	@mkdir -p backups
	@docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres carbon_aware_llm > backups/prod_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Production backup created in backups/ directory"

restore: ## Restore database from backup (requires BACKUP_FILE variable)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "❌ Please specify BACKUP_FILE variable: make restore BACKUP_FILE=backups/backup_file.sql"; \
		exit 1; \
	fi
	@echo "🔄 Restoring database from $(BACKUP_FILE)..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec -T postgres psql -U postgres carbon_aware_llm < $(BACKUP_FILE)
	@echo "✅ Database restored successfully"

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

logs-db: ## Show database logs
	@docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f postgres

logs-redis: ## Show Redis logs
	@docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f redis

logs-adminer: ## Show adminer logs
	@docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f adminer

logs-redis-commander: ## Show Redis Commander logs
	@docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f redis-commander

# Shell access
shell-backend: ## Access backend container shell
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend sh

shell-frontend: ## Access frontend container shell
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec frontend sh

shell-db: ## Access database container shell
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec postgres psql -U postgres carbon_aware_llm

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
