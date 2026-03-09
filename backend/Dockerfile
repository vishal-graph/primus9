# TatvaOps Vision - Backend API Dockerfile
# Multi-stage build for optimized production image

# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM node:20-alpine AS deps
WORKDIR /app

# Build context is the repo root; source files live in backend/
COPY backend/package.json backend/package-lock.json* ./
COPY backend/prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

# ==========================================
# Stage 2: Builder
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

# Install ALL dependencies (dev + prod) so tsc is available
COPY backend/package.json backend/package-lock.json* ./
COPY backend/prisma ./prisma/
RUN npm ci

COPY backend/ .

# Regenerate Prisma client (ensures it's up-to-date with schema)
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ==========================================
# Stage 3: Runner (Production)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install OpenSSL for Prisma (fixes libssl detection warning)
RUN apk add --no-cache openssl openssl-dev

# Set environment
ENV NODE_ENV production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Set correct ownership
RUN chown -R expressjs:nodejs /app
USER expressjs

# Expose port (only used for API server)
EXPOSE 4000

# Health check - conditional based on MODE
# For API: checks if HTTP server responds
# For Worker: checks if node process is running (workers don't have HTTP endpoints)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD sh -c "if [ \"$MODE\" = \"worker\" ]; then ps | grep -q '[n]ode' || exit 1; else wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1; fi"

# Start script that supports both API and Worker modes
# Set MODE=worker to run BullMQ worker, otherwise runs API server
CMD sh -c "if [ \"$MODE\" = \"worker\" ]; then node dist/workers/index.js; else node dist/index.js; fi"

