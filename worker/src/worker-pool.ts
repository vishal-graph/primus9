/**
 * TatvaOps Vision - Worker Pool
 * 
 * Manages SQS polling and concurrent job processing.
 * Routes jobs to appropriate handlers based on queue type.
 */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { logger } from './lib/logger';
import { config } from './config';

// Import handlers
import { handleMoodboardGeneration, cleanupMoodboardHandler } from './handlers/moodboard-generation';
import { handleFloorPlanAnalysis } from './handlers/floorplan-analysis';
import { handleElevationGeneration, cleanupElevationHandler } from './handlers/elevation-generation';
import { handleInteriorIsometricGeneration, cleanupIsometricHandler } from './handlers/interior-isometric-generation';
import { handleNotification } from './handlers/notification';
import { handlePdfExport, cleanupPdfExportHandler } from './handlers/pdf-export';
// TODO: Import other handlers as they are implemented
// import { handleComponentUpdate } from './handlers/component-update';

// ===========================================
// Types
// ===========================================

interface WorkerPoolOptions {
  concurrency: number;
  pollIntervalSeconds: number;
  queues: string[];
}

type QueueHandler = (message: Message) => Promise<boolean>;

// ===========================================
// Queue Configuration
// ===========================================

const queueUrls: Record<string, string | undefined> = {
  'floorplan-analysis': config.sqsQueueFloorplanAnalysis,
  'moodboard-generation': config.sqsQueueMoodboardGeneration,
  'interior-view-generation': config.sqsQueueInteriorViewGeneration,
  'component-update': config.sqsQueueComponentUpdate,
  'notification': config.sqsQueueNotification,
  'pdf-export': config.sqsQueuePdfExport,
};

/**
 * Smart handler that routes based on job type in payload.
 * 
 * ============================================================
 * ELEVATION → DEPRECATED (room-wise wall elevations)
 * INTERIOR_ISOMETRIC → NEW SOURCE OF TRUTH (full-floor view)
 * ============================================================
 */
async function routeInteriorViewJob(message: Message): Promise<boolean> {
  if (!message.Body) {
    logger.error('Empty message body in interior view router');
    return true;
  }

  try {
    const rawPayload = JSON.parse(message.Body);
    const payload = rawPayload.payload || rawPayload;
    const jobType = rawPayload.type || payload.type;

    // Route based on job type
    if (jobType === 'INTERIOR_ISOMETRIC') {
      logger.info('Routing to isometric handler (NEW)', { jobId: payload.jobId });
      return handleInteriorIsometricGeneration(message);
    } else if (jobType === 'ELEVATION') {
      logger.warn('Routing to deprecated elevation handler', { jobId: payload.jobId });
      return handleElevationGeneration(message);
    } else {
      // Default to isometric for new jobs
      logger.info('Unknown job type, defaulting to isometric handler', { jobType });
      return handleInteriorIsometricGeneration(message);
    }
  } catch (error) {
    logger.error('Failed to parse message for routing', { error: String(error) });
    return true; // Delete malformed message
  }
}

/**
 * Queue handlers mapping.
 * Maps queue names to their processing functions.
 */
const queueHandlers: Record<string, QueueHandler> = {
  'moodboard-generation': handleMoodboardGeneration,
  'floorplan-analysis': handleFloorPlanAnalysis,
  // Interior view queue now routes to appropriate handler based on job type
  'interior-view-generation': routeInteriorViewJob,
  'notification': handleNotification,
  'pdf-export': handlePdfExport,
  // TODO: Add handlers as they are implemented
  // 'component-update': handleComponentUpdate,
};

// Placeholder handlers for queues not yet implemented
async function placeholderHandler(message: Message): Promise<boolean> {
  logger.warn('No handler implemented for this queue', {
    messageId: message.MessageId,
    body: message.Body?.substring(0, 100),
  });
  return true; // Acknowledge to remove from queue
}

// ===========================================
// Worker Pool
// ===========================================

export class WorkerPool {
  private sqsClient: SQSClient;
  private options: WorkerPoolOptions;
  private isRunning = false;
  private activeJobs = 0;

  constructor(options: WorkerPoolOptions) {
    this.options = options;
    this.sqsClient = new SQSClient({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    });
  }

