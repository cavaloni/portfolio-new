# Backend Dockerfile for Carbon-Aware LLM Proxy (Yarn workspaces)
# Multi-stage build for optimized production image using Yarn 4

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# System deps and Corepack (Yarn)
RUN apk add --no-cache python3 make g++ && corepack enable

# Copy root Yarn config and lockfile
COPY .yarn/ .yarn/
COPY .yarnrc.yml package.json yarn.lock ./

# Pre-copy backend workspace manifest and tsconfig
COPY packages/backend/package.json packages/backend/package.json
COPY packages/backend/tsconfig.json packages/backend/tsconfig.json

# Install all workspaces 
RUN yarn install

# Copy backend source and scripts
COPY packages/backend/src packages/backend/src
COPY packages/backend/scripts packages/backend/scripts

# Build the backend workspace
RUN yarn workspace @carbon-aware-llm/backend build

# Production stage
FROM node:20-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && adduser -S backend -u 1001

# Set working directory
WORKDIR /app

# Install runtime deps
RUN apk add --no-cache dumb-init && corepack enable

# Copy root Yarn config and lockfile
COPY .yarn/ .yarn/
COPY .yarnrc.yml package.json yarn.lock ./

# Copy backend workspace manifest
COPY packages/backend/package.json packages/backend/package.json

# Install dependencies for production
RUN yarn workspaces focus @carbon-aware-llm/backend

# Copy built application from builder stage
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Ensure mock assets are present at runtime
COPY --from=builder /app/packages/backend/src/mocks ./packages/backend/dist/mocks

# Change ownership to app user
RUN chown -R backend:nodejs /app
USER backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "packages/backend/dist/index.js"]
