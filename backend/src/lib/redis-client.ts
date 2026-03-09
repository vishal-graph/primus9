import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

/**
 * Redis Client with Graceful Degradation
 * 
 * Architecture Decision:
 * - Provides caching, rate limiting, and job status tracking
 * - Designed to fail gracefully - app continues if Redis is unavailable
 * - All operations have fallback behavior for resilience
 */

class RedisClient {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;

  constructor() {
    this.connect();
  }

  /**
   * Initialize Redis connection
   */
  private connect(): void {
    try {
      this.client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > this.maxConnectionAttempts) {
            logger.warn('Redis max connection attempts reached, operating in degraded mode');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
        lazyConnect: true,
        enableOfflineQueue: false, // Don't queue commands when disconnected
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        logger.info('Redis connected');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.error({ err }, 'Redis connection error');
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      // Attempt initial connection
      this.client.connect().catch((err) => {
        logger.warn({ err }, 'Redis initial connection failed, operating in degraded mode');
      });
    } catch (err) {
      logger.error({ err }, 'Failed to initialize Redis client');
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get value with fallback
   */
  async get<T>(key: string, fallback: T | null = null): Promise<T | null> {
    if (!this.isAvailable()) {
      logger.debug({ key }, 'Redis unavailable, returning fallback');
      return fallback;
    }

    try {
      const value = await this.client!.get(key);
      if (!value) return fallback;
      return JSON.parse(value) as T;
    } catch (err) {
      logger.warn({ key, err }, 'Redis GET failed, returning fallback');
      return fallback;
    }
  }

  /**
   * Set value with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.debug({ key }, 'Redis unavailable, skipping SET');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, serialized);
      } else {
        await this.client!.set(key, serialized);
      }
      return true;
    } catch (err) {
      logger.warn({ key, err }, 'Redis SET failed');
      return false;
    }
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.client!.del(key);
      return true;
    } catch (err) {
      logger.warn({ key, err }, 'Redis DEL failed');
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(...keys);
      }
      return true;
    } catch (err) {
      logger.warn({ pattern, err }, 'Redis DEL pattern failed');
      return false;
    }
  }

  /**
   * Check key existence
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      return (await this.client!.exists(key)) === 1;
    } catch (err) {
      logger.warn({ key, err }, 'Redis EXISTS failed');
      return false;
    }
  }

  /**
   * Increment counter (for rate limiting)
   */
  async incr(key: string, ttlSeconds?: number): Promise<number | null> {
    if (!this.isAvailable()) return null;

    try {
      const pipeline = this.client!.pipeline();
      pipeline.incr(key);
      if (ttlSeconds) {
        pipeline.expire(key, ttlSeconds);
      }
      const results = await pipeline.exec();
      return results?.[0]?.[1] as number;
    } catch (err) {
      logger.warn({ key, err }, 'Redis INCR failed');
      return null;
    }
  }

  /**
   * Set with NX (only if not exists) - for locks and deduplication
   */
  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isAvailable()) return true; // Fail open for locks

    try {
      const result = await this.client!.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      logger.warn({ key, err }, 'Redis SETNX failed');
      return true; // Fail open
    }
  }

  /**
   * Get raw Redis client (for advanced operations)
   */
  getRawClient(): Redis | null {
    return this.client;
  }
}

// Singleton instance
export const redisClient = new RedisClient();

/**
 * Check if Redis is connected (for health checks)
 */
export function isRedisConnected(): boolean {
  return redisClient.isAvailable();
}

/**
 * Connect to Redis (called on startup)
 */
export async function connectRedis(): Promise<void> {
  // Connection is already attempted in constructor
  // This just logs the current status
  if (redisClient.isAvailable()) {
    logger.info('✅ Redis connected');
  } else {
    logger.warn('⚠️ Redis not available, operating in degraded mode');
  }
}

/**
 * Disconnect from Redis (called on shutdown)
 */
export async function disconnectRedis(): Promise<void> {
  const client = redisClient.getRawClient();
  if (client) {
    await client.quit();
    logger.info('Redis disconnected');
  }
}

/**
 * Cache utilities with graceful degradation
 */
export const cache = {
  /**
   * Get cached value or execute fallback
   */
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await redisClient.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fallbackFn();
    await redisClient.set(key, value, ttlSeconds);
    return value;
  },

  /**
   * Invalidate cache by key
   */
  async invalidate(key: string): Promise<void> {
    await redisClient.del(key);
  },

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    await redisClient.delPattern(pattern);
  },
};

/**
 * Rate limiting utilities
 */
export const rateLimit = {
  /**
   * Check rate limit (sliding window)
   * Returns true if within limit, false if exceeded
   */
  async check(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `ratelimit:${identifier}`;
    
    // If Redis unavailable, allow request (fail open)
    if (!redisClient.isAvailable()) {
      return { allowed: true, remaining: limit, resetIn: windowSeconds };
    }

    const count = await redisClient.incr(key, windowSeconds);
    
    if (count === null) {
      // Redis error, fail open
      return { allowed: true, remaining: limit, resetIn: windowSeconds };
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return { allowed, remaining, resetIn: windowSeconds };
  },
};

/**
 * Request deduplication
 */
export const deduplication = {
  /**
   * Check if request is duplicate within window
   * Returns true if this is a NEW request (not duplicate)
   */
  async isUnique(
    identifier: string,
    windowSeconds: number = 60
  ): Promise<boolean> {
    const key = `dedup:${identifier}`;
    return redisClient.setNx(key, '1', windowSeconds);
  },
};

/**
 * Job status cache
 */
export const jobCache = {
  /**
   * Cache job status
   */
  async setStatus(
    jobId: string,
    status: { status: string; progress?: number; result?: unknown }
  ): Promise<void> {
    const key = `job:${jobId}:status`;
    await redisClient.set(key, status, 300); // 5 min cache
  },

  /**
   * Get cached job status
   */
  async getStatus(
    jobId: string
  ): Promise<{ status: string; progress?: number; result?: unknown } | null> {
    const key = `job:${jobId}:status`;
    return redisClient.get(key);
  },
};

/**
 * Cache key generators
 */
export const cacheKeys = {
  project: (projectId: string) => `project:${projectId}`,
  projectRooms: (projectId: string) => `project:${projectId}:rooms`,
  room: (roomId: string) => `room:${roomId}`,
  aiResult: (type: string, hash: string) => `ai:${type}:${hash}`,
  jobStatus: (jobId: string) => `job:${jobId}:status`,
};

