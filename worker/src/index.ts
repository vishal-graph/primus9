// ============================================================
// ❌ HARD DISABLE — This service is permanently deprecated
// ❌ DO NOT REMOVE THIS BLOCK
// ============================================================
// All job processing has been migrated to the BullMQ worker
// inside the backend service (backend/src/workers/).
//
// To run the worker: cd backend && npm run queue:worker
// ============================================================
console.error('❌ FATAL: Standalone SQS Worker is PERMANENTLY DISABLED.');
console.error('➡️  Use: cd backend && npm run queue:worker');
process.exit(1);

import { logger } from './lib/logger';
import { config } from './config';
import { WorkerPool } from './worker-pool';
import { shutdownManager } from './lib/shutdown';

/**
 * @deprecated Standalone SQS Worker Service — DEPRECATED
 *
 * This service is no longer the primary job processing path.
 * All job dispatch and processing has been migrated to BullMQ (Redis)
 * inside the backend service (`backend/src/workers/`).
 *
 * This worker is kept in place for:
 * - Reference / documentation
 * - Potential future cloud-native SQS migration
 *
 * DO NOT start this in production unless explicitly re-enabling SQS dispatch.
 * The backend BullMQ worker (`npm run queue:worker`) is the correct process to run.
 *
 * Original Architecture (SUPERSEDED):
 * - Dedicated service for AI job processing
 * - Consumed messages from AWS SQS queues
 * - Called Gemini API (AI secrets only here, not in frontend)
 * - Stored outputs to S3
 * - Updated job status in PostgreSQL
 * - Stateless design for horizontal scaling
 * - Emitted structured logs to CloudWatch
 */

async function main() {
  logger.info({
    service: config.serviceName,
    environment: config.nodeEnv,
    concurrency: config.workerConcurrency,
  }, 'Starting Worker Service');

  // Initialize worker pool
  const workerPool = new WorkerPool({
    concurrency: config.workerConcurrency,
    pollIntervalSeconds: config.workerPollInterval,
    queues: [
      'floorplan-analysis',
      'moodboard-generation',
      'interior-view-generation',
      'component-update',
      'notification',
      'pdf-export',
    ],
  });

  // Register shutdown handler
  shutdownManager.register(async () => {
    logger.info('Initiating graceful shutdown...');
    await workerPool.shutdown();
  });

  // Start processing
  try {
    await workerPool.start();
    logger.info('Worker pool started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start worker pool');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  process.exit(1);
});

main();
