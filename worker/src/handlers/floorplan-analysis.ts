/**
 * Floor Plan Analysis Worker Handler
 * 
 * Handles FLOORPLAN_ANALYSIS jobs from SQS queue
 * 
 * Flow:
 * 1. Receive message from SQS
 * 2. Fetch floor plan image from S3
 * 3. Run analysis through Floor Plan Vision Engine
 * 4. Store detected rooms in database
 * 5. Update project stage
 * 6. Report success/failure
 * 
 * CRITICAL: This handler must be idempotent and retry-safe.
 */

import { AIJobStatus, AIJobType, RoomStatus as DBRoomStatus, RoomType } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { Message } from '@aws-sdk/client-sqs';
import {
  analyzeFloorPlan,
  FloorPlanAnalysisInput,
  FloorPlanAnalysisResult,
  FloorPlanAnalysisError,
  FloorPlanErrorCode,
  RoomStatus,
  fetchImage,
} from '../design-engine/floorplan';
import { mapAdjacentIdsToLabels } from '../design-engine/floorplan/enrichment';
import { logger } from '../lib/logger';
import { config } from '../config';
import { redisClient } from '../lib/redis-client';
import { disconnectWorkerPrisma, getPrisma } from '../lib/prisma';

// Helper to report progress
async function reportProgress(jobId: string, progress: number, stage: string, message: string) {
  await redisClient.setJobStatus(jobId, {
    status: 'PROCESSING',
    progress,
    stage,
    message,
  });
  logger.info(`Progress: ${progress}% - ${stage}: ${message}`, { jobId });
}

// ============================================
// TYPES
// ============================================

interface FloorPlanJobPayload {
  jobId: string;
  userId: string;
  projectId: string;
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: 'image/png' | 'image/jpeg' | 'image/jpg' | 'application/pdf';
  hints?: {
    expectedRoomCount?: number;
    knownRoomNames?: string[];
    planType?: 'residential' | 'commercial' | 'mixed';
  };
}

interface HandlerResult {
  success: boolean;
  jobId: string;
  roomCount?: number;
  error?: string;
  isRetryable?: boolean;
}

// ============================================
// MAIN HANDLER
// ============================================

/**
 * Handle floor plan analysis job from SQS message
 * 
 * @param message - SQS Message object
 * @returns boolean indicating whether to delete the message from queue
 */
