/**
 * TatvaOps Vision - Think Layer Service
 * 
 * Business logic for Spatial Plan creation and management.
 * Orchestrates spatial reasoning, caching, and job enqueueing.
 */

import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { cache, cacheKeys } from '../../lib/redis';
import { queueProducers } from '../../lib/sqs';
import { errors } from '../../lib/error-handler';
import { SpatialPlanBuilder } from './spatial-plan.builder';
import {
  CreateSpatialPlanRequest,
  SpatialPlanData,
  SpatialPlanningJobPayload,
} from './think.types';

/**
 * Generate SHA256 hash for input deduplication
 */
export function generateInputHash(intentGraphId: string, options: { useFloorPlan: boolean }): string {
  const normalized = {
    intentGraphId,
    useFloorPlan: options.useFloorPlan,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');
}

/**
 * Check Redis cache for existing spatial plan
 */
export async function checkCache(inputHash: string): Promise<SpatialPlanData | null> {
  try {
    const cached = await cache.get<SpatialPlanData>(cacheKeys.spatialPlanHash(inputHash));
    if (cached) {
      logger.info({ inputHash }, 'Spatial plan cache hit');
      return cached;
    }
    return null;
  } catch (error) {
    logger.error({ error, inputHash }, 'Failed to check spatial plan cache');
    return null;
  }
}

/**
 * Create spatial plan from intent graph
 * 
 * Flow:
 * 1. Verify Intent Graph exists
 * 2. Generate input hash
 * 3. Check cache for existing plan
 * 4. Check database for existing SpatialPlan
 * 5. If not found, create AIJob and enqueue to SQS
 * 6. Return jobId for polling or spatialPlanId if cached
 */
export async function createSpatialPlan(
  userId: string,
  request: CreateSpatialPlanRequest
): Promise<{ jobId?: string; spatialPlanId?: string; readiness?: number; fromCache: boolean }> {
  const { projectId, intentGraphId, options = {} } = request;
  const useFloorPlan = options.useFloorPlan !== false; // Default true
  const forceRegenerate = options.forceRegenerate === true;

  logger.info('Creating spatial plan', {
    userId,
    projectId,
    intentGraphId,
    useFloorPlan,
    forceRegenerate,
  });

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
    include: {
      intentGraph: true,
      rooms: true,
    },
  });

  if (!project) {
    throw errors.notFound('Project');
  }

  // Verify Intent Graph
  if (!project.intentGraph || project.intentGraph.id !== intentGraphId) {
    throw errors.badRequest('Intent Graph not found or does not belong to this project');
  }

  // Generate input hash for deduplication
  const inputHash = generateInputHash(intentGraphId, { useFloorPlan });

  // Check if SpatialPlan already exists for this project
  if (!forceRegenerate) {
    const existing = await prisma.spatialPlan.findUnique({
      where: { projectId },
    });

    if (existing) {
      logger.info({ projectId, spatialPlanId: existing.id }, 'SpatialPlan already exists');
      return {
        spatialPlanId: existing.id,
        readiness: existing.readiness,
        fromCache: true,
      };
    }

    // Check cache by input hash
    const cachedPlan = await checkCache(inputHash);
    if (cachedPlan) {
      // Create SpatialPlan from cached data
      const spatialPlan = await buildSpatialPlan(
        userId,
        projectId,
        intentGraphId,
        cachedPlan,
        inputHash
      );

      logger.info({ spatialPlanId: spatialPlan.id }, 'SpatialPlan created from cache');

      return {
        spatialPlanId: spatialPlan.id,
        readiness: spatialPlan.readiness,
        fromCache: true,
      };
    }
  }

  // Create AI job for spatial planning
  const job = await prisma.aIJob.create({
    data: {
      userId,
      projectId,
      type: 'SPATIAL_PLANNING',
      status: 'QUEUED',
      payload: {
        intentGraphId,
        useFloorPlan,
      },
    },
  });

  logger.info({ jobId: job.id }, 'Spatial planning job created');

  // Enqueue job to SQS
  // Note: Using existing interior queue with spatialPlanId flag
  // Or we could create a separate spatial planning queue
  const payload: SpatialPlanningJobPayload = {
    jobId: job.id,
    userId,
    projectId,
    intentGraphId,
    options: { useFloorPlan },
  };

  // For now, we'll process synchronously in the service
  // In production, this would be enqueued to SQS
  try {
    const spatialPlan = await processSpatialPlanningJob(payload);
    
    return {
      spatialPlanId: spatialPlan.id,
      readiness: spatialPlan.readiness,
      fromCache: false,
    };
  } catch (error) {
    logger.error({ error, jobId: job.id }, 'Spatial planning failed');
    
    // Update job status
    await prisma.aIJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw errors.internal('Spatial planning failed');
  }
}

