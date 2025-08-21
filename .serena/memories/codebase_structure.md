# Codebase Structure

## Root Directory
- `carbon-aware-llm-proxy/` - Main project directory
- `packages/` - Yarn workspace packages
- `scripts/` - Utility scripts
- `modal/` - Modal worker deployments

## Frontend (`carbon-aware-llm-proxy/packages/frontend/`)
- `src/app/` - Next.js app router pages
- `src/components/` - Reusable React components
  - `chat/` - Chat interface components
  - `ui/` - Base UI components (Radix)
  - `quadrant-joystick/` - Interactive preference selector
- `src/services/` - API service layers
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React context providers
- `src/types/` - TypeScript type definitions

## Backend (`carbon-aware-llm-proxy/packages/backend/`)
- `src/` - Source code
  - `routes/` - Express route handlers
  - `services/` - Business logic services
  - `entities/` - TypeORM database entities
  - `migrations/` - Database migration files
  - `config/` - Configuration files
- `scripts/` - Deployment and utility scripts

## Key Files
- Smart routing: `frontend/src/components/chat/smart-chat-interface.tsx`
- Current chat page: `frontend/src/app/chat/page.tsx`
- Routing logic: `backend/src/services/deployment-routing.service.ts`
- Database schema: `backend/src/entities/ModelDeployment.ts`