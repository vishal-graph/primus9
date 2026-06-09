import { createAIWorker, closeQueues } from './queue';
import { logger } from '../lib/logger';
import { config } from '../config';

/**
 * Redis (BullMQ) AI Job Worker — primary worker process.
 *
 * Jobs are enqueued via backend API to Redis; this process pulls from the
 * ai-jobs queue and runs handler code from the worker package (../worker/dist/handlers).
 * Handlers receive a synthetic SQS-style message; they use process.env from this process
 * (e.g. RUNWAY_API_KEY, GEMINI_API_KEY, PRODUCT_CATALOG_DATABASE_URL from backend/.env).
 * Moodboards and TWO_D_VIEWS (3D bird view) load product catalog code from ../worker/dist.
 *
 * @see backend/src/workers/handlers.ts — dispatches to worker handlers
 * Note: Standalone SQS worker (worker/ run directly) is deprecated; use this Redis worker only.
 *
 * Usage: npm run queue:worker (from backend directory)
 */

logger.info('Starting AI job worker...');

const worker = createAIWorker(config.workerConcurrency);

worker.on('ready', () => {
  logger.info('Worker is ready to process jobs');
});

worker.on('active', (job) => {
  logger.info({ jobId: job.id, type: job.name }, 'Job started');
});

worker.on('completed', (job, result) => {
  logger.info(
    { jobId: job.id, type: job.name, hasResult: !!result },
    'Job completed successfully'
  );
});

worker.on('failed', (job, error) => {
  logger.error(
    { jobId: job?.id, type: job?.name, error: error.message },
    'Job failed'
  );
});

worker.on('error', (error) => {
  logger.error({ error }, 'Worker error');
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down worker...');
  await worker.close();
  await closeQueues();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('Worker process initialized');

// -- RENDER WEB SERVICE HACK --
// If this process is deployed as a Render *web* service (MODE=worker), Render scans PORT.
// Bind the dummy health server to PORT (or WORKER_PORT), not PORT+1.
import http from 'http';
function resolveWorkerHealthPort(): number {
  if (process.env.WORKER_PORT) {
    return parseInt(process.env.WORKER_PORT, 10);
  }
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10);
  }
  return 4001;
}
const port = resolveWorkerHealthPort();
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Worker is active');
});

server.on('error', (e: NodeJS.ErrnoException) => {
  if (e.code === 'EADDRINUSE') {
    logger.warn(`Dummy health check port ${port} is in use. Worker will continue without it (this is fine for local dev).`);
  } else {
    logger.error({ error: e }, 'Dummy health check server error');
  }
});

server.listen(port, () => {
  logger.info(`Dummy health check server listening on port ${port}`);
});
