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
	@docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

dev-down: ## Stop development services
	@echo "🛑 Stopping development services..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml down

dev-restart: ## Restart development services
	@echo "🔄 Restarting development services..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml restart

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
migrate: ## Run database migrations (development)
	@echo "🗄️ Running database migrations..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run migration:run

migrate-prod: ## Run database migrations (production)
	@echo "🗄️ Running database migrations (production)..."
	@docker compose -f docker-compose.prod.yml exec backend npm run migration:run

migrate-generate: ## Generate new migration
	@echo "📝 Generating new migration..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run migration:generate

migrate-revert: ## Revert last migration
	@echo "⏪ Reverting last migration..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml exec backend npm run migration:revert

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
