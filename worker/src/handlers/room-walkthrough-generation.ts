/**
 * TatvaOps Vision - Room Walkthrough Video Generation Handler (Runway only)
 *
 * Flow: Frontend trigger → POST /api/jobs (ROOM_WALKTHROUGH) → BullMQ → this handler →
 *       generateWalkthrough (Runway image-to-video) → S3 upload → RoomWalkthroughVideo create →
 *       job COMPLETED. Frontend polls GET /api/jobs?type=ROOM_WALKTHROUGH&status=QUEUED,PROCESSING
 *       and GET /api/projects/:id/walkthroughs for videos.
 *
 * Requires: RUNWAY_API_KEY in env (same process as queue:worker, e.g. backend/.env);
 *           room with 2D bird's-eye view; moodboard; project isometric elevation.
 */

import { Message } from '@aws-sdk/client-sqs';
import { logger } from '../lib/logger';
import { getPrisma } from '../lib/prisma';
import { config } from '../config';
import { validateJobGuardrails } from '../services/plan-guardrails';
import { uploadToS3, generateSignedUrl } from '../lib/s3';
import { generateWalkthrough } from '../design-engine/walkthrough';

const prisma = getPrisma();

interface WalkthroughJobPayload {
  jobId: string;
  projectId: string;
  roomId: string;
  userId: string;
  version?: number;
}

