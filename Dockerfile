# Primus9 Backend - Dockerfile (repo root context)
# Multi-stage build for optimized production image

# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies only when needed
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

# Build Worker package first
# It has its own package.json and needs to be compiled to dist/
COPY worker/package.json worker/package-lock.json* ./worker/
# The worker needs the prisma schema to generate its own client types
COPY backend/prisma/ ./worker/prisma/
RUN cd worker && npm ci
COPY worker/ ./worker/
RUN cd worker && npx prisma generate
RUN cd worker && npm run build

# Install ALL dependencies (dev + prod) for Backend so tsc is available
COPY backend/package.json backend/package-lock.json* ./backend/
COPY backend/prisma ./backend/prisma/
RUN cd backend && npm ci

COPY backend/ ./backend/

# Regenerate Prisma client (ensures it's up-to-date with schema)
RUN cd backend && npx prisma generate

# Build TypeScript for Backend
RUN cd backend && npm run build

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

# Copy backend files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/prisma ./prisma

# Copy built worker files so backend can require them at ../worker/dist/handlers
COPY --from=builder /app/worker/dist /worker/dist
COPY --from=builder /app/worker/node_modules /worker/node_modules

# Set correct ownership
RUN chown -R expressjs:nodejs /app
USER expressjs

# Expose port (only used for API server)
EXPOSE 4000

# Health check - conditional based on MODE
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD sh -c "if [ \"$MODE\" = \"worker\" ]; then ps | grep -q '[n]ode' || exit 1; else wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1; fi"

# Start script that supports both API and Worker modes
CMD sh -c "if [ \"$MODE\" = \"worker\" ]; then node dist/workers/index.js; else node dist/index.js; fi"