/**
 * Process spatial planning job (synchronous for now)
 * In production, this would be handled by a worker
 */
async function processSpatialPlanningJob(
  payload: SpatialPlanningJobPayload
): Promise<{ id: string; readiness: number }> {
  const { jobId, userId, projectId, intentGraphId, options = {} } = payload;

  logger.info('Processing spatial planning job', { jobId, projectId });

  // Update job status
  await prisma.aIJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  // Fetch Intent Graph and rooms
  const intentGraph = await prisma.intentGraph.findUnique({
    where: { id: intentGraphId },
  });

  if (!intentGraph) {
    throw new Error('Intent Graph not found');
  }

  const rooms = await prisma.room.findMany({
    where: { projectId },
  });

  // Build spatial plan
  const builder = new SpatialPlanBuilder();
  const spatialPlanData = await builder.buildFromIntent(
    intentGraph.inferred as any,
    options.useFloorPlan ? rooms : null,
    { useFloorPlan: options.useFloorPlan || false }
  );

  // Generate input hash
  const inputHash = generateInputHash(intentGraphId, { useFloorPlan: options.useFloorPlan || false });

  // Save spatial plan to database
  const spatialPlan = await buildSpatialPlan(
    userId,
    projectId,
    intentGraphId,
    spatialPlanData,
    inputHash
  );

  // Cache the spatial plan
  try {
    await cache.set(
      cacheKeys.spatialPlanHash(inputHash),
      spatialPlanData,
      30 * 24 * 60 * 60 // 30 days
    );
    logger.debug('Spatial plan cached', { inputHash });
  } catch (error) {
    logger.warn({ error }, 'Failed to cache spatial plan');
  }

  // Update job status
  await prisma.aIJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      result: { spatialPlanId: spatialPlan.id, readiness: spatialPlan.readiness },
    },
  });

  logger.info('Spatial planning job completed', {
    jobId,
    spatialPlanId: spatialPlan.id,
    readiness: spatialPlan.readiness,
  });

  // If readiness > 0.7, enqueue rendering job
  if (spatialPlan.readiness > 0.7) {
    await enqueuePart3Rendering(userId, projectId, spatialPlan.id);
  }

  return { id: spatialPlan.id, readiness: spatialPlan.readiness };
}

/**
 * Build and persist SpatialPlan to database
 */
async function buildSpatialPlan(
  userId: string,
  projectId: string,
  intentGraphId: string,
  spatialPlanData: SpatialPlanData,
  inputHash: string
) {
  const spatialPlan = await prisma.spatialPlan.create({
    data: {
      projectId,
      intentGraphId,
      userId,
      roomPlans: spatialPlanData.rooms as any,
      componentPlan: spatialPlanData.componentPlan as any,
      lightingPlan: spatialPlanData.lightingPlan as any,
      walkthrough: spatialPlanData.walkthrough as any,
      constraints: spatialPlanData.constraints as any,
      readiness: spatialPlanData.confidence,
      version: 1,
      inputHash,
    },
  });

  return spatialPlan;
}

/**
 * Enqueue Part 3 rendering job if readiness threshold met
 */
async function enqueuePart3Rendering(
  userId: string,
  projectId: string,
  spatialPlanId: string
): Promise<void> {
  logger.info('Enqueueing Part 3 rendering', { projectId, spatialPlanId });

  // Create AIJob for rendering
  const job = await prisma.aIJob.create({
    data: {
      userId,
      projectId,
      type: 'INTERIOR',
      status: 'QUEUED',
      payload: {
        spatialPlanId,
        source: '3d_walkthrough',
      },
    },
  });

  // Enqueue to interior-view-generation queue
  // This will be handled in phase 4 (SQS update)
  logger.debug('Rendering job created', { jobId: job.id });
}

/**
 * Get spatial plan by project ID
 */
export async function getSpatialPlan(
  userId: string,
  projectId: string
): Promise<any> {
  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
  });

  if (!project) {
    throw errors.notFound('Project');
  }

  const spatialPlan = await prisma.spatialPlan.findUnique({
    where: { projectId },
    include: {
      intentGraph: true,
    },
  });

  if (!spatialPlan) {
    throw errors.notFound('SpatialPlan');
  }

  return spatialPlan;
}

/**
 * Delete spatial plan
 */
export async function deleteSpatialPlan(
  userId: string,
  projectId: string
): Promise<void> {
  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId, deletedAt: null },
  });

  if (!project) {
    throw errors.notFound('Project');
  }

  await prisma.spatialPlan.deleteMany({
    where: { projectId },
  });

  logger.info({ projectId }, 'SpatialPlan deleted');
}
