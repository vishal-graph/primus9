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

// Create a dedicated Redis connection for BullMQ using the full URL connection string
// This guarantees that all username, password, and TLS configurations in the URL are respected
const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  family: 0, // Force IPv4/IPv6 heuristic (required for Upstash and some local IPs)
  enableReadyCheck: false,
});

logger.info({
  host: connection.host,
  port: connection.port,
  hasPassword: !!connection.password,
}, 'Redis connection config for BullMQ');

/**
 * AI Job Queue
 * Handles all async AI processing jobs
 * 
 * Job types: FLOORPLAN_ANALYSIS, MOODBOARD, ELEVATION, INTERIOR_ISOMETRIC,
 *            INTERIOR, COMPONENT_UPDATE, PDF_EXPORT, SENSE_INFERENCE
 */
export const aiJobQueue = new Queue('ai-jobs', {
  connection,
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
export const aiJobEvents = new QueueEvents('ai-jobs', { connection });

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
      connection,
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
}