  /**
   * Start the worker pool.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker pool is already running');
      return;
    }

    this.isRunning = true;

    logger.info('Starting worker pool', {
      queues: this.options.queues,
      concurrency: this.options.concurrency,
      pollInterval: this.options.pollIntervalSeconds,
    });

    // Start polling each queue
    for (const queueName of this.options.queues) {
      const queueUrl = queueUrls[queueName];
      if (!queueUrl) {
        logger.warn(`No URL configured for queue: ${queueName}`);
        continue;
      }

      this.startPolling(queueName, queueUrl);
    }
  }

  /**
   * Stop the worker pool gracefully.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down worker pool...');
    this.isRunning = false;

    // Wait for active jobs to complete (with timeout)
    const maxWaitMs = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.activeJobs > 0 && Date.now() - startTime < maxWaitMs) {
      logger.info(`Waiting for ${this.activeJobs} active job(s) to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.activeJobs > 0) {
      logger.warn(`Shutdown timeout: ${this.activeJobs} job(s) still active`);
    }

    // Cleanup handlers
    await cleanupMoodboardHandler();
    await cleanupElevationHandler();
    await cleanupPdfExportHandler();
    await cleanupIsometricHandler();

    logger.info('Worker pool shut down');
  }

  /**
   * Start polling a specific queue.
   */
  private startPolling(queueName: string, queueUrl: string): void {
    const poll = async () => {
      if (!this.isRunning) {
        logger.debug(`Poll stopped for ${queueName}: worker not running`);
        return;
      }

      try {
        // Check if we have capacity
        if (this.activeJobs >= this.options.concurrency) {
          logger.debug(`At capacity (${this.activeJobs}/${this.options.concurrency}), waiting...`);
          // At capacity, wait briefly then try again
          setTimeout(() => {
            if (this.isRunning) {
              poll().catch((err) => {
                logger.error(`Unhandled error in poll for ${queueName}`, { error: String(err) });
              });
            }
          }, 100);
          return;
        }

        logger.debug(`Polling ${queueName}...`, { 
          activeJobs: this.activeJobs,
          capacity: this.options.concurrency 
        });

        const response = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: Math.min(10, this.options.concurrency - this.activeJobs),
            WaitTimeSeconds: 20, // Use SQS long polling (max 20 seconds) for immediate message delivery
            VisibilityTimeout: config.sqsVisibilityTimeout,
            AttributeNames: ['All'],
            MessageAttributeNames: ['All'],
          })
        );

        const messages = response.Messages || [];

        if (messages.length > 0) {
          logger.info(`Received ${messages.length} message(s) from ${queueName}`);

          // Process messages concurrently
          const processPromises = messages.map((message) =>
            this.processMessage(queueName, queueUrl, message)
          );

          await Promise.all(processPromises);
        } else {
          logger.debug(`No messages from ${queueName} (long poll completed)`);
        }

        // Immediately poll again after processing (continuous long polling)
        if (this.isRunning) {
          setImmediate(() => {
            poll().catch((err) => {
              logger.error(`Unhandled error in poll for ${queueName}`, { error: String(err) });
            });
          });
        }
      } catch (error) {
        logger.error(`Error in poll loop for ${queueName}`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          queueUrl,
        });
        
        // Retry after error
        if (this.isRunning) {
          setTimeout(() => {
            poll().catch((err) => {
              logger.error(`Unhandled error in poll retry for ${queueName}`, { error: String(err) });
            });
          }, 5000); // Wait 5s before retry after error
        }
      }
    };

    // Start polling immediately
    logger.info(`Starting poll loop for ${queueName}`);
    poll().catch((err) => {
      logger.error(`Failed to start poll for ${queueName}`, { error: String(err) });
    });

    logger.info(`Started polling queue: ${queueName}`);
  }

  /**
   * Process a single message.
   */
  private async processMessage(
    queueName: string,
    queueUrl: string,
    message: Message
  ): Promise<void> {
    const messageId = message.MessageId || 'unknown';
    const receiptHandle = message.ReceiptHandle;

    if (!receiptHandle) {
      logger.error('Message has no receipt handle', { messageId });
      return;
    }

    this.activeJobs++;

    logger.info('Processing message', {
      queueName,
      messageId,
      activeJobs: this.activeJobs,
    });

    try {
      // Get handler for this queue
      const handler = queueHandlers[queueName] || placeholderHandler;

      // Process the message
      const shouldDelete = await handler(message);

      if (shouldDelete) {
        // Delete message from queue
        await this.sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle,
          })
        );

        logger.debug('Message deleted from queue', {
          queueName,
          messageId,
        });
      } else {
        // Message will be retried after visibility timeout
        logger.debug('Message not deleted, will be retried', {
          queueName,
          messageId,
        });
      }
    } catch (error) {
      logger.error('Error processing message', {
        queueName,
        messageId,
        error: String(error),
      });

      // Let message become visible again for retry
      // Optionally, we could change visibility timeout here
    } finally {
      this.activeJobs--;
    }
  }

  /**
   * Extend visibility timeout for long-running jobs.
   */
  async extendVisibility(
    queueUrl: string,
    receiptHandle: string,
    seconds: number
  ): Promise<void> {
    try {
      await this.sqsClient.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: receiptHandle,
          VisibilityTimeout: seconds,
        })
      );
    } catch (error) {
      logger.error('Failed to extend message visibility', {
        error: String(error),
      });
    }
  }
}
