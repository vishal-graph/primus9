import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { config } from '../config';
import { logger } from '../lib/logger';

/**
 * BullMQ Queue Configuration
 * Redis-backed queue for async AI processing
 * 
 * Replaces AWS SQS for better local development and lower latency
 */

import IORedis from 'ioredis';

/**
 * BullMQ must not share one IORedis between Worker and Queue/QueueEvents:
 * the worker uses blocking Redis commands; multiplexing causes ECONNRESET and stalls.
 * @see https://docs.bullmq.io/guide/connections
 */
function createBullRedisConnection(role: string): IORedis {
  const client = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
    family: 0,
    enableReadyCheck: false,
    connectTimeout: 30_000,
    retryStrategy(times) {
      if (times > 100) return null;
      return Math.min(times * 200, 8_000);
    },
    reconnectOnError(err) {
      const msg = err.message || '';
      if (msg.includes('READONLY')) return true;
      if (msg.includes('ECONNRESET')) return true;
      return false;
    },
  });
  client.on('error', (err) => {
    logger.warn({ err: err.message, role }, 'BullMQ Redis TCP error (will retry if strategy allows)');
  });
  client.on('close', () => {
    logger.debug({ role }, 'BullMQ Redis connection closed');
  });
  return client;
}

const queueConnection = createBullRedisConnection('queue');
const queueEventsConnection = createBullRedisConnection('queue-events');

logger.info(
  {
    hasPassword: /\b:[^:@]+@/.test(config.redisUrl) || config.redisUrl.includes('default:'),
    tls: config.redisUrl.startsWith('rediss://'),
  },
  'Redis connection config for BullMQ (separate clients for queue / events / worker)'
);

/**
 * AI Job Queue
 * Handles all async AI processing jobs
 * 
 * Job types: FLOORPLAN_ANALYSIS, MOODBOARD, ELEVATION, INTERIOR_ISOMETRIC,
 *            INTERIOR, COMPONENT_UPDATE, PDF_EXPORT, SENSE_INFERENCE
 */
export const aiJobQueue = new Queue('ai-jobs', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s delay
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 60 * 60, // 7 days
    },
  },
});

/**
 * Queue Events for monitoring
 */
export const aiJobEvents = new QueueEvents('ai-jobs', { connection: queueEventsConnection });

aiJobEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info({ jobId, hasResult: !!returnvalue }, '[BullMQ] Job completed');
});

aiJobEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, reason: failedReason }, '[BullMQ] Job failed');
});

aiJobEvents.on('stalled', ({ jobId }) => {
  logger.warn({ jobId }, '[BullMQ] Job stalled - may be processed by another worker');
});

aiJobEvents.on('waiting', ({ jobId }) => {
  logger.debug({ jobId }, '[BullMQ] Job waiting in queue');
});

aiJobEvents.on('active', ({ jobId }) => {
  logger.info({ jobId }, '[BullMQ] Job started processing');
});

aiJobEvents.on('progress', ({ jobId, data }) => {
  logger.debug({ jobId, progress: data }, '[BullMQ] Job progress update');
});

/**
 * Create worker instance
 * Called from worker process
 */
export function createAIWorker(concurrency: number = 3) {
  logger.info({ concurrency }, 'Creating BullMQ worker');

  const workerConnection = createBullRedisConnection('worker');

  const worker = new Worker(
    'ai-jobs',
    async (job: Job) => {
      logger.info({ 
        jobId: job.id, 
        type: job.name, 
        attemptsMade: job.attemptsMade,
        attemptsLimit: job.opts.attempts,
      }, '[BullMQ Worker] Processing AI job');

      try {
        // Import handlers dynamically to avoid circular dependencies
        const { processAIJob } = await import('./handlers');
        const result = await processAIJob(job);
        
        logger.info({ jobId: job.id, type: job.name }, '[BullMQ Worker] Job completed successfully');
        
        return result;
      } catch (error) {
        logger.error({ 
          jobId: job.id, 
          type: job.name, 
          error: error instanceof Error ? error.message : String(error),
          attemptsMade: job.attemptsMade,
        }, '[BullMQ Worker] Job processing error');
        throw error;
      }
    },
    {
      connection: workerConnection,
      concurrency, // Process up to N jobs concurrently
      // ROOM_WALKTHROUGH can take 5–10 min (gen4_turbo + upload + gen4_aleph poll). Keep lock long enough to avoid "could not renew lock".
      lockDuration: 15 * 60 * 1000, // 15 minutes (default 30s was too short)
      lockRenewTime: 2 * 60 * 1000, // renew lock every 2 minutes
      limiter: {
        max: 10,
        duration: 60 * 1000, // 10 jobs per minute max (rate limiting)
      },
    }
  );

  // Add worker event listeners for better monitoring
  worker.on('ready', () => {
    logger.info('[BullMQ Worker] Ready to process jobs');
  });

  worker.on('error', (error) => {
    logger.error({ error: error.message }, '[BullMQ Worker] Worker error');
  });

  worker.on('closed', () => {
    logger.info('[BullMQ Worker] Worker closed');
  });

  return worker;
}

/**
 * Graceful shutdown helper
 */
export async function closeQueues() {
  await aiJobQueue.close();
  await aiJobEvents.close();
  await Promise.all([
    queueConnection.quit().catch(() => queueConnection.disconnect()),
    queueEventsConnection.quit().catch(() => queueEventsConnection.disconnect()),
  ]);
}

