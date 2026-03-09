import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { errors } from '../lib/error-handler';
import { aiRateLimiter } from '../lib/rate-limiter';
import { aiJobQueue } from '../workers/queue';
import { jobCache, rateLimit } from '../lib/redis-client';
import { AIJobType, AIJobStatus, ProjectStage, UserPlan } from '@prisma/client';
import { checkRegenerationLimit, incrementRegenerationCount, checkRateLimit as checkPlanRateLimit } from '../services/plan-guardrails';

const router = Router();

/**
 * AI Job API Routes
 *
 * Architecture:
 * - All AI jobs (including ROOM_WALKTHROUGH / video generation) are enqueued to Redis BullMQ.
 * - The backend Redis worker (npm run queue:worker) processes jobs from the ai-jobs queue.
 * - Job status is cached in Redis for fast polling.
 * - Persistent job records stored in PostgreSQL.
 */

// ============================================
// Validation Schemas
// ============================================

const createJobSchema = z.object({
  type: z.nativeEnum(AIJobType),
  projectId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
});

/**
 * Map AI job type to project stage for regeneration tracking
 */
function getStageFromJobType(jobType: AIJobType): ProjectStage | null {
  switch (jobType) {
    case 'MOODBOARD':
      return 'MOODBOARD';
    case 'ELEVATION':
    case 'INTERIOR_ISOMETRIC':
      return 'ELEVATION';
    case 'TWO_D_VIEWS':
      return 'TWO_D_VIEWS';
    case 'COMPONENT_EXTRACTION':
      return 'COMPONENT';
    case 'ROOM_WALKTHROUGH':
      return 'ROOM_WALKTHROUGH';
    case 'INTERIOR':
      return 'INTERIOR';
    default:
      return null;
  }
}

// ============================================
// BullMQ Job Type Mapping
// ============================================
// Maps AIJobType to BullMQ job names (same as AIJobType for simplicity)

// ============================================
// Routes
// ============================================

