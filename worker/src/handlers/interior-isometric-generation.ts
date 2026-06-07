/**
 * TatvaOps Vision - Interior Isometric Generation Handler
 * 
 * SQS handler for INTERIOR_ISOMETRIC jobs.
 * Generates full-floor isometric / bird's-eye interior elevations.
 * 
 * ============================================================
 * ❗ THIS IS THE SINGLE SOURCE OF TRUTH FOR ELEVATIONS ❗
 * ❗ ONE IMAGE = ENTIRE FLOOR ❗
 * ❗ FLOOR PLAN GEOMETRY IS LAW ❗
 * ============================================================
 * 
 * This handler:
 * 1. Loads all room geometry from database
 * 2. Loads moodboards for all rooms
 * 3. Calls the isometric generation engine
 * 4. Uploads result to S3
 * 5. Stores metadata in database
 * 
 * GENERATION FLOW:
 * SQS → interior-isometric-generation.ts
 *   → validate floor geometry
 *   → map room styles from moodboards
 *   → build global prompt
 *   → generate single isometric image
 *   → upload to S3
 *   → store IsometricFloorElevation record
 */

import { Message } from '@aws-sdk/client-sqs';
import {
  generateIsometricElevation,
  extractFloorGeometry,
  IsometricJobInput,
  IsometricGenerationError,
  IsometricErrorCode,
} from '../design-engine';
import { config } from '../config';
import { logger } from '../lib/logger';
import { validateJobGuardrails } from '../services/plan-guardrails';
import { getPrisma } from '../lib/prisma';
import { uploadToS3 as uploadToStorage, getPublicStorageUrl } from '../lib/s3';

const prisma = getPrisma();

// ===========================================
// Job Payload Type
// ===========================================

/**
 * Expected payload from SQS message.
 */
interface IsometricJobPayload {
  jobId: string;
  projectId: string;
  userId: string;
  
  /** Floor number (default: 1) */
  floor?: number;
  
  /** Version for regeneration */
  version?: number;
}

// ===========================================
// Main Handler
// ===========================================

/**
 * Handle isometric floor elevation generation message from SQS.
 * 
 * ============================================================
 * ❗ ONE IMAGE = ENTIRE FLOOR ❗
 * ❗ THIS REPLACES ROOM-WISE ELEVATIONS ❗
 * ============================================================
 * 
 * @returns true if message should be deleted, false to retry
 */
