# Supabase Migration Cleanup Summary

## Scope
- Removed all TypeORM/Postgres runtime code paths from the backend and replaced them with Supabase equivalents.
- Eliminated legacy environment flags (`SKIP_DB`, `DATABASE_MODE`) and related bootstrap logic.
- Deleted obsolete TypeORM entities, migrations, database utilities, and data-migration scripts.
- Refactored modal deployment scripts, OAuth integration, routing presence checks, and seed utilities to use Supabase services.
- Added typed Supabase models for shared deployment/user data and refreshed package dependencies accordingly.

## Tooling & Documentation
- Pruned TypeORM dependencies and scripts from backend/package metadata; ran `yarn install` to update the lockfile.
- Updated the Makefile to remove Postgres-specific commands, replacing them with Supabase-focused modal deployment and sync targets.
- Revised README architecture, prerequisites, setup steps, quick commands, deployment guidance, schema management, and acknowledgments to reflect the Supabase-only stack.

## Verification
- Executed `yarn workspace @carbon-aware-llm/backend test --passWithNoTests` (no tests present, command configured to pass).
