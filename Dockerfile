# Multi-stage build to optimize Docker image

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml* ./

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN pnpm build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for better signal handling
RUN apk add --no-cache dumb-init curl

# Install only production dependencies
COPY package*.json pnpm-lock.yaml* ./

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod && \
    pnpm cache clean

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create logs directory (for development, won't persist in production)
RUN mkdir -p /app/logs && \
    chmod -R 755 /app/logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port (will be overridden by Railway PORT env var)
EXPOSE 8080

# Health check using curl (Railway compatible)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Use dumb-init for better process management
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
