/**
 * TatvaOps Vision - Elevation Generation Handler
 * 
 * SQS handler for ELEVATION jobs.
 * Consumes messages from the elevation-generation queue (uses interior-view-generation queue).
 * 
 * ============================================================
 * ❗ FLOOR PLAN IS LAW ❗
 * ❗ GEOMETRY MUST NOT BE MODIFIED ❗
 * ============================================================
 * 
 * This handler:
 * 1. Loads room geometry from database
 * 2. Loads moodboard for style reference
 * 3. Calls the elevation generation engine
 * 4. Uploads results to S3
 * 5. Stores metadata in database
 * 
 * GENERATION FLOW:
 * SQS → elevation-generation.ts
 *   → validate geometry
 *   → build wall prompts
 *   → generate 4 elevations per room
 *   → upload to S3
 *   → store RoomElevation records
 */

import { Message } from '@aws-sdk/client-sqs';
import { PrismaClient } from '@prisma/client';
import {
  generateRoomElevations,
  extractWallGeometry,
  ElevationJobInput,
  ElevationJobResult,
  ElevationGenerationError,
  ElevationErrorCode,
  WallDirection,
} from '../design-engine';
import { logger } from '../lib/logger';
import { validateJobGuardrails } from '../services/plan-guardrails';

// ===========================================
// Database Client
// ===========================================

const prisma = new PrismaClient();

// ===========================================
// Job Payload Type
// ===========================================

/**
 * Expected payload from SQS message.
 */
interface ElevationJobPayload {
  jobId: string;
  projectId: string;
  roomId: string;
  userId: string;
  
  /** Which walls to generate (optional, default: all 4) */
  wallsToGenerate?: WallDirection[];
  
  /** Version for regeneration */
  version?: number;
}

// ===========================================
// Main Handler
// ===========================================

/**
 * Handle elevation generation message from SQS.
 * 
 * ============================================================
 * ❗ DO NOT MODIFY GEOMETRY ❗
 * Geometry comes directly from floor plan analysis.
 * Only style from moodboard is variable.
 * ============================================================
 * 
 * @returns true if message should be deleted, false to retry
 */
