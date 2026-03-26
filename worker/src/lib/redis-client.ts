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

    constructor() {
        this.connect();
    }

    private connect(): void {
        try {
            const redisUrl = config.redisUrl;

            this.client = new Redis(redisUrl, {
                maxRetriesPerRequest: 20,
                enableReadyCheck: false,
                family: 0,
                connectTimeout: 30_000,
                lazyConnect: true,
                retryStrategy: (times) => {
                    if (times > 80) {
                        logger.warn('Redis reconnect attempts exhausted, operating in degraded mode');
                        return null;
                    }
                    return Math.min(times * 200, 5_000);
                },
                reconnectOnError(err) {
                    const m = err.message || '';
                    if (m.includes('READONLY') || m.includes('ECONNRESET')) return true;
                    return false;
                },
            });

            this.client.on('ready', () => {
                logger.info('Redis ready');
            });

            this.client.on('error', (err) => {
                logger.warn({ err: err.message }, 'Redis connection error');
            });

            this.client.on('close', () => {
                logger.debug('Redis connection closed');
            });

            this.client.connect().catch((err) => {
                logger.warn({ err: err instanceof Error ? err.message : err }, 'Redis initial connect failed');
            });
        } catch (err) {
            logger.error({ err }, 'Failed to initialize Redis client');
        }
    }

    isAvailable(): boolean {
        return this.client !== null && this.client.status === 'ready';
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