export async function handleInteriorIsometricGeneration(
  message: Message
): Promise<boolean> {
  const requestId = message.MessageId || 'unknown';
  
  logger.info('Processing interior isometric generation job', {
    requestId,
    messageId: message.MessageId,
  });

  let jobId: string | undefined;
  let projectId: string | undefined;
  let userId: string | undefined;

  try {
    // ===========================================
    // Parse Message
    // ===========================================
    
    if (!message.Body) {
      logger.error('Empty message body');
      return true; // Delete malformed message
    }

    // Parse and unwrap payload (handle createQueueMessage format)
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

    const payload: IsometricJobPayload = rawPayload.payload || rawPayload;
    
    jobId = payload.jobId;
    projectId = payload.projectId;
    userId = payload.userId;
    const floor = payload.floor || 1;
    const version = payload.version || 1;

    if (!jobId || !projectId || !userId) {
      logger.error('Missing required fields in payload', { 
        requestId,
        jobId,
        projectId,
        userId,
        rawPayloadKeys: Object.keys(rawPayload),
        payloadKeys: Object.keys(payload),
        rawPayloadType: rawPayload.type,
        rawBody: message.Body?.substring(0, 500),
      });
      return true; // Delete malformed message
    }

    logger.info('Processing isometric generation job', {
      requestId,
      jobId,
      projectId,
      floor,
      version,
    });

    // Determine if this is a regeneration
    const isRegeneration = version > 1;

    // ===========================================
    // Plan Guardrails Validation (Pre-processing)
    // ===========================================
    
    try {
      await validateJobGuardrails(userId, projectId, 'INTERIOR_ISOMETRIC', isRegeneration);
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
    // Load Project and Room Data
    // ===========================================
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rooms: {
          include: {
            moodboards: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!project) {
      throw new IsometricGenerationError(
        IsometricErrorCode.INVALID_GEOMETRY,
        `Project not found: ${projectId}`,
        false
      );
    }

    if (!project.rooms || project.rooms.length === 0) {
      throw new IsometricGenerationError(
        IsometricErrorCode.INVALID_GEOMETRY,
        'No rooms found in project',
        false
      );
    }

    logger.info('Loaded project data', {
      projectId,
      roomCount: project.rooms.length,
    });

    // ===========================================
    // Extract Floor Geometry from Rooms
    // ===========================================
    
    // ============================================================
    // ❗ DO NOT MODIFY - Extract geometry directly from floor plan ❗
    // ============================================================
    
    const roomsWithGeometry = project.rooms.map(room => ({
      id: room.id,
      name: room.name,
      type: room.type,
      geometry: room.geometry as {
        boundingBox: { x: number; y: number; width: number; height: number };
        polygon?: { x: number; y: number }[];
      },
      metadata: room.metadata ? (room.metadata as {
        areaEstimate?: number;
        adjacentRooms?: string[];
        ceilingHeight?: number;
      }) : undefined,
    }));

    const floorGeometry = extractFloorGeometry(
      projectId,
      roomsWithGeometry,
      floor
    );

    logger.info('Extracted floor geometry', {
      floor: floorGeometry.floor,
      dimensions: floorGeometry.dimensions,
      roomCount: floorGeometry.rooms.length,
      sampleRoom: floorGeometry.rooms[0] ? {
        id: floorGeometry.rooms[0].roomId,
        name: floorGeometry.rooms[0].roomName,
        type: floorGeometry.rooms[0].roomType,
        bbox: floorGeometry.rooms[0].boundingBox,
        hasPolygon: !!floorGeometry.rooms[0].polygon,
      } : null,
    });

    // ===========================================
    // Get Moodboard URLs for All Rooms (using presigned URLs)
    // ===========================================
    
    const moodboardUrls: Record<string, string> = {};
    const s3BucketMoodboards = config.s3BucketMoodboards;
    
    for (const room of project.rooms) {
      if (room.moodboards && room.moodboards.length > 0) {
        const latestMoodboard = room.moodboards[0];
        // Generate presigned URL from s3Key (valid for 1 hour, sufficient for generation)
        if (latestMoodboard.s3Key) {
          try {
            const { generateSignedUrl } = await import('../lib/s3');
            moodboardUrls[room.id] = await generateSignedUrl(s3BucketMoodboards, latestMoodboard.s3Key, 3600);
          } catch (err) {
            logger.warn('Failed to generate presigned URL for moodboard', {
              roomId: room.id,
              s3Key: latestMoodboard.s3Key,
              error: String(err),
            });
          }
        }
      }
    }

    logger.info('Collected moodboard URLs', {
      totalRooms: project.rooms.length,
      roomsWithMoodboards: Object.keys(moodboardUrls).length,
    });

    // ===========================================
    // Load Original Floor Plan Image (for geometry reference)
    // ===========================================
    
    let floorPlanImageUrl: string | undefined;
    if (project.floorPlanUrl) {
      // If it's an S3 key, generate a presigned URL
      if (project.floorPlanUrl.startsWith('uploads/') || project.floorPlanUrl.startsWith('floor-plans/') || !project.floorPlanUrl.startsWith('http')) {
        try {
          const s3BucketFloorplans = config.s3BucketFloorplans;
          const { generateSignedUrl } = await import('../lib/s3');
          floorPlanImageUrl = await generateSignedUrl(s3BucketFloorplans, project.floorPlanUrl, 3600);
          logger.info('Generated presigned URL for floor plan reference', {
            s3Key: project.floorPlanUrl,
            bucket: s3BucketFloorplans,
          });
        } catch (err) {
          logger.warn('Failed to generate presigned URL for floor plan', {
            floorPlanUrl: project.floorPlanUrl,
            error: String(err),
          });
        }
      } else {
        // It's already a full URL
        floorPlanImageUrl = project.floorPlanUrl;
      }
    }

    // ===========================================
    // Generate Isometric Elevation
    // ===========================================
    
    const input: IsometricJobInput = {
      jobId,
      projectId,
      userId,
      floorGeometry,
      moodboardUrls,
      floorPlanImageUrl, // Pass floor plan for geometry reference
      floor,
      version,
    };

    logger.info('Starting isometric generation', {
      requestId,
      jobId,
      roomCount: floorGeometry.rooms.length,
    });

    const result = await generateIsometricElevation(input);

    if (!result.success || !result.output) {
      throw new IsometricGenerationError(
        result.error?.code || IsometricErrorCode.UNKNOWN,
        result.error?.message || 'Generation failed',
        false,
        result.error?.details
      );
    }

    // ===========================================
    // Upload to S3
    // ===========================================
    
    logger.info('Uploading isometric elevation to S3', {
      s3Key: result.output.s3Key,
    });

    let imageUrl: string;
    let uploadedS3Key: string;
    try {
      const uploadResult = await uploadIsometricToStorage({
        projectId,
        floor,
        version,
        imageData: result.output._imageData!,
        mimeType: result.output.mimeType,
      });
      
      imageUrl = uploadResult.url;
      uploadedS3Key = uploadResult.s3Key;
      
      logger.info('Storage upload successful', {
        s3Key: uploadResult.s3Key,
      });
    } catch (uploadError) {
      const uploadErrMsg = uploadError instanceof Error ? uploadError.message : String(uploadError);
      logger.error('Storage upload failed', { error: uploadErrMsg });
      throw new IsometricGenerationError(
        IsometricErrorCode.STORAGE_FAILED,
        `Storage upload failed: ${uploadErrMsg}`,
        false
      );
    }

    // ===========================================
    // Store in Database
    // ===========================================
    
    logger.info('Storing isometric elevation in database', {
      projectId,
      floor,
      version,
    });

    try {
      await storeIsometricElevation({
        projectId,
        floor,
        version,
        imageUrl,
        s3Key: uploadedS3Key,
        geometryHash: result.output.geometryHash,
        styleHash: result.output.styleHash,
        roomCount: result.output.roomCount,
        deviationEstimate: result.output.deviationEstimate,
        architecturalAccuracy: result.output.architecturalAccuracy,
        jobId,
        metadata: {
          generatedAt: result.output.generatedAt,
          durationMs: result.output.durationMs,
          mimeType: result.output.mimeType,
        },
      });
      
      logger.info('Isometric elevation stored successfully');
    } catch (dbError) {
      const dbErrMsg = dbError instanceof Error ? dbError.message : String(dbError);
      const dbErrStack = dbError instanceof Error ? dbError.stack : undefined;
      
      logger.error('Database storage failed', {
        error: dbErrMsg,
        stack: dbErrStack,
        projectId,
        floor,
        version,
      });
      
      // Log full error to console for debugging
      console.error('DATABASE STORAGE ERROR:', {
        message: dbErrMsg,
        stack: dbErrStack,
        error: dbError,
      });
      
      throw new IsometricGenerationError(
        IsometricErrorCode.STORAGE_FAILED,
        `Database storage failed: ${dbErrMsg}`,
        true
      );
    }

    // ===========================================
    // Update Job Status: COMPLETED
    // ===========================================
    
    await updateJobStatus(jobId, 'COMPLETED', {
      result: {
        imageUrl,
        geometryHash: result.output.geometryHash,
        styleHash: result.output.styleHash,
        roomCount: result.output.roomCount,
        deviationEstimate: result.output.deviationEstimate,
        totalDurationMs: result.totalDurationMs,
      },
    });

    logger.info('Isometric generation completed', {
      requestId,
      jobId,
      roomCount: result.output.roomCount,
      totalDurationMs: result.totalDurationMs,
    });

    return true; // Delete message

  } catch (error) {
    const isRetryable = error instanceof IsometricGenerationError
      ? error.isRetryable
      : true;

    const errorDetails = error instanceof IsometricGenerationError
      ? { code: error.code, details: error.details }
      : { message: String(error) };

    logger.error('Isometric generation failed', {
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
  }
}

/**
 * Store isometric elevation in database.
 */
async function storeIsometricElevation(params: {
  projectId: string;
  floor: number;
  version: number;
  imageUrl: string;
  s3Key: string;
  geometryHash: string;
  styleHash: string;
  roomCount: number;
  deviationEstimate: number;
  architecturalAccuracy?: number;
  jobId: string;
  metadata: object;
}): Promise<void> {
  const { projectId, floor, version, ...data } = params;

  // Use upsert for regeneration support
  const existing = await prisma.isometricFloorElevation.findFirst({
    where: { projectId, floor, version },
  });

  if (existing) {
    await prisma.isometricFloorElevation.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.isometricFloorElevation.create({
      data: {
        projectId,
        floor,
        version,
        ...data,
      },
    });
  }
}

// ===========================================
// Storage Upload (Supabase)
// ===========================================

async function uploadIsometricToStorage(params: {
  projectId: string;
  floor: number;
  version: number;
  imageData: string;
  mimeType: string;
}): Promise<{ url: string; s3Key: string }> {
  const { projectId, floor, version, imageData, mimeType } = params;
  const extension = mimeType.includes('png') ? 'png' : 'jpg';
  const s3Key = `isometric/${projectId}/floor_${floor}_v${version}.${extension}`;
  const bucket = config.s3BucketRenders;

  await uploadToStorage({
    bucket,
    key: s3Key,
    body: Buffer.from(imageData, 'base64'),
    contentType: mimeType,
    metadata: {
      projectId,
      floor: String(floor),
      version: String(version),
    },
  });

  logger.info('Uploaded isometric elevation to Supabase storage', { bucket, s3Key });

  return {
    url: getPublicStorageUrl(bucket, s3Key),
    s3Key,
  };
}

// ===========================================
// Cleanup
// ===========================================

/**
 * Cleanup database connection on shutdown.
 */
export async function cleanupIsometricHandler(): Promise<void> {
  await prisma.$disconnect();
}