// GET /api/jobs - List user's jobs
router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { 
      status, 
      type, 
      projectId,
      page = '1', 
      limit = '20' 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    // Parse status - can be comma-separated for multiple values (e.g., "QUEUED,PROCESSING")
    let statusFilter: AIJobStatus | { in: AIJobStatus[] } | undefined;
    if (status) {
      const statusValues = (status as string).split(',').map(s => s.trim()) as AIJobStatus[];
      statusFilter = statusValues.length > 1 
        ? { in: statusValues }
        : statusValues[0];
    }

    // Build where clause
    const where: {
      userId: string;
      status?: AIJobStatus | { in: AIJobStatus[] };
      type?: AIJobType;
      projectId?: string;
    } = {
      userId,
      ...(statusFilter && { status: statusFilter }),
      ...(type && { type: type as AIJobType }),
      ...(projectId && { projectId: projectId as string }),
    };

    const [jobs, total] = await Promise.all([
      prisma.aIJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          type: true,
          status: true,
          projectId: true,
          payload: true,  // Include payload for roomId etc
          processingTimeMs: true,
          error: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.aIJob.count({ where }),
    ]);

    res.json({
      success: true,
      data: jobs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/jobs/active - Get currently active jobs
router.get('/active', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.query;

    const jobs = await prisma.aIJob.findMany({
      where: {
        userId,
        status: { in: ['QUEUED', 'PROCESSING'] },
        ...(projectId && { projectId: projectId as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Enrich with cached progress if available
    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => {
        const cached = await jobCache.getStatus(job.id);
        return {
          ...job,
          progress: cached?.progress || 0,
        };
      })
    );

    res.json({
      success: true,
      data: enrichedJobs,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/jobs/:id - Get job status
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Check Redis cache first for fast response
    const cached = await jobCache.getStatus(id);
    
    // Fetch from database for complete data
    const job = await prisma.aIJob.findFirst({
      where: { id, userId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!job) {
      throw errors.notFound('Job');
    }

    // Include stage and message from cache for live progress updates
    const cachedResult = cached?.result as { stage?: string; message?: string } | undefined;
    
    res.json({
      success: true,
      data: {
        ...job,
        progress: cached?.progress || (job.status === 'COMPLETED' ? 100 : 0),
        stage: cachedResult?.stage || null,
        message: cachedResult?.message || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/jobs/:id/stream - SSE endpoint for live job progress updates
router.get('/:id/stream', async (req, res) => {
  const userId = req.userId!;
  const { id } = req.params;

  // Verify job belongs to user
  const job = await prisma.aIJob.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });

  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Send initial status
  const sendUpdate = async () => {
    const cached = await jobCache.getStatus(id);
    const currentJob = await prisma.aIJob.findUnique({
      where: { id },
      select: {
        status: true,
        error: true,
        result: true,
        completedAt: true,
      },
    });

    if (!currentJob) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Job not found' })}\n\n`);
      res.end();
      return false;
    }

    const progress = cached?.progress || (currentJob.status === 'COMPLETED' ? 100 : 0);
    const cachedResult = cached?.result as { stage?: string; message?: string } | undefined;
    const stage = cachedResult?.stage || null;
    const message = cachedResult?.message || null;

    res.write(`data: ${JSON.stringify({
      type: 'progress',
      status: currentJob.status,
      progress,
      stage,
      message,
      error: currentJob.error,
    })}\n\n`);

    // Return true if job is still running
    return currentJob.status === 'QUEUED' || currentJob.status === 'PROCESSING';
  };

  // Send initial update
  const stillRunning = await sendUpdate();
  
  if (!stillRunning) {
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
    return;
  }

  // Poll for updates every 1 second
  const intervalId = setInterval(async () => {
    try {
      const stillRunning = await sendUpdate();
      if (!stillRunning) {
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
        clearInterval(intervalId);
        res.end();
      }
    } catch (error) {
      logger.error('SSE update error', { jobId: id, error });
      clearInterval(intervalId);
      res.end();
    }
  }, 1000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
  });
});

// POST /api/jobs - Create new AI job
router.post('/', aiRateLimiter, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const user = req.user!;
    const input = createJobSchema.parse(req.body);

    // Check rate limit (additional to middleware)
    // Increased to 50/minute to support multi-room moodboard generation
    const rateLimitKey = `ai:${userId}`;
    const { allowed, remaining } = await rateLimit.check(rateLimitKey, 50, 60);
    
    if (!allowed) {
      throw errors.tooManyRequests('AI generation limit reached. Please wait before trying again.');
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Get user's active subscription and plan
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    const userPlan = subscription?.plan || (user.plan as UserPlan) || UserPlan.FREE;

    // Check regeneration limit for unlimited plans
    if (userPlan === UserPlan.NEW_YEAR_UNLIMITED_2025) {
      // Determine if this is a regeneration (check if completed job exists for this type)
      const existingJob = await prisma.aIJob.findFirst({
        where: {
          projectId: input.projectId,
          type: input.type,
          status: 'COMPLETED',
          ...(input.roomId && { payload: { path: ['roomId'], equals: input.roomId } }),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingJob) {
        // This is a regeneration - check limit
        const stage = getStageFromJobType(input.type);
        if (stage) {
          await checkRegenerationLimit(
            userId,
            input.projectId,
            stage
          );
        }
      }

      // Check rate limit for unlimited plan users
      await checkPlanRateLimit(userId, 'JOB_CREATE');
    }

    // If roomId provided, verify it exists
    if (input.roomId) {
      const room = await prisma.room.findFirst({
        where: { id: input.roomId, projectId: input.projectId },
      });
      if (!room) {
        throw errors.notFound('Room');
      }
    }

    // Generate job ID
    const jobId = uuidv4();

    // Create job record
    const job = await prisma.aIJob.create({
      data: {
        id: jobId,
        userId,
        projectId: input.projectId,
        type: input.type,
        status: 'QUEUED',
        payload: input.payload as object,
      },
    });

    // Enqueue to BullMQ
    try {
      const bullmqJobId = await enqueueToBullMQ(
        input.type,
        jobId,
        {
          ...input.payload,
          userId,
          jobId,
          projectId: input.projectId,
          roomId: input.roomId ?? (input.payload as { roomId?: string }).roomId,
        }
      );

      logger.info({
        jobId,
        type: input.type,
        userId,
        projectId: input.projectId,
        bullmqJobId,
      }, 'AI job created and enqueued to BullMQ');

    } catch (queueError) {
      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: 'Failed to enqueue job',
        },
      });

      logger.error({ error: queueError, jobId }, 'Failed to enqueue job to BullMQ');
      throw errors.internal('Failed to create job.');
    }

    // Cache initial status
    await jobCache.setStatus(jobId, { status: 'QUEUED', progress: 0 });

    res.status(201).json({
      success: true,
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        projectId: job.projectId,
        createdAt: job.createdAt,
        remainingRateLimit: remaining,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/jobs/:id/cancel - Cancel a queued job
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const job = await prisma.aIJob.findFirst({
      where: { id, userId },
    });

    if (!job) {
      throw errors.notFound('Job');
    }

    if (job.status === 'PROCESSING') {
      throw errors.badRequest('Cannot cancel a job that is currently processing');
    }

    if (job.status !== 'QUEUED') {
      throw errors.badRequest(`Cannot cancel job with status: ${job.status}`);
    }

    await prisma.aIJob.update({
      where: { id },
      data: { status: 'FAILED', error: 'Cancelled by user' },
    });

    // Invalidate cache
    await jobCache.setStatus(id, { status: 'CANCELLED' });

    logger.info({ jobId: id, userId }, 'AI job cancelled');

    res.json({
      success: true,
      data: { 
        id, 
        status: 'CANCELLED',
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/jobs/:id/retry - Retry a failed job
router.post('/:id/retry', aiRateLimiter, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const originalJob = await prisma.aIJob.findFirst({
      where: { id, userId },
    });

    if (!originalJob) {
      throw errors.notFound('Job');
    }

    if (originalJob.status !== 'FAILED') {
      throw errors.badRequest('Only failed jobs can be retried');
    }

    // Create new job as retry
    const newJobId = uuidv4();

    const newJob = await prisma.aIJob.create({
      data: {
        id: newJobId,
        userId,
        projectId: originalJob.projectId,
        type: originalJob.type,
        status: 'QUEUED',
        payload: originalJob.payload as object,
        retryCount: originalJob.retryCount + 1,
      },
    });

    // Enqueue to BullMQ
    await enqueueToBullMQ(
      originalJob.type,
      newJobId,
      {
        ...(originalJob.payload as object),
        userId,
        jobId: newJobId,
        projectId: originalJob.projectId,
        isRetry: true,
        originalJobId: id,
      }
    );

    await jobCache.setStatus(newJobId, { status: 'QUEUED', progress: 0 });

    logger.info({
      jobId: newJobId,
      originalJobId: id,
      userId,
      retryCount: newJob.retryCount,
    }, 'AI job retried');

    res.status(201).json({
      success: true,
      data: newJob,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Helper Functions
// ============================================

/**
 * Enqueue job to BullMQ Redis queue
 * 
 * @param jobType - AIJobType enum value
 * @param jobId - Unique job identifier
 * @param payload - Job payload data
 * @returns BullMQ job ID
 */
async function enqueueToBullMQ(
  jobType: AIJobType,
  jobId: string,
  payload: Record<string, unknown>
): Promise<string> {
  try {
    const job = await aiJobQueue.add(
      jobType, // Job name (same as type)
      payload, // Job data
      {
        jobId, // Use our UUID as BullMQ job ID
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 60 * 60, // 24 hours
        },
        removeOnFail: {
          count: 500,
          age: 7 * 24 * 60 * 60, // 7 days
        },
      }
    );

    logger.info({
      jobId,
      jobType,
      bullmqJobId: job.id,
    }, 'Job enqueued to BullMQ');

    return job.id as string;
  } catch (error) {
    logger.error({
      jobId,
      jobType,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to enqueue job to BullMQ');
    throw error;
  }
}

export { router as jobsRouter };
