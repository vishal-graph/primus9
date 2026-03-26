/**
 * TatvaOps Vision - Sense Inference Worker Handler
 * 
 * Processes sense-inference SQS jobs.
 * Downloads images, calls Gemini for intent inference, stores Intent Graph.
 */

import { Message } from '@aws-sdk/client-sqs';
import { inferIntent, IntentInferenceInput } from '../design-engine/sense/inferIntent';
import { InferredIntent } from '../design-engine/sense/responseParser';
import { DesignEngineError } from '../design-engine/types';
import { logger } from '../lib/logger';
import crypto from 'crypto';
import { getPrisma } from '../lib/prisma';

const prisma = getPrisma();

// ============================================
// JOB PAYLOAD TYPE
// ============================================

interface SenseInferenceJobPayload {
  jobId: string;
  userId: string;
  projectId: string;
  inputs: IntentInferenceInput;
}

// ============================================
// HANDLER
// ============================================

/**
 * Handle sense-inference SQS message
 * 
 * Flow:
 * 1. Parse message payload
 * 2. Update job status to PROCESSING
 * 3. Call design engine to infer intent
 * 4. Store Intent Graph in database
 * 5. Cache result in Redis
 * 6. Update job status to COMPLETED
 * 
 * @param message - SQS message
 * @returns True if processed successfully
 */
export async function handleSenseInference(message: Message): Promise<boolean> {
  const requestId = message.MessageId || 'unknown';
  
  logger.info('Processing sense-inference job', {
    requestId,
    messageId: message.MessageId,
  });

  // Parse message body
  let rawPayload: any;
  try {
    rawPayload = JSON.parse(message.Body || '{}');
  } catch (error) {
    logger.error('Failed to parse message body', {
      requestId,
      error,
      body: message.Body,
    });
    return false; // Invalid message format, don't retry
  }

  // Extract payload from queue message wrapper
  const payload = rawPayload.payload as SenseInferenceJobPayload;

  if (!payload || !payload.jobId || !payload.userId || !payload.projectId || !payload.inputs) {
    logger.error('Invalid payload structure', {
      requestId,
      payload,
    });
    return false; // Invalid payload, don't retry
  }

  const { jobId, userId, projectId, inputs } = payload;

  try {
    // Update job status to PROCESSING
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    logger.info('Job marked as PROCESSING', { jobId });

    // Call design engine to infer intent
    const result = await inferIntent(inputs);

    logger.info('Intent inference completed', {
      jobId,
      confidence: result.inferred.confidence,
      spaceType: result.inferred.spaceType,
      processingTimeMs: result.processingTimeMs,
    });

    // Generate input hash for deduplication
    const inputHash = generateInputHash(inputs);

    // Check if Intent Graph already exists
    const existing = await prisma.intentGraph.findUnique({
      where: { projectId },
    });

    if (existing) {
      // Update existing Intent Graph
      await prisma.intentGraph.update({
        where: { id: existing.id },
        data: {
          inputs: inputs as any,
          inferred: result.inferred as any,
          confidence: result.inferred.confidence,
          version: existing.version + 1,
          inputHash,
          updatedAt: new Date(),
        },
      });

      logger.info('Intent Graph updated', {
        jobId,
        intentGraphId: existing.id,
        version: existing.version + 1,
      });
    } else {
      // Create new Intent Graph
      await prisma.intentGraph.create({
        data: {
          projectId,
          userId,
          inputs: inputs as any,
          inferred: result.inferred as any,
          constraints: {},
          priorities: {
            style: 0.8,
            cost: 0.5,
            speed: 0.5,
          },
          confidence: result.inferred.confidence,
          version: 1,
          inputHash,
        },
      });

      logger.info('Intent Graph created', { jobId, projectId });
    }

    // Cache inference result in Redis for deduplication
    // Note: Redis client import is optional, graceful degradation
    try {
      const { redisClient } = await import('../lib/redis-client');
      if (redisClient.isAvailable()) {
        // Use setJobStatus with a custom key pattern for inference caching
        // Since redisClient doesn't expose raw set, we'll skip caching for now
        // This is a temporary limitation until we extend the redis client
        logger.debug('Redis caching for intent not implemented yet');
      }
    } catch (redisError) {
      logger.warn({ redisError }, 'Failed to cache inference result in Redis');
      // Continue processing even if Redis fails
    }

    // Update job status to COMPLETED
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        processingTimeMs: result.processingTimeMs,
        result: result.inferred as any,
      },
    });

    logger.info('Job completed successfully', {
      jobId,
      processingTimeMs: result.processingTimeMs,
    });

    return true;
  } catch (error) {
    logger.error({ error, jobId }, 'Sense inference job failed');

    // Determine if error is retryable
    const isRetryable = error instanceof DesignEngineError && error.retryable;

    // Update job status to FAILED
    try {
      const job = await prisma.aIJob.findUnique({ where: { id: jobId } });
      if (job) {
        const newRetryCount = (job.retryCount || 0) + 1;
        const shouldRetry = isRetryable && newRetryCount < (job.maxRetries || 3);

        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: shouldRetry ? 'QUEUED' : 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: newRetryCount,
            completedAt: shouldRetry ? undefined : new Date(),
          },
        });

        logger.info('Job marked as FAILED', {
          jobId,
          retryCount: newRetryCount,
          willRetry: shouldRetry,
        });
      }
    } catch (updateError) {
      logger.error({ updateError, jobId }, 'Failed to update job status');
    }

    // Return true if should retry (SQS will re-deliver), false otherwise
    return isRetryable;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate SHA256 hash for input deduplication
 */
function generateInputHash(inputs: IntentInferenceInput): string {
  const normalized = {
    images: inputs.images?.sort() || [],
    floorPlan: inputs.floorPlan || '',
    moodboards: inputs.moodboards?.sort() || [],
    text: inputs.text?.trim() || '',
    hints: inputs.hints || {},
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');
}