export async function handleElevationGeneration(
  message: Message
): Promise<boolean> {
  const requestId = message.MessageId || 'unknown';
  
  logger.info('Processing elevation generation job', {
    requestId,
    messageId: message.MessageId,
  });

  let jobId: string | undefined;
  let projectId: string | undefined;
  let roomId: string | undefined;
  let userId: string | undefined;

  try {
    // ===========================================
    // Parse Message
    // ===========================================
    
    if (!message.Body) {
      logger.error('Empty message body');
      return true; // Delete malformed message
    }

    // Parse message body
    let rawPayload: any;
    try {
      rawPayload = JSON.parse(message.Body);
    } catch (parseError) {
      logger.error('Failed to parse message body', {
        requestId,
        error: String(parseError),
        body: message.Body?.substring(0, 200),
      });
      return true; // Delete malformed message
    }

    // Handle wrapped payload (from createQueueMessage)
    // The message format is { id, type, payload, metadata }
    const payload: ElevationJobPayload = rawPayload.payload || rawPayload;
    
    jobId = payload.jobId;
    projectId = payload.projectId;
    roomId = payload.roomId;
    userId = payload.userId;

    if (!jobId || !projectId || !roomId || !userId) {
      logger.error('Missing required fields in payload', { 
        requestId,
        jobId,
        projectId,
        roomId,
        userId,
        rawPayloadKeys: Object.keys(rawPayload),
      });
      return true; // Delete malformed message
    }

    logger.info('Processing elevation generation job', {
      requestId,
      jobId,
      projectId,
      roomId,
    });

    // ===========================================
    // Plan Guardrails Validation (Pre-processing)
    // ===========================================
    
    try {
      const isRegeneration = (payload.version || 1) > 1;
      await validateJobGuardrails(userId, projectId, 'ELEVATION', isRegeneration);
    } catch (guardrailError: any) {
      logger.warn('Plan guardrails validation failed', {
        jobId,
        userId,
        projectId,
        error: guardrailError.message,
      });

      await updateJobStatus(jobId, 'FAILED', {
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: guardrailError.message || 'Plan limit exceeded',
        },
      });

      return true; // Don't retry - user needs to upgrade or wait
    }

    // ===========================================
    // Update Job Status: PROCESSING
    // ===========================================
    
    await updateJobStatus(jobId, 'PROCESSING');

    // ===========================================
    // Load Room Data from Database
    // ===========================================
    
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
      throw new ElevationGenerationError(
        ElevationErrorCode.MISSING_ROOM_DATA,
        `Room not found: ${roomId}`,
        false
      );
    }

    // ===========================================
    // Extract Wall Geometry from Room
    // ===========================================
    
    const geometry = room.geometry as {
      boundingBox: { x: number; y: number; width: number; height: number };
      polygon?: { x: number; y: number }[];
      entryPoints?: { x: number; y: number }[];
    };
    
    const metadata = room.metadata as {
      areaEstimate?: number;
      areaUnit?: string;
      adjacentRooms?: string[];
      ceilingHeight?: number;
    } | null;

    // ============================================================
    // ❗ DO NOT MODIFY - Extract geometry directly from floor plan ❗
    // ============================================================
    const roomGeometry = extractWallGeometry(
      room.id,
      room.name,
      room.type,
      geometry,
      metadata || undefined
    );

    // ===========================================
    // Get Moodboard URL for Style Reference
    // ===========================================
    
    let moodboardUrl: string | undefined;
    
    if (room.moodboards && room.moodboards.length > 0) {
      const latestMoodboard = room.moodboards[0];
      if (latestMoodboard.imageUrl) {
        moodboardUrl = latestMoodboard.imageUrl;
      }
    }

    // ===========================================
    // Generate Elevations
    // ===========================================
    
    const input: ElevationJobInput = {
      jobId,
      projectId,
      roomId,
      userId,
      roomGeometry,
      moodboardUrl,
      wallsToGenerate: payload.wallsToGenerate,
      version: payload.version || 1,
    };

    logger.info('Starting elevation generation', {
      requestId,
      roomName: room.name,
      roomType: room.type,
      hasMoodboard: !!moodboardUrl,
    });

    const result = await generateRoomElevations(input);

    // ===========================================
    // Upload Images to S3 and Store in DB
    // ===========================================
    
    for (const elevation of result.elevations) {
      try {
        await storeElevationResult({
          jobId,
          projectId,
          roomId,
          userId,
          direction: elevation.direction,
          output: elevation.output,
          version: payload.version || 1,
        });
      } catch (storeError) {
        logger.error('Failed to store individual elevation', {
          requestId,
          jobId,
          roomId,
          direction: elevation.direction,
          error: storeError instanceof Error ? storeError.message : String(storeError),
          stack: storeError instanceof Error ? storeError.stack : undefined,
        });
        throw storeError;
      }
    }

    // ===========================================
    // Update Job Status: COMPLETED
    // ===========================================
    
    await updateJobStatus(jobId, 'COMPLETED', {
      result: {
        successCount: result.elevations.length,
        failureCount: result.failures.length,
        elevations: result.elevations.map(e => ({
          direction: e.direction,
          imageUrl: e.output.imageUrl,
          geometryHash: e.output.geometryHash,
          styleHash: e.output.styleHash,
        })),
        failures: result.failures,
        totalDurationMs: result.totalDurationMs,
      },
    });

    logger.info('Elevation generation completed', {
      requestId,
      jobId,
      successCount: result.elevations.length,
      failureCount: result.failures.length,
    });

    return true; // Delete message

  } catch (error) {
    const isRetryable = error instanceof ElevationGenerationError
      ? error.isRetryable
      : true;

    const errorDetails = error instanceof ElevationGenerationError
      ? { code: error.code, details: error.details }
      : { message: String(error) };

    logger.error('Elevation generation failed', {
      requestId,
      jobId,
      isRetryable,
      error: errorDetails,
    });

    // Update job status to FAILED
    if (jobId) {
      await updateJobStatus(jobId, 'FAILED', {
        error: errorDetails,
      });
    }

    // Return false to allow SQS to retry if error is retryable
    return !isRetryable;
  }
}

// ===========================================
// Database Operations
// ===========================================

/**
 * Update AI job status in database.
 */
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
        ...(status === 'COMPLETED' && {
          completedAt: new Date(),
          result: data?.result as any,
        }),
        ...(status === 'FAILED' && {
          error: JSON.stringify(data?.error),
          retryCount: {
            increment: 1,
          },
        }),
        updatedAt: new Date(),
      },
    });

    logger.debug('Job status updated', { jobId, status });
  } catch (error) {
    logger.error('Failed to update job status', {
      jobId,
      status,
      error: String(error),
    });
    // Don't throw - we still want to process the job
  }
}

/**
 * Store elevation result in database and upload to S3.
 */
