/**
 * TatvaOps Vision - Sense Layer Service
 * 
 * Business logic for Intent Graph creation and management.
 * Handles input processing, deduplication, caching, and AI job orchestration.
 */

import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { cache, cacheKeys } from '../../lib/redis';
import { aiJobQueue } from '../../workers/queue';
import { errors } from '../../lib/error-handler';
import {
  IntentGraphInput,
  InferredIntent,
  IntentGraph,
  SenseInferenceJobPayload,
} from './sense.types';

/**
 * Generate SHA256 hash for input deduplication
 */
export function generateInputHash(inputs: IntentGraphInput): string {
  // Sort arrays to ensure consistent hashing
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

/**
 * Check Redis cache for existing inference result
 */
export async function checkCache(inputHash: string): Promise<InferredIntent | null> {
  try {
    const cached = await cache.get<InferredIntent>(cacheKeys.intentHash(inputHash));
    if (cached) {
      logger.info({ inputHash }, 'Intent inference cache hit');
      return cached;
    }
    return null;
  } catch (error) {
    logger.error({ error, inputHash }, 'Failed to check intent cache');
    return null;
  }
}

/**
 * Process input and create Intent Graph
 * 
 * Flow:
 * 1. Generate input hash
 * 2. Check cache for existing inference
 * 3. Check database for existing Intent Graph
 * 4. If not found, create AIJob and enqueue to BullMQ (Redis)
 * 5. Return jobId for polling
 */
export async function processInput(
  userId: string,
  projectId: string,
  inputs: IntentGraphInput
): Promise<{ jobId?: string; intentGraphId?: string; fromCache: boolean }> {
  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
  });

  if (!project) {
    throw errors.notFound('Project');
  }

  // Generate input hash for deduplication
  const inputHash = generateInputHash(inputs);

  // Check if Intent Graph already exists for this project
  const existing = await prisma.intentGraph.findUnique({
    where: { projectId },
  });

  if (existing) {
    logger.info({ projectId, intentGraphId: existing.id }, 'Intent Graph already exists');
    return { intentGraphId: existing.id, fromCache: true };
  }

  // Check cache by input hash
  const cachedInference = await checkCache(inputHash);
  if (cachedInference) {
    // Create Intent Graph from cached inference
    const intentGraph = await buildIntentGraph(
      userId,
      projectId,
      inputs,
      cachedInference,
      inputHash
    );

    logger.info({ projectId, intentGraphId: intentGraph.id }, 'Intent Graph created from cache');
    return { intentGraphId: intentGraph.id, fromCache: true };
  }

  // No cache hit - enqueue inference job
  const jobId = await enqueueInferenceJob(userId, projectId, inputs);

  logger.info({ projectId, jobId }, 'Sense inference job enqueued');
  return { jobId, fromCache: false };
}

/**
 * Build and persist Intent Graph
 */
export async function buildIntentGraph(
  userId: string,
  projectId: string,
  inputs: IntentGraphInput,
  inferred: InferredIntent,
  inputHash?: string
): Promise<IntentGraph> {
  const intentGraph = await prisma.intentGraph.create({
    data: {
      projectId,
      userId,
      inputs: inputs as any,
      inferred: inferred as any,
      constraints: {},
      priorities: {
        style: 0.8,
        cost: 0.5,
        speed: 0.5,
      },
      confidence: inferred.confidence,
      version: 1,
      inputHash,
    },
  });

  // Cache Intent Graph by projectId
  await cache.set(
    cacheKeys.intentGraph(projectId),
    intentGraph,
    7 * 24 * 60 * 60 // 7 days
  );

  logger.info({ intentGraphId: intentGraph.id, projectId }, 'Intent Graph created');

  return intentGraph as unknown as IntentGraph;
}

/**
 * Enqueue sense inference job via BullMQ (Redis)
 */
export async function enqueueInferenceJob(
  userId: string,
  projectId: string,
  inputs: IntentGraphInput
): Promise<string> {
  // Create AI job record
  const job = await prisma.aIJob.create({
    data: {
      projectId,
      userId,
      type: 'SENSE_INFERENCE',
      status: 'QUEUED',
      payload: { inputs } as any,
    },
  });

  // Enqueue to BullMQ (Redis)
  const payload: SenseInferenceJobPayload = {
    jobId: job.id,
    userId,
    projectId,
    inputs,
  };

  await aiJobQueue.add('SENSE_INFERENCE', payload, {
    jobId: job.id,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });

  return job.id;
}

/**
 * Get Intent Graph by projectId
 */
export async function getIntentGraph(
  userId: string,
  projectId: string
): Promise<IntentGraph | null> {
  // Check cache first
  const cached = await cache.get<IntentGraph>(cacheKeys.intentGraph(projectId));
  if (cached) {
    return cached;
  }

  // Fetch from database
  const intentGraph = await prisma.intentGraph.findFirst({
    where: { projectId, userId },
  });

  if (!intentGraph) {
    return null;
  }

  // Cache for future requests
  await cache.set(
    cacheKeys.intentGraph(projectId),
    intentGraph,
    7 * 24 * 60 * 60 // 7 days
  );

  return intentGraph as unknown as IntentGraph;
}

/**
 * Refine Intent Graph with user corrections
 */
export async function refineIntent(
  userId: string,
  projectId: string,
  refinements: Partial<InferredIntent>
): Promise<IntentGraph> {
  const existing = await prisma.intentGraph.findFirst({
    where: { projectId, userId },
  });

  if (!existing) {
    throw errors.notFound('Intent Graph');
  }

  const currentInferred = existing.inferred as unknown as InferredIntent;
  const updatedInferred: InferredIntent = {
    ...currentInferred,
    ...refinements,
    // Preserve arrays if not provided in refinements
    styleSignals: {
      ...currentInferred.styleSignals,
      ...refinements.styleSignals,
    },
    componentPreferences: {
      ...currentInferred.componentPreferences,
      ...refinements.componentPreferences,
    },
    changeBoundaries: {
      ...currentInferred.changeBoundaries,
      ...refinements.changeBoundaries,
    },
    lifestyleSignals: {
      ...currentInferred.lifestyleSignals,
      ...refinements.lifestyleSignals,
    },
  };

  const updated = await prisma.intentGraph.update({
    where: { id: existing.id },
    data: {
      inferred: updatedInferred as any,
      confidence: refinements.confidence || existing.confidence,
      version: existing.version + 1,
    },
  });

  // Invalidate cache
  await cache.del(cacheKeys.intentGraph(projectId));

  logger.info({ intentGraphId: updated.id, projectId }, 'Intent Graph refined');

  return updated as unknown as IntentGraph;
}

/**
 * Delete Intent Graph
 */
export async function deleteIntentGraph(
  userId: string,
  projectId: string
): Promise<void> {
  const existing = await prisma.intentGraph.findFirst({
    where: { projectId, userId },
  });

  if (!existing) {
    throw errors.notFound('Intent Graph');
  }

  await prisma.intentGraph.delete({
    where: { id: existing.id },
  });

  // Invalidate cache
  await cache.del(cacheKeys.intentGraph(projectId));

  logger.info({ intentGraphId: existing.id, projectId }, 'Intent Graph deleted');
}
