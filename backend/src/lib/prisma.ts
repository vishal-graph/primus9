/**
 * Prisma Client Instance
 * 
 * Singleton pattern to prevent multiple instances in development
 * due to hot reloading.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Extend global type for Node.js
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create client with logging configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });
};

// Use singleton in development to prevent connection pool exhaustion
export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Log slow queries (> 100ms)
prisma.$on('query' as never, (e: { query: string; duration: number }) => {
  if (e.duration > 100) {
    logger.warn({
      query: e.query,
      duration: e.duration,
    }, 'Slow database query detected');
  }
});

/**
 * Connect to database with retry logic
 */
export async function connectDatabase(retries = 5): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      logger.info('✅ Database connected successfully');
      return;
    } catch (error) {
      logger.error({ error, attempt }, `Database connection failed (attempt ${attempt}/${retries})`);
      
      if (attempt === retries) {
        throw new Error('Failed to connect to database after multiple attempts');
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

/**
 * Health check for database
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

