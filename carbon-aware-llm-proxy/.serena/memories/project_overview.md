# Project Overview

- Purpose: Carbon-aware LLM proxy with real-time emissions-aware routing. Frontend provides chat UI and preference joystick; backend routes requests based on joystick/weights and region.
- Structure: Yarn workspaces monorepo: `packages/frontend` (Next.js app) and `packages/backend` (Express/TypeScript service). Root scripts delegate to workspaces.
- Tech stack:
  - Frontend: Next.js 14, React 18, Tailwind CSS, Radix UI, TanStack Query, Zod.
  - Backend: Node/Express, TypeScript, Zod, TypeORM (PG), WebSocket, Redis.
  - Tooling: Yarn v4 (Berry), TypeScript, ESLint, Prettier, Husky.
- Entrypoints:
  - Frontend dev: `yarn dev:frontend` (Next dev)
  - Backend dev: `yarn dev:backend` (ts-node-dev)
  - Build all: `yarn build`
  - Start backend (built): `yarn workspace @carbon-aware-llm/backend start`
  - Start frontend (built): `yarn workspace @carbon-aware-llm/frontend start`
- Notable components: `QuadrantJoystick` in `packages/frontend/src/components/quadrant-joystick` used on `src/app/chat/page.tsx`. Routing logic lives in backend `deployment-routing.service.ts`.
