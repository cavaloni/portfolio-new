# Task Completion Checklist

## Before Committing Code
1. **Type Checking**: Run `yarn ts:check` from root to ensure no TypeScript errors
2. **Code Formatting**: Run `yarn prettier:fix` to format all files
3. **Linting**: Run `yarn lint` to check for code quality issues
4. **Testing**: Run `yarn test` to ensure all tests pass

## Database Changes
- If entity changes: Generate and run migration with `yarn migration:generate`
- Test migration rollback capability
- Update seed data if needed

## API Changes
- Update TypeScript types in `src/types/`
- Test endpoints manually or with curl
- Update frontend service layers if needed

## Component Changes
- Ensure responsive design works on mobile
- Test accessibility with keyboard navigation
- Verify dark/light theme compatibility

## Deployment Readiness
- Environment variables updated in `.env.example`
- Docker builds successfully
- Modal deployments work with `yarn deploy:modal`
- Health endpoints return 200

## Quick Fix Command
```bash
# Run this from project root to fix common issues
yarn fix:all
```

## System Requirements
- Node.js 18+
- Docker and Docker Compose for local development
- PostgreSQL 13+ and Redis 6+ (or use Docker)
- Modal CLI for worker deployments