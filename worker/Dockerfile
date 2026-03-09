# TatvaOps Vision - Worker Service Dockerfile
# Multi-stage build for optimized production image
# Follows Prisma recommended best practices

# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM node:20-slim AS deps
WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json* ./

RUN npm ci --only=production

# ==========================================
# Stage 2: Builder
# ==========================================
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL (required by Prisma) and Canvas dependencies
# Canvas requires: cairo, pango, libjpeg, giflib, librsvg
# Must be installed BEFORE npm ci to compile native modules
RUN apt-get update && apt-get install -y \
  openssl \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  pkg-config \
  python3 \
  && rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (including devDependencies for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy Prisma schema and generate Prisma client
# Generate inside Docker container (not on host) - Prisma best practice
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ==========================================
# Stage 3: Runner (Production)
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app

# Install runtime dependencies:
# - OpenSSL: required by Prisma
# - Cairo, Pango, etc.: required by canvas (native PDF rendering)
RUN apt-get update && apt-get install -y \
  openssl \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libjpeg62-turbo \
  libgif7 \
  librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

# Set environment
ENV NODE_ENV production

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 worker

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Set correct ownership
RUN chown -R worker:nodejs /app
USER worker

# No port exposed - worker consumes from SQS

# Health check via process
# Workers don't have HTTP endpoints, so we check if the process is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD pgrep -x node || exit 1

# Start the worker
CMD ["node", "dist/index.js"]

