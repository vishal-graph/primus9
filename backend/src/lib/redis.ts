import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

/**
 * Redis Client
 * Used for caching, rate limiting, and queue state
 */
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error');
});

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  /**
   * Set cached value with optional TTL (in seconds)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Delete all keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  },
};

/**
 * Cache key generators
 */
export const cacheKeys = {
  project: (projectId: string) => `project:${projectId}`,
  projectRooms: (projectId: string) => `project:${projectId}:rooms`,
  room: (roomId: string) => `room:${roomId}`,
  jobStatus: (jobId: string) => `job:${jobId}:status`,
  aiResult: (type: string, hash: string) => `ai:${type}:${hash}`,
  // Sense Layer (3D Walkthrough - Part 1)
  intentHash: (hash: string) => `intent:hash:${hash}`,
  intentGraph: (projectId: string) => `intent:graph:${projectId}`,
  senseInference: (jobId: string) => `sense:inference:${jobId}`,

  // Think Layer (3D Walkthrough - Part 2)
  spatialPlanHash: (inputHash: string) => `spatial:hash:${inputHash}`,
  spatialPlan: (projectId: string) => `spatial:plan:${projectId}`,
  spatialPlanning: (jobId: string) => `spatial:planning:${jobId}`,
};

