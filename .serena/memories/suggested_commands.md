# Essential Development Commands

## Setup Commands
```bash
# From project root
cd carbon-aware-llm-proxy
yarn install  # Install all dependencies

# Frontend development
cd packages/frontend
yarn dev  # Start Next.js dev server (http://localhost:3000)

# Backend development  
cd packages/backend
yarn dev  # Start Express dev server (http://localhost:3001)
```

## Database Commands
```bash
# From packages/backend/
yarn migration:run      # Run pending migrations
yarn migration:create   # Create new migration
yarn migration:revert   # Revert last migration
```

## Deployment Commands
```bash
# From packages/backend/
yarn deploy:modal       # Deploy Modal workers and capture URLs
```

## Development Workflow
```bash
# Root level commands
yarn build              # Build all packages
yarn test               # Run all tests
yarn lint               # Lint all packages
yarn format             # Format code with Prettier
yarn fix:all            # Fix TypeScript and formatting issues
```

## Docker Commands
```bash
# From carbon-aware-llm-proxy/
make dev                # Start development environment
make migrate            # Run database migrations
make health             # Check service health
make clean              # Clean up Docker resources
```

## Testing API Endpoints
```bash
# Test routing
curl -X POST http://localhost:3001/v1/route \
  -H "Content-Type: application/json" \
  -d '{"joystick":{"x":-1,"y":0}}'

# Health check
curl http://localhost:3001/health
```