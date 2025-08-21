# Suggested Commands

- Install deps (Yarn v4 workspace-aware): `yarn install`
- Frontend dev server: `yarn dev:frontend`
- Backend dev server: `yarn dev:backend`
- Build all workspaces: `yarn build`
- Type-check all workspaces: `yarn ts:check`
- Lint all workspaces: `yarn lint`
- Format (root): `yarn format`
- Prettier check: `yarn prettier:check`
- Fix TypeScript + Prettier: `yarn fix:all`
- Backend specific:
  - Build: `yarn workspace @carbon-aware-llm/backend build`
  - Start built: `yarn workspace @carbon-aware-llm/backend start`
  - Test: `yarn workspace @carbon-aware-llm/backend test`
  - TypeORM CLI (example): `yarn workspace @carbon-aware-llm/backend migration:run`
- Frontend specific:
  - Build: `yarn workspace @carbon-aware-llm/frontend build`
  - Lint: `yarn workspace @carbon-aware-llm/frontend lint`
  - Type-check: `yarn workspace @carbon-aware-llm/frontend tsc`