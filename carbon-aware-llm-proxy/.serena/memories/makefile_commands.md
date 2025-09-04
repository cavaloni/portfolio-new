# Makefile Commands

## Development
- `make dev`: Start development environment (runs docker-dev.sh)
- `make dev-up`: Start development services
- `make dev-up-mock`: Start with mock routing enabled
- `make dev-down`: Stop development services
- `make dev-restart`: Restart development services
- `make dev-logs`: Show development logs
- `make dev-build`: Build development images
- `make dev-rebuild`: Rebuild development images without cache

## Production
- `make prod`: Deploy to production (runs docker-prod.sh)
- `make prod-up`: Start production services
- `make prod-down`: Stop production services
- `make prod-restart`: Restart production services
- `make prod-logs`: Show production logs
- `make prod-build`: Build production images
- `make prod-rebuild`: Rebuild production images without cache

## Development Tools
- `make adminer`: Start adminer database admin tool (http://localhost:8080)
- `make redis-admin`: Start Redis Commander (http://localhost:8081, admin/admin123)
- `make dev-tools`: Start all development tools (adminer, redis-commander)

## Database
- `make migrate-local`: Run database migrations against local DB
- `make backup-prod`: Create production database backup

## Maintenance
- `make clean`: Clean up containers, networks, and volumes