/**
 * TatvaOps Vision - Room 3D Views Generation Handler (UI: "3D Views")
 *
 * Generates one corner bird's-eye render per room using Gemini WITH reference images:
 * moodboard (style parity) + full-floor isometric (layout/flow), plus optional enrichment text from floor-plan analysis.
 */

import { Message } from '@aws-sdk/client-sqs';
import { prismaClient as prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { config } from '../config';
import { validateJobGuardrails } from '../services/plan-guardrails';
import { uploadToS3, generateSignedUrl } from '../lib/s3';
import type { RoomElevationGeometry } from '../design-engine/elevation/types';
import {
  generateRoom2DViews,
  Room2DViewType,
} from '../design-engine/room-2d-views';

// Use singleton prisma client from ../lib/prisma

/**
 * Build room context for bird view. No geometry validation.
 * Primary reference: moodboard. Secondary: elevation.
 * Uses room name/type and optional dimensions from metadata/geometry.
 */
function buildRoomGeometryForBirdView(room: {
  id: string;
  name: string;
  type: string;
  geometry?: unknown;
  metadata?: unknown;
}): RoomElevationGeometry {
  const meta = (room.metadata || {}) as { areaEstimate?: number; ceilingHeight?: number };
  const geom = (room.geometry || {}) as { boundingBox?: { width?: number; height?: number }; dimensions?: { length?: number; width?: number } };
  const pixelToMeter = 0.05;
  let length = 4;
  let width = 3;
  if (geom.boundingBox && typeof geom.boundingBox.width === 'number' && typeof geom.boundingBox.height === 'number') {
    length = Math.max(1, geom.boundingBox.width * pixelToMeter);
    width = Math.max(1, geom.boundingBox.height * pixelToMeter);
  } else if (geom.dimensions && typeof geom.dimensions.length === 'number' && typeof geom.dimensions.width === 'number') {
    length = Math.max(1, geom.dimensions.length);
    width = Math.max(1, geom.dimensions.width);
  } else if (typeof meta.areaEstimate === 'number' && meta.areaEstimate > 0) {
    const side = Math.sqrt(meta.areaEstimate);
    length = side;
    width = side;
  }
  const ceilingHeight = typeof meta.ceilingHeight === 'number' && meta.ceilingHeight > 0 ? meta.ceilingHeight : 2.7;
  const minWall = (dir: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST', len: number) => ({
    direction: dir,
    length: len,
    ceilingHeight,
    openings: [],
    isExterior: false,
  });
  return {
    roomId: room.id,
    roomName: room.name,
    roomType: room.type,
    dimensions: { length, width, ceilingHeight, unit: 'meters' },
    walls: {
      north: minWall('NORTH', width),
      south: minWall('SOUTH', width),
      east: minWall('EAST', length),
      west: minWall('WEST', length),
    },
    geometryHash: `bird-${room.id}-${length}-${width}`,
  };
}

interface Room2DViewsJobPayload {
  jobId: string;
  projectId: string;
  roomId: string;
  userId: string;
  version?: number;
}

const VIEW_FILENAME_MAP: Record<Room2DViewType, string> = {
  BIRD_VIEW: 'bird-view',
  FRONT_WALL: 'front-wall',
  BACK_WALL: 'back-wall',
  LEFT_WALL: 'left-wall',
  RIGHT_WALL: 'right-wall',
  CEILING_VIEW: 'ceiling-view',
};

export async function handleRoom2DViewsGeneration(
  message: Message
): Promise<boolean> {
  const requestId = message.MessageId || 'unknown';

  logger.info('Processing room 2D views generation job', {
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

    const payload: Room2DViewsJobPayload = rawPayload.payload || rawPayload;
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

    logger.info('Processing room 2D views generation', {
      requestId,
      jobId,
      projectId,
      roomId,
      version,
    });

    const isRegeneration = version > 1;

    try {
      const guardrailResult = await validateJobGuardrails(userId, projectId, 'TWO_D_VIEWS', isRegeneration);
      if (!guardrailResult.allowed) {
        logger.warn('Plan guardrails validation failed', {
          jobId,
          userId,
          projectId,
          error: guardrailResult.error,
        });

        await updateJobStatus(jobId, 'FAILED', {
          error: {
            code: 'PLAN_LIMIT_EXCEEDED',
            message: guardrailResult.error || 'Plan limit exceeded',
          },
        });

        return true;
      }
    } catch (guardrailError: any) {
      logger.error({
        jobId,
        userId,
        projectId,
        error: guardrailError.message,
      }, 'Unexpected error during guardrail validation');

      await updateJobStatus(jobId, 'FAILED', {
        error: {
          code: 'GUARDRAIL_ERROR',
          message: 'Internal error validating guardrails',
        },
      });

      return true;
    }

    await updateJobStatus(jobId, 'PROCESSING');

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
      throw new Error(`Room not found: ${roomId}`);
    }

    const moodboard = room.moodboards[0];
    if (!moodboard) {
      throw new Error('Missing moodboard for room');
    }

    const isometricElevation = await prisma.isometricFloorElevation.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
    });

    if (!isometricElevation) {
      logger.warn('No isometric elevation found for project — proceeding without it', {
        jobId,
        projectId,
      });
    }

    let isometricSignedUrl: string | undefined;
    if (isometricElevation) {
      if (isometricElevation.s3Key) {
        try {
          isometricSignedUrl = await generateSignedUrl(
            config.s3BucketRenders,
            isometricElevation.s3Key,
            3600
          );
        } catch (e) {
          logger.warn('Failed to sign isometric S3 URL, using stored imageUrl', {
            error: String(e),
          });
          isometricSignedUrl = isometricElevation.imageUrl || undefined;
        }
      } else {
        isometricSignedUrl = isometricElevation.imageUrl || undefined;
      }
    }

    const meta = (room.metadata || {}) as Record<string, unknown>;
    const enrichment = meta.enrichment as Record<string, unknown> | undefined;
    const enrichedSpatialLines: string[] = [];
    if (enrichment && typeof enrichment === 'object') {
      if (typeof enrichment.position === 'string' && enrichment.position.trim()) {
        enrichedSpatialLines.push(`Position on plan: ${enrichment.position.trim()}`);
      }
      if (Array.isArray(enrichment.adjacent_to) && enrichment.adjacent_to.length > 0) {
        enrichedSpatialLines.push(
          `Adjacent spaces: ${enrichment.adjacent_to.map(String).join(', ')}`
        );
      }
      const op = enrichment.openings as { doors?: number; windows?: number } | undefined;
      if (op && (op.doors || op.windows)) {
        enrichedSpatialLines.push(
          `Openings (from enrichment): ${op.doors ?? 0} door(s), ${op.windows ?? 0} window(s)`
        );
      }
    }
    const enrichedSpatialNotes =
      enrichedSpatialLines.length > 0 ? enrichedSpatialLines.join('\n') : undefined;

    // No geometry validation. Bird view uses moodboard (primary) + elevation (secondary) only.
    const roomGeometry = buildRoomGeometryForBirdView(room);

    const connectedRooms = Array.isArray((room.metadata as any)?.adjacentRooms)
      ? (room.metadata as any).adjacentRooms
      : [];

    const moodboardUrl = moodboard.s3Key
      ? await generateSignedUrl(config.s3BucketMoodboards, moodboard.s3Key, 3600)
      : moodboard.imageUrl;

    const result = await generateRoom2DViews({
      jobId,
      projectId,
      roomId,
      userId,
      roomGeometry,
      moodboardUrl,
      connectedRooms,
      isometricUrl: isometricSignedUrl,
      enrichedSpatialNotes,
      version,
    });

    const bucket = config.s3BucketRenders;

    // One design per room (strict): remove any existing BIRD_VIEW for this room before saving the new one.
    await prisma.room2DView.deleteMany({
      where: { roomId, viewType: 'BIRD_VIEW' },
    });

    for (const view of result.views) {
      const filename = VIEW_FILENAME_MAP[view.viewType];
      const extension = view.mimeType.includes('png') ? 'png' : 'jpg';
      const baseKey = `projects/${projectId}/rooms/${roomId}/2d-views`;
      const versionSuffix = version > 1 ? `/v${version}` : '';
      const s3Key = `${baseKey}${versionSuffix}/${filename}.${extension}`;

      await uploadToS3({
        bucket,
        key: s3Key,
        body: Buffer.from(view.imageData, 'base64'),
        contentType: view.mimeType,
        metadata: {
          jobId,
          projectId,
          roomId,
          viewType: view.viewType,
          version: String(version),
          generationSource: '2d_views_stage',
        },
      });

      await prisma.room2DView.create({
        data: {
          roomId,
          viewType: view.viewType as any,
          imageUrl: `s3://${bucket}/${s3Key}`,
          s3Key,
          version,
          geometryHash: view.geometryHash,
          styleHash: view.styleHash,
          jobId,
          metadata: {
            roomId,
            connectedRooms,
            wallType: view.wallType,
            generationSource: '2d_views_stage',
            promptHash: view.promptHash,
          },
        },
      });
    }

    await updateJobStatus(jobId, 'COMPLETED', {
      result: {
        roomId,
        views: result.views.map((view) => ({
          viewType: view.viewType,
          promptHash: view.promptHash,
        })),
      },
    });

    logger.info('Room 2D views generation completed', {
      jobId,
      roomId,
      viewCount: result.views.length,
    });

    return true;
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || String(error),
      stack: error?.stack,
    };

    logger.error({
      requestId,
      jobId,
      error: errorDetails,
    }, 'Room 2D views generation failed');

    const errorMessage = String(error?.message || '');
    const isRetryable = !(
      errorMessage.includes('Missing floor plan geometry') ||
      errorMessage.includes('Missing moodboard') ||
      errorMessage.includes('Missing isometric elevation') ||
      errorMessage.includes('Invalid room geometry')
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
    logger.error({
      jobId,
      status,
      error: String(error),
    }, 'Failed to update job status');
  }
}
