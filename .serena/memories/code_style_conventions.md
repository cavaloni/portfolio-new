# Code Style and Conventions

## TypeScript Guidelines
- Strict TypeScript configuration with `noEmit` checks
- Explicit return types for functions
- Interface definitions for all data structures
- Zod schemas for API validation

## React/Frontend Conventions
- Functional components with hooks
- Custom hooks for business logic (`use-*` pattern)
- Service layer pattern for API calls
- Context providers for global state
- Tailwind CSS for styling with Radix UI components

## Backend Conventions
- Express.js with TypeScript
- Service layer architecture
- TypeORM entities with decorators
- Zod validation for request/response
- Pino logging throughout
- Rate limiting and security middleware

## File Naming
- kebab-case for files and directories
- PascalCase for React components
- camelCase for functions and variables
- UPPERCASE for constants and environment variables

## Import Organization
1. External libraries
2. Internal modules (services, types, etc.)
3. Relative imports
4. Type-only imports separated

## Error Handling
- Structured error responses with consistent format
- Try-catch blocks in async functions
- Graceful fallbacks for external service failures
- Logging for debugging and monitoring