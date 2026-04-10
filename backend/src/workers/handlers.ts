import { Job } from 'bullmq';
import { Message } from '@aws-sdk/client-sqs';
import { AIJobStatus } from '@prisma/client';
import path from 'path';
import { logger } from '../lib/logger';
import { config } from '../config';
import { prisma } from '../lib/prisma';

type SqsHandler = (message: Message) => Promise<boolean>;
type DirectHandler = (message: any, handlerLogger: typeof logger) => Promise<unknown>;

const workerHandlersBasePath = path.resolve(process.cwd(), '../worker/dist/handlers');

function loadWorkerHandler<T>(moduleFile: string, exportName: string): T {
  const modulePath = path.join(workerHandlersBasePath, `${moduleFile}.js`);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const handler = require(modulePath)?.[exportName] as T | undefined;

  if (!handler) {
    throw new Error(`Worker handler not found: ${moduleFile}#${exportName}`);
  }

  return handler;
}

const handleFloorPlanAnalysisSqs = () =>
  loadWorkerHandler<SqsHandler>('floorplan-analysis', 'handleFloorPlanAnalysis');
const handleMoodboardGenerationSqs = () =>
  loadWorkerHandler<SqsHandler>('moodboard-generation', 'handleMoodboardGeneration');
const handleInteriorIsometricGenerationSqs = () =>
  loadWorkerHandler<SqsHandler>(
    'interior-isometric-generation',
    'handleInteriorIsometricGeneration'
  );
const handleElevationGenerationSqs = () =>
  loadWorkerHandler<SqsHandler>('elevation-generation', 'handleElevationGeneration');
const handleRoom2DViewsGenerationSqs = () =>
  loadWorkerHandler<SqsHandler>('room-2d-views-generation', 'handleRoom2DViewsGeneration');
const handleComponentExtractionSqs = () =>
  loadWorkerHandler<SqsHandler>('component-extraction', 'handleComponentExtraction');
const handleRoomWalkthroughGenerationSqs = () =>
  loadWorkerHandler<SqsHandler>('room-walkthrough-generation', 'handleRoomWalkthroughGeneration');
const handlePdfExportSqs = () => loadWorkerHandler<SqsHandler>('pdf-export', 'handlePdfExport');
const handleNotificationSqs = () =>
  loadWorkerHandler<SqsHandler>('notification', 'handleNotification');
const handleSenseInferenceSqs = () =>
  loadWorkerHandler<SqsHandler>('sense-inference', 'handleSenseInference');
const handleInteriorViewGeneration = () =>
  loadWorkerHandler<DirectHandler>('interior-view-generation', 'handleInteriorViewGeneration');
const handleComponentUpdate = () =>
  loadWorkerHandler<DirectHandler>('component-update', 'handleComponentUpdate');

/**
 * AI Job Handlers (Redis / BullMQ)
 *
 * Wires BullMQ jobs to worker handler code (loaded from ../worker/dist/handlers).
 * Worker handlers expect an SQS-style Message; they run in this process and use
 * process.env (e.g. RUNWAY_API_KEY, GEMINI_API_KEY from backend/.env).
 *
 * Product catalog grounding (MOODBOARD, TWO_D_VIEWS): handlers in worker/dist use
 * PRODUCT_CATALOG_DATABASE_URL. Backend config sets process.env from backend/.env
 * at startup (see config/index.ts).
 *
 * SQS worker (standalone `node` in worker/) is deprecated; use `npm run queue:worker` only.
 */

interface JobData {
  userId: string;
  projectId?: string;
  roomId?: string;
  jobId: string;
  [key: string]: unknown;
}

function buildSqsMessage(
  jobId: string,
  type: string,
  payload: Record<string, unknown>,
  wrapPayload: boolean = true
): Message {
  const body = wrapPayload
    ? {
        type,
        payload,
        metadata: {
          jobId,
          timestamp: new Date().toISOString(),
        },
      }
    : payload;

  return {
    MessageId: jobId,
    Body: JSON.stringify(body),
  } as Message;
}

async function updateJobStatusSimple(
  jobId: string,
  status: AIJobStatus,
  data?: { result?: unknown; error?: string }
): Promise<void> {
  try {
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status,
        ...(status === 'PROCESSING' && { startedAt: new Date() }),
        ...(status === 'COMPLETED' && {
          completedAt: new Date(),
          result: data?.result as any,
        }),
        ...(status === 'FAILED' && {
          completedAt: new Date(),
          error: data?.error,
        }),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error({ jobId, status, error }, '[BullMQ Adapter] Failed to update job status');
  }
}

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

async function runSqsHandler(
  handler: (message: Message) => Promise<boolean>,
  jobId: string,
  type: string,
  payload: Record<string, unknown>,
  wrapPayload: boolean = true
): Promise<void> {
  const message = buildSqsMessage(jobId, type, payload, wrapPayload);
  let shouldDelete: boolean;
  try {
    shouldDelete = await handler(message);
  } catch (handlerError) {
    // If the handler itself throws (unexpected), let BullMQ retry
    throw handlerError;
  }

  if (!shouldDelete) {
    // shouldDelete=false means the handler determined this is transient and wants a retry.
    // shouldDelete=true means success or permanent failure (no retry needed).
    throw new Error(`Handler requested retry for ${type} job ${jobId}`);
  }
}

export async function processAIJob(job: Job<JobData>) {
  const jobType = String(job.name);
  const jobId = job.data.jobId || (job.id as string);
  const payload = {
    ...job.data,
    jobId,
  };

  logger.info({ jobId, jobType, bullmqJobId: job.id }, '[BullMQ Adapter] Dispatching job');

  switch (jobType) {
    case 'FLOORPLAN_ANALYSIS':
      await runSqsHandler(handleFloorPlanAnalysisSqs(), jobId, jobType, payload);
      return { success: true };
    case 'MOODBOARD':
      await runSqsHandler(handleMoodboardGenerationSqs(), jobId, jobType, payload);
      return { success: true };
    case 'INTERIOR_ISOMETRIC':
      await runSqsHandler(handleInteriorIsometricGenerationSqs(), jobId, jobType, payload);
      return { success: true };
    case 'ELEVATION':
      await runSqsHandler(handleElevationGenerationSqs(), jobId, jobType, payload);
      return { success: true };
    case 'TWO_D_VIEWS':
      await runSqsHandler(handleRoom2DViewsGenerationSqs(), jobId, jobType, payload);
      return { success: true };
    case 'COMPONENT_EXTRACTION':
      await runSqsHandler(handleComponentExtractionSqs(), jobId, jobType, payload);
      return { success: true };
    case 'ROOM_WALKTHROUGH':
      // Video generation (Runway): processed by this Redis worker only
      await runSqsHandler(handleRoomWalkthroughGenerationSqs(), jobId, jobType, payload);
      return { success: true };
    case 'PDF_EXPORT':
      await runSqsHandler(handlePdfExportSqs(), jobId, jobType, payload);
      return { success: true };
    case 'NOTIFICATION':
      await runSqsHandler(handleNotificationSqs(), jobId, jobType, payload, false);
      return { success: true };
    case 'SENSE_INFERENCE':
      await runSqsHandler(handleSenseInferenceSqs(), jobId, jobType, payload);
      return { success: true };
    case 'INTERIOR':
      await updateJobStatusSimple(jobId, 'PROCESSING');
      try {
        await handleInteriorViewGeneration()(
          {
            id: jobId,
            type: jobType,
            payload,
            metadata: {
              correlationId: jobId,
              timestamp: new Date().toISOString(),
            },
          },
          logger
        );
        await updateJobStatusSimple(jobId, 'COMPLETED', { result: { success: true } });
        return { success: true };
      } catch (error) {
        await updateJobStatusSimple(jobId, 'FAILED', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    case 'COMPONENT_UPDATE':
      await updateJobStatusSimple(jobId, 'PROCESSING');
      try {
        await handleComponentUpdate()(
          {
            id: jobId,
            type: jobType,
            payload,
            metadata: {
              correlationId: jobId,
              timestamp: new Date().toISOString(),
            },
          },
          logger
        );
        await updateJobStatusSimple(jobId, 'COMPLETED', { result: { success: true } });
        return { success: true };
      } catch (error) {
        await updateJobStatusSimple(jobId, 'FAILED', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