export async function handleFloorPlanAnalysis(
  message: Message
): Promise<boolean> {
  // Parse the SQS message body
  let payload: FloorPlanJobPayload;
  
  try {
    if (!message.Body) {
      logger.error('SQS message has no body');
      return true; // Delete malformed message
    }
    
    const body = JSON.parse(message.Body);
    
    // The backend sends:
    // {
    //   id: uuid (SQS correlation ID),
    //   type: 'FLOORPLAN_ANALYSIS',
    //   payload: { jobId, userId, projectId, imageUrl },
    //   metadata: { jobId, userId, projectId, correlationId, timestamp }
    // }
    payload = {
      jobId: body.payload?.jobId || body.metadata?.jobId, // The AIJob database ID
      userId: body.payload?.userId || body.metadata?.userId,
      projectId: body.payload?.projectId || body.metadata?.projectId,
      imageUrl: body.payload?.imageUrl,
      imageBase64: body.payload?.imageBase64,
      mimeType: body.payload?.mimeType,
      hints: body.payload?.hints,
    };
    
    // Validate required fields
    if (!payload.jobId) {
      logger.warn('Skipping message without jobId (old format)', {
        projectId: payload.projectId,
        hasImageUrl: !!payload.imageUrl,
      });
      return true; // Delete old malformed message
    }
    
    logger.info('Parsed SQS message', { 
      jobId: payload.jobId, 
      projectId: payload.projectId,
      hasImageUrl: !!payload.imageUrl 
    });
  } catch (parseError) {
    logger.error('Failed to parse SQS message body', {
      error: String(parseError),
      body: message.Body?.substring(0, 200),
    });
    return true; // Delete malformed message
  }
  
  const { jobId, userId, projectId } = payload;
  const db = getPrisma();
  
  logger.info('Starting floor plan analysis job', {
    jobId,
    userId,
    projectId,
    hasImageUrl: !!payload.imageUrl,
    hasBase64: !!payload.imageBase64,
  });
  
  try {
    // ========================================
    // 1. Update job status to PROCESSING
    // ========================================
    await db.aIJob.update({
      where: { id: jobId },
      data: {
        status: AIJobStatus.PROCESSING,
        startedAt: new Date(),
      },
    });
    
    await reportProgress(jobId, 5, 'Starting', 'Initializing floor plan analysis...');
    
    // ========================================
    // 2. Verify project exists and belongs to user
    // ========================================
    const project = await db.project.findFirst({
      where: { 
        id: projectId, 
        userId, 
        deletedAt: null 
      },
    });
    
    if (!project) {
      throw new FloorPlanAnalysisError(
        FloorPlanErrorCode.INVALID_IMAGE,
        'Project not found or access denied',
        false
      );
    }
    
    await reportProgress(jobId, 10, 'Preparing', 'Loading floor plan from storage...');
    
    // ========================================
    // 3. Run floor plan analysis
    // ========================================
    const input: FloorPlanAnalysisInput = {
      jobId,
      userId,
      projectId,
      imageUrl: payload.imageUrl,
      imageBase64: payload.imageBase64,
      mimeType: payload.mimeType || 'image/png',
      hints: payload.hints,
    };
    
    const result = await analyzeFloorPlan(input);
    
    logger.info('Floor plan analysis complete', {
      jobId,
      roomCount: result.rooms.length,
      overallConfidence: result.overallConfidence,
      processingTimeMs: result.processingTimeMs,
    });
    
    // ========================================
    // 4. Store rooms in database
    // ========================================
    await storeAnalysisResult(db, projectId, result);
    
    // ========================================
    // 5. Spatial Enrichment (non-blocking)
    // ========================================
    await reportProgress(jobId, 92, 'Enriching', 'Extracting spatial intelligence...');
    try {
      const { enrichFloorPlan } = await import('../design-engine/floorplan/enrichment');
      
      // Fetch the floor plan image for enrichment
      const { buffer: imgBuffer, mimeType: imgMime } = await fetchImage(
        payload.imageUrl,
        payload.imageBase64,
        payload.mimeType
      );
      const imgBase64 = imgBuffer.toString('base64');
      
      const enrichment = await enrichFloorPlan(imgBase64, imgMime, result);
      
      if (enrichment) {
        // Store enrichment data on project metadata
        const existingProject = await db.project.findUnique({ where: { id: projectId } });
        const existingMeta = (existingProject?.metadata as Record<string, unknown>) || {};
        
        await db.project.update({
          where: { id: projectId },
          data: {
            metadata: {
              ...existingMeta,
              floorPlanAnalysis: {
                ...((existingMeta.floorPlanAnalysis as Record<string, unknown>) || {}),
                spatialEnrichment: enrichment,
              },
            } as any,
            updatedAt: new Date(),
          },
        });
        
        // Update individual rooms with enrichment data
        const dbRooms = await db.room.findMany({ where: { projectId } });
        for (const enrichedRoom of enrichment.rooms) {
          const dbRoom =
            dbRooms.find((r) => {
              const meta = (r.metadata as Record<string, unknown>) || {};
              return meta.detectionTempId === enrichedRoom.id;
            }) ||
            dbRooms.find(
              (r) =>
                r.name?.toLowerCase().includes(enrichedRoom.name?.toLowerCase() || '') ||
                (enrichedRoom.name?.toLowerCase() || '').includes(r.name?.toLowerCase() || '')
            );
          if (dbRoom) {
            const roomMeta = (dbRoom.metadata as Record<string, unknown>) || {};
            await db.room.update({
              where: { id: dbRoom.id },
              data: {
                metadata: {
                  ...roomMeta,
                  enrichment: {
                    dimensions: enrichedRoom.dimensions,
                    area_sqft: enrichedRoom.area_sqft,
                    wall_thickness_ft: enrichedRoom.wall_thickness_ft,
                    openings: enrichedRoom.openings,
                    position: enrichedRoom.position,
                    adjacent_to: enrichedRoom.adjacent_to,
                    confidence: enrichedRoom.confidence,
                    source: enrichedRoom.source,
                  },
                } as any,
              },
            });
          }
        }
        
        logger.info('Spatial enrichment stored', {
          jobId,
          enrichedRoomCount: enrichment.rooms.length,
          propertyArea: enrichment.property.total_area_sqft,
        });
      }
    } catch (enrichError) {
      // Non-fatal — log and continue
      logger.warn('Spatial enrichment failed (non-fatal)', {
        jobId,
        error: enrichError instanceof Error ? enrichError.message : String(enrichError),
      });
    }
    
    // ========================================
    // 6. Update job status to COMPLETED
    // ========================================
    await db.aIJob.update({
      where: { id: jobId },
      data: {
        status: AIJobStatus.COMPLETED,
        completedAt: new Date(),
        result: {
          roomCount: result.rooms.length,
          overallConfidence: result.overallConfidence,
          warningCount: result.warnings.length,
          analysisVersion: result.analysisVersion,
        },
      },
    });
    
    // ========================================
    // 7. Update project stage (if appropriate)
    // ========================================
    // Only advance stage if rooms were detected
    if (result.rooms.length > 0) {
      await db.project.update({
        where: { id: projectId },
        data: {
          // Don't auto-advance stage - let user confirm rooms first
          // currentStage: 'DESIGN_INTENT',
          updatedAt: new Date(),
        },
      });
    }
    
    // Report 100% complete
    await reportProgress(jobId, 100, 'Complete', `Analysis complete - ${result.rooms.length} rooms detected`);
    
    logger.info('Floor plan analysis job completed successfully', {
      jobId,
      roomCount: result.rooms.length,
    });
    
    return true; // Success - delete message from queue
    
  } catch (error) {
    const isFloorPlanError = error instanceof FloorPlanAnalysisError;
    const errorCode = isFloorPlanError ? error.code : FloorPlanErrorCode.UNKNOWN;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRetryable = isFloorPlanError ? error.isRetryable : true;
    
    // Enhanced error logging with full details
    logger.error('Floor plan analysis job failed', {
      jobId,
      userId,
      projectId,
      errorCode,
      errorMessage,
      isRetryable,
      errorType: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : undefined,
      mimeType: payload.mimeType,
      hasImageUrl: !!payload.imageUrl,
      hasBase64: !!payload.imageBase64,
    });
    
    // Also log to console for immediate visibility
    console.error(`[FLOOR_PLAN_ERROR] Job ${jobId} failed:`, errorMessage, error);
    
    // Update job status to FAILED
    try {
      await db.aIJob.update({
        where: { id: jobId },
        data: {
          status: AIJobStatus.FAILED,
          completedAt: new Date(),
          error: errorMessage,
          result: {
            errorCode,
            isRetryable,
            // Include partial result if available
            partialResult: isFloorPlanError ? error.partialResult : undefined,
          } as any,
        },
      });
    } catch (updateError) {
      logger.error('Failed to update job status', {
        jobId,
        updateError,
      });
    }
    
    // Return based on retryability:
    // - true = delete message (don't retry)
    // - false = keep message (will retry after visibility timeout)
    return !isRetryable;
  }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Store analysis result in database
 */
async function storeAnalysisResult(
  db: PrismaClient,
  projectId: string,
  result: FloorPlanAnalysisResult
): Promise<void> {
  logger.debug('Storing analysis result', {
    projectId,
    roomCount: result.rooms.length,
  });
  
  // Start a transaction to ensure consistency
  await db.$transaction(async (tx) => {
    // Delete any existing PENDING rooms (from previous failed analysis)
    await tx.room.deleteMany({
      where: {
        projectId,
        status: DBRoomStatus.PENDING,
      },
    });
    
    // Insert new rooms
    for (const detectedRoom of result.rooms) {
      const adjacentLabels = mapAdjacentIdsToLabels(
        detectedRoom.adjacentRooms || [],
        result.rooms
      );
      await tx.room.create({
        data: {
          projectId,
          name: detectedRoom.name || `Room ${detectedRoom.tempId.substring(0, 6)}`,
          type: mapRoomTypeToDb(detectedRoom.type) as RoomType,
          status: DBRoomStatus.PENDING, // Always start as PENDING for human confirmation
          geometry: detectedRoom.geometry as any,
          confidence: detectedRoom.confidenceScore,
          metadata: {
            symbolsDetected: detectedRoom.symbolsDetected,
            textDetected: detectedRoom.textDetected,
            reasoning: detectedRoom.reasoning,
            areaEstimate: detectedRoom.areaEstimate,
            areaUnit: detectedRoom.areaUnit,
            adjacentRooms: adjacentLabels,
            detectionTempId: detectedRoom.tempId,
            detectionSource: detectedRoom.detectionSource,
            analysisVersion: result.analysisVersion,
          },
        },
      });
    }
    
    // Store analysis metadata on project
    await tx.project.update({
      where: { id: projectId },
      data: {
        metadata: {
          floorPlanAnalysis: {
            analyzedAt: result.analyzedAt,
            analysisVersion: result.analysisVersion,
            overallConfidence: result.overallConfidence,
            roomCount: result.rooms.length,
            warnings: result.warnings,
            imageMetadata: result.imageMetadata,
          },
        } as any,
        updatedAt: new Date(),
      },
    });
  }, {
    maxWait: 10000, // 10s wait connecting
    timeout: 30000, // 30s timeout executing
  });
  
  logger.info('Analysis result stored', {
    projectId,
    roomsStored: result.rooms.length,
  });
}

/**
 * Map internal RoomType to database RoomType enum
 */
function mapRoomTypeToDb(type: string): string {
  // The database should have the same enum values
  // If not, add mapping logic here
  return type;
}

// ============================================
// CLEANUP
// ============================================

/** Close shared worker DB pool (e.g. graceful shutdown). */
export async function cleanup(): Promise<void> {
  await disconnectWorkerPrisma();
}

// ============================================
// EXPORTS
// ============================================

export type { FloorPlanJobPayload, HandlerResult };