export async function handleRoomWalkthroughGeneration(
  message: Message
): Promise<boolean> {
  const requestId = message.MessageId || 'unknown';

  logger.info('Processing room walkthrough generation job', {
    requestId,
    messageId: message.MessageId,
  });

  let jobId: string | undefined;
  let projectId: string | undefined;
  let roomId: string | undefined;
  let userId: string | undefined;

  try {
    if (!message.Body) {
      logger.error('Empty message body');
      return true;
    }

    let rawPayload: any;
    try {
      rawPayload = JSON.parse(message.Body);
    } catch (parseError) {
      logger.error('Failed to parse message body', {
        requestId,
        error: String(parseError),
        body: message.Body?.substring(0, 200),
      });
      return true;
    }

    const payload: WalkthroughJobPayload = rawPayload.payload || rawPayload;
    jobId = payload.jobId;
    projectId = payload.projectId;
    roomId = payload.roomId;
    userId = payload.userId;
    const version = payload.version || 1;

    if (!jobId || !projectId || !roomId || !userId) {
      logger.error('Missing required fields in payload', {
        requestId,
        jobId,
        projectId,
        roomId,
        userId,
      });
      return true;
    }

    logger.info('Processing room walkthrough generation', {
      requestId,
      jobId,
      projectId,
      roomId,
      version,
    });

    const isRegeneration = version > 1;

    // Validate guardrails
    const guardrails = await validateJobGuardrails(
      userId,
      projectId,
      'ROOM_WALKTHROUGH',
      isRegeneration
    );

    if (!guardrails.allowed) {
      logger.warn('Plan guardrails validation failed', {
        jobId,
        userId,
        projectId,
        error: guardrails.error,
      });

      await updateJobStatus(jobId, 'FAILED', {
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: guardrails.error || 'Plan limit exceeded',
        },
      });

      return true;
    }

    await updateJobStatus(jobId, 'PROCESSING');

    // Fetch room with moodboard
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        moodboards: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!room) {
      logger.error('Room not found', { jobId, roomId });
      await updateJobStatus(jobId, 'FAILED', {
        error: { code: 'ROOM_NOT_FOUND', message: `Room not found: ${roomId}` },
      });
      return true;
    }

    // Validate moodboard
    const moodboard = room.moodboards[0];
    if (!moodboard || !moodboard.s3Key) {
      logger.error('Missing moodboard for room', { jobId, roomId });
      await updateJobStatus(jobId, 'FAILED', {
        error: { code: 'MISSING_MOODBOARD', message: 'No moodboard found for this room' },
      });
      return true;
    }

    // Fetch isometric elevation
    const isometricElevation = await prisma.isometricFloorElevation.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    if (!isometricElevation || !isometricElevation.s3Key) {
      logger.error('Missing isometric elevation', { jobId, projectId });
      await updateJobStatus(jobId, 'FAILED', {
        error: { code: 'MISSING_ELEVATION', message: 'No elevation found for this project' },
      });
      return true;
    }

    // Fetch 2D views: prefer single BIRD_VIEW (latest); fallback to legacy 4 wall views
    const twoDViews = await prisma.room2DView.findMany({
      where: { roomId },
      orderBy: [{ version: 'desc' }],
    });

    const birdView = twoDViews.find((v) => (v.viewType as string) === 'BIRD_VIEW' && v.s3Key);
    const wallViews = twoDViews.filter(
      (v) =>
        (v.viewType as string) !== 'CEILING_VIEW' &&
        (v.viewType as string) !== 'BIRD_VIEW' &&
        v.s3Key
    );

    const viewsToUse = birdView ? [birdView] : wallViews;
    if (viewsToUse.length === 0) {
      logger.error('No 2D views found for room', { jobId, roomId });
      await updateJobStatus(jobId, 'FAILED', {
        error: { code: 'MISSING_2D_VIEWS', message: 'No 2D views found for this room' },
      });
      return true;
    }

    if (!config.runwayApiKey?.trim()) {
      logger.error('RUNWAY_API_KEY is not set', { jobId });
      await updateJobStatus(jobId, 'FAILED', {
        error: { code: 'RUNWAY_NOT_CONFIGURED', message: 'RUNWAY_API_KEY is required for walkthrough generation' },
      });
      return true;
    }

    const firstViewS3Key = viewsToUse[0].s3Key!;
    const firstViewSignedUrl = await generateSignedUrl(
      config.s3BucketRenders,
      firstViewS3Key,
      2 * 3600
    );

    const result = await generateWalkthrough({
      roomName: room.name,
      roomType: room.type,
      dimensions: (room.metadata as any)?.areaEstimate
        ? { area: (room.metadata as any).areaEstimate }
        : undefined,
      moodboardS3Key: moodboard.s3Key,
      elevationS3Key: isometricElevation.s3Key,
      twoDViewS3Keys: viewsToUse.map((v) => v.s3Key!),
      s3Bucket: config.s3BucketMoodboards,
      rendersBucket: config.s3BucketRenders,
      runwayApiKey: config.runwayApiKey,
      firstViewSignedUrl,
    });

    // Resolve next version for this room (after generation) so re-pressing generate creates v2, v3, ...
    const latestVideo = await prisma.roomWalkthroughVideo.findFirst({
      where: { roomId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const actualVersion = (latestVideo?.version ?? 0) + 1;
    logger.info('Walkthrough version for room', { roomId, actualVersion });

    const bucket = config.s3BucketRenders;
    const versionSuffix = actualVersion > 1 ? `/v${actualVersion}` : '';
    const s3Key = `projects/${projectId}/rooms/${roomId}/walkthrough${versionSuffix}/walkthrough.mp4`;
    await uploadToS3({
      bucket,
      key: s3Key,
      body: result.videoData,
      contentType: 'video/mp4',
      metadata: {
        jobId,
        projectId,
        roomId,
        resolution: result.resolution,
        duration: String(result.durationSeconds),
        modelVersion: 'runway-gen4.5',
      },
    });

    // Generate a public/signed URL for the video
    const videoUrl = await generateSignedUrl(bucket, s3Key, 7 * 24 * 3600);

    // Save to database
    await prisma.roomWalkthroughVideo.create({
      data: {
        roomId,
        videoUrl,
        s3Key,
        resolution: result.resolution,
        duration: result.durationSeconds,
        version: actualVersion,
        moodboardId: moodboard.id,
        elevationId: isometricElevation.id,
        twoDViewIds: viewsToUse.map((v) => v.id),
        jobId,
        modelVersion: 'runway-gen4-turbo',
        generationTimeMs: result.generationTimeMs,
      },
    });

    // Update job as completed
    await updateJobStatus(jobId, 'COMPLETED', {
      result: {
        roomId,
        s3Key,
        resolution: result.resolution,
        durationSeconds: result.durationSeconds,
        generationTimeMs: result.generationTimeMs,
      },
    });

    logger.info('Room walkthrough generation completed', {
      jobId,
      roomId,
      resolution: result.resolution,
      generationTimeMs: result.generationTimeMs,
    });

    return true;
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || String(error),
      stack: error?.stack,
    };

    logger.error(
      {
        requestId,
        jobId,
        error: errorDetails,
      },
      'Room walkthrough generation failed'
    );

    const errorMessage = String(error?.message || '');
    const isRetryable = !(
      errorMessage.includes('Room not found') ||
      errorMessage.includes('Missing moodboard') ||
      errorMessage.includes('Missing elevation') ||
      errorMessage.includes('No 2D views') ||
      errorMessage.includes('No moodboard') ||
      errorMessage.includes('RUNWAY_API_KEY') ||
      errorMessage.includes('RUNWAY_NOT_CONFIGURED') ||
      errorMessage.includes('Runway task FAILED') ||
      errorMessage.includes('Runway task CANCELED') ||
      errorMessage.includes('Runway API error')
    );

    if (jobId) {
      await updateJobStatus(jobId, 'FAILED', {
        error: errorDetails,
      });
    }

    return !isRetryable;
  }
}

async function updateJobStatus(
  jobId: string,
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  data?: { result?: object; error?: object }
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
          error: JSON.stringify(data?.error),
          retryCount: {
            increment: 1,
          },
        }),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to update job status', {
      jobId,
      status,
      error: String(error),
    });
  }
}
