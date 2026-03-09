import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

/**
 * Worker Redis Client
 * 
 * Used for:
 * 1. Reporting job progress (shared with backend)
 * 2. Caching ephemeral data
 */

class RedisClient {
    private client: Redis | null = null;
    private isConnected: boolean = false;
    private maxConnectionAttempts: number = 3;

    constructor() {
        this.connect();
    }

    private connect(): void {
        try {
            // Use config.redisUrl if available, otherwise default to local
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

            this.client = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > this.maxConnectionAttempts) {
                        logger.warn('Redis max connection attempts reached, operating in degraded mode');
                        return null;
                    }
                    return Math.min(times * 100, 3000);
                },
                lazyConnect: true,
            });

            this.client.on('connect', () => {
                this.isConnected = true;
                logger.info('Redis connected');
            });

            this.client.on('error', (err) => {
                this.isConnected = false;
                logger.error({ err }, 'Redis connection error');
            });

            this.client.connect().catch((err) => {
                logger.warn({ err }, 'Redis initial connection failed');
            });

        } catch (err) {
            logger.error({ err }, 'Failed to initialize Redis client');
        }
    }

    isAvailable(): boolean {
        return this.isConnected && this.client !== null;
    }

    /**
     * Update job status in Redis (matches backend schema)
     * The result field contains stage and message for live progress updates
     */
    async setJobStatus(
        jobId: string,
        status: { status: string; progress?: number; stage?: string; message?: string }
    ): Promise<void> {
        if (!this.isAvailable()) return;

        try {
            const key = `job:${jobId}:status`;
            // Store stage and message in result field for backend compatibility
            const redisValue = {
                status: status.status,
                progress: status.progress,
                result: {
                    stage: status.stage,
                    message: status.message,
                },
            };
            await this.client!.set(key, JSON.stringify(redisValue), 'EX', 300); // 5 min TTL
        } catch (err) {
            logger.warn({ jobId, err }, 'Failed to update job status in Redis');
        }
    }

    /**
     * Disconnect
     */
    async quit(): Promise<void> {
        if (this.client) {
            await this.client.quit();
        }
    }
}

export const redisClient = new RedisClient();
