# Backend Dockerfile for Carbon-Aware LLM Proxy
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies with retry
RUN apk add --no-cache python3 make g++ || \
    (sleep 5 && apk add --no-cache python3 make g++)

# Copy package files
COPY package.json ./
COPY package-lock.json* ./
COPY tsconfig.json ./

# Install all dependencies for building (including dev dependencies)
RUN npm config set fund false && \
    npm config set audit-level moderate && \
    if [ -f package-lock.json ]; then npm ci --prefer-offline --no-audit; else npm install --prefer-offline --no-audit; fi && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install production dependencies only
RUN npm config set fund false && \
    npm config set audit-level moderate && \
    if [ -f package-lock.json ]; then npm ci --only=production --prefer-offline --no-audit; else npm install --only=production --prefer-offline --no-audit; fi && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy migration files (needed for runtime)
COPY --from=builder /app/dist/migrations ./src/migrations

# Copy scripts (CLI utilities)
COPY scripts/ ./scripts/

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
CMD ["node", "dist/index.js"]