async function storeElevationResult(params: {
  jobId: string;
  projectId: string;
  roomId: string;
  userId: string;
  direction: WallDirection;
  output: {
    imageUrl: string;
    s3Key: string;
    mimeType: string;
    geometryHash: string;
    styleHash: string;
    deviationEstimate: number;
    generatedAt: string;
    durationMs: number;
    _imageData?: string;
  };
  version: number;
}): Promise<void> {
  const { jobId, roomId, direction, output, version } = params;

  let imageUrl = output.imageUrl;
  let s3Key = output.s3Key;

  // Step 1: Upload image to S3 if we have base64 data
  if (output._imageData) {
    try {
      logger.info('Uploading elevation image to S3', { roomId, direction, version });
      
      const uploadResult = await uploadElevationToS3({
        projectId: params.projectId,
        roomId,
        direction,
        version,
        imageData: output._imageData,
        mimeType: output.mimeType,
      });
      
      imageUrl = uploadResult.url;
      s3Key = uploadResult.s3Key;
      
      logger.info('S3 upload successful', { roomId, direction, s3Key });
    } catch (uploadError) {
      const uploadErrMsg = uploadError instanceof Error ? uploadError.message : String(uploadError);
      logger.error('S3 upload failed', { roomId, direction, error: uploadErrMsg });
      throw new Error(`S3 upload failed: ${uploadErrMsg}`);
    }
  }

  // Step 2: Store in database
  try {
    logger.info('Storing elevation in database', { roomId, direction, version, s3Key });
    
    // Use create instead of upsert to see clearer errors
    // First try to find existing
    const existing = await prisma.roomElevation.findFirst({
      where: { roomId, wall: direction, version },
    });
    
    if (existing) {
      // Update
      await prisma.roomElevation.update({
        where: { id: existing.id },
        data: {
          imageUrl,
          s3Key,
          geometryHash: output.geometryHash,
          styleHash: output.styleHash,
          deviationEstimate: output.deviationEstimate,
          jobId,
          metadata: {
            generatedAt: output.generatedAt,
            durationMs: output.durationMs,
            mimeType: output.mimeType,
          },
        },
      });
    } else {
      // Create
      await prisma.roomElevation.create({
        data: {
          roomId,
          wall: direction,
          imageUrl,
          version,
          s3Key,
          geometryHash: output.geometryHash,
          styleHash: output.styleHash,
          deviationEstimate: output.deviationEstimate,
          jobId,
          metadata: {
            generatedAt: output.generatedAt,
            durationMs: output.durationMs,
            mimeType: output.mimeType,
          },
        },
      });
    }

    logger.info('Elevation stored successfully', {
      roomId,
      direction,
      version,
      s3Key,
    });

  } catch (dbError) {
    const dbErrMsg = dbError instanceof Error ? dbError.message : String(dbError);
    logger.error('Database storage failed', {
      roomId,
      direction,
      version,
      error: dbErrMsg,
    });
    throw new Error(`Database storage failed: ${dbErrMsg}`);
  }
}

/**
 * Upload elevation image to S3.
 */
async function uploadElevationToS3(params: {
  projectId: string;
  roomId: string;
  direction: WallDirection;
  version: number;
  imageData: string;
  mimeType: string;
}): Promise<{ url: string; s3Key: string }> {
  const { projectId, roomId, direction, version, imageData, mimeType } = params;
  
  // Construct S3 key
  const extension = mimeType.includes('png') ? 'png' : 'jpg';
  const s3Key = `elevations/${projectId}/${roomId}/${direction.toLowerCase()}_v${version}.${extension}`;
  
  // Get S3 client from environment
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: process.env.AWS_ACCESS_KEY_ID ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    } : undefined,
  });

  // Use renders bucket for elevations (architectural drawings)
  const bucket = process.env.S3_BUCKET_RENDERS || process.env.AWS_S3_ELEVATION_BUCKET || process.env.AWS_S3_BUCKET || 'tatvaops-vision-production-renders';
  
  // Convert base64 to buffer
  const buffer = Buffer.from(imageData, 'base64');

  // Upload to S3
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: {
      projectId,
      roomId,
      direction,
      version: String(version),
    },
  }));

  logger.info('Uploaded elevation to S3', { bucket, s3Key });

  // Construct URL
  const url = `https://${bucket}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;
  
  return { url, s3Key };
}

// ===========================================
// Cleanup
// ===========================================

/**
 * Cleanup database connection on shutdown.
 */
export async function cleanupElevationHandler(): Promise<void> {
  await prisma.$disconnect();
}

