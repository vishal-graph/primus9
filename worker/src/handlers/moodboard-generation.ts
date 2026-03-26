/**
 * TatvaOps Vision - Moodboard Generation Handler
 * 
 * SQS handler for MOODBOARD_GENERATION jobs.
 * Consumes messages from the moodboard-generation queue.
 * 
 * This handler integrates the Design Engine moodboard module
 * with the SQS worker infrastructure.
 * 
 * SUPPORTS TWO PAYLOAD FORMATS:
 * 1. Legacy: Direct DesignIntent (from image analysis)
 * 2. New: IntentPayload from UI forms (requires mapping)
 * 
 * ============================================================
 * ❗ DO NOT MODIFY THE MOODBOARD GENERATION LOGIC ❗
 * Only orchestration and input mapping happens here.
 * See buildPrompt.ts for the actual prompt construction.
 * ============================================================
 */

import { Message } from '@aws-sdk/client-sqs';
import {
  generateMoodboard,
  MoodboardJobInput,
  MoodboardJobResult,
  DesignEngineError,
  DesignEngineErrorCode,
  DesignIntent,
} from '../design-engine';
import { validateJobGuardrails } from '../services/plan-guardrails';
import {
  mapIntentToDesignIntent,
  validateMappedIntent,
  IntentPayload,
  RoomContext,
} from '../design-engine/moodboard/intentMapper';
import { logger } from '../lib/logger';
import { getPrisma } from '../lib/prisma';

// ===========================================
// Database Client (singleton to avoid exhausting DB connection pool)
// ===========================================

function prisma() {
  return getPrisma();
}

// ===========================================
// Job Payload Type
// ===========================================

/**
 * Expected payload from SQS message.
 * 
 * SUPPORTS TWO FORMATS:
 * 
 * FORMAT 1 (Legacy) - Direct DesignIntent:
 * {
 *   "jobId": "uuid",
 *   "designIntent": {
 *     "roomType": "Living Room",
 *     "aestheticStyle": "Japandi",
 *     ...
 *   }
 * }
 * 
 * FORMAT 2 (New) - IntentPayload from UI forms:
 * {
 *   "jobId": "uuid",
 *   "intentPayload": {
 *     "interiorStyles": ["indian-traditional"],
 *     "mood": "warm-cozy",
 *     ...
 *   },
 *   "roomName": "Living Room",
 *   "roomType": "LIVING_ROOM",
 *   "isGlobalIntent": true
 * }
 */
interface MoodboardJobPayload {
  jobId: string;
  projectId: string;
  roomId: string;
  userId: string;
  
  // FORMAT 1: Legacy - direct DesignIntent
  designIntent?: DesignIntent;
  
  // FORMAT 2: New - IntentPayload from UI forms
  intentPayload?: IntentPayload;
  roomName?: string;
  roomType?: string;
  areaEstimate?: number;
  isGlobalIntent?: boolean;  // True if from single-theme flow
  
  // FORMAT 3: NEW - Intent Graph (3D Walkthrough - Sense Layer)
  intentGraphId?: string;  // If present, fetch IntentGraph and map to DesignIntent
  
  // Common fields
  referenceImages?: string[];
  regenerationOverrides?: {
    style?: string | null;
    colorPalette?: string | null;
    mood?: string | null;
    materials?: string | null;
    textures?: string | null;
    furniture?: string | null;
    decor?: string | null;
    lighting?: string | null;
    notes?: string | null;
  };
  version?: number;
}

// ===========================================
// Handler
// ===========================================

/**
 * Handle a moodboard generation job from SQS.
 * 
 * This function:
 * 1. Parses the SQS message
 * 2. Detects payload format (legacy vs new)
 * 3. Maps IntentPayload to DesignIntent if needed
 * 4. Updates job status to PROCESSING
 * 5. Calls the Design Engine to generate the moodboard
 * 6. Stores the result in Postgres
 * 7. Updates job status to COMPLETED or FAILED
 * 
 * ============================================================
 * ❗ MAPPING ONLY - DO NOT MODIFY GENERATION LOGIC ❗
 * The actual moodboard generation is handled by generateMoodboard()
 * which uses the unchanged buildMoodboardPrompt() from moodboard-main.
 * ============================================================
 * 
 * @param message - SQS message
 * @returns True if processed successfully, false if should retry
 */
export async function handleMoodboardGeneration(
  message: Message
): Promise<boolean> {
  const requestId = message.MessageId || 'unknown';
  
  logger.info('Processing moodboard generation job', {
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
      error: String(error),
      body: message.Body?.substring(0, 200),
    });
    // Don't retry malformed messages
    return true;
  }

  // Handle wrapped payload (from createQueueMessage)
  const payload: MoodboardJobPayload = rawPayload.payload || rawPayload;
  const { jobId, projectId, roomId, userId } = payload;

  // Validate required fields
  if (!jobId || !projectId || !roomId || !userId) {
    logger.error('Missing required fields in payload', {
      requestId,
      jobId,
      projectId,
      roomId,
      userId,
    });
    return true; // Don't retry invalid payloads
  }

  // Determine if this is a regeneration
  const isRegeneration = (payload.version || 1) > 1;

  try {
    // Step 0: Validate plan guardrails (project count, regeneration limits)
    try {
      await validateJobGuardrails(userId, projectId, 'MOODBOARD', isRegeneration);
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

    // Step 1: Update job status to PROCESSING
    await updateJobStatus(jobId, 'PROCESSING');

    // Step 2: Resolve DesignIntent (detect format and map if needed)
    let designIntent: DesignIntent;
    
    if (payload.designIntent) {
      // FORMAT 1 (Legacy): Direct DesignIntent - use as-is
      // This preserves exact behavior for existing flows
      designIntent = payload.designIntent;
      
      logger.debug('Using legacy DesignIntent format', {
        jobId,
        roomType: designIntent.roomType,
      });
      
    } else if (payload.intentGraphId) {
      // FORMAT 3 (NEW): Intent Graph from 3D Walkthrough / Sense Layer
      // Fetch Intent Graph and map to IntentPayload, then to DesignIntent
      
      logger.info('Fetching Intent Graph from Sense Layer', {
        jobId,
        intentGraphId: payload.intentGraphId,
        projectId,
      });

      // Fetch Intent Graph from database
      const intentGraph = await prisma().intentGraph.findUnique({
        where: { id: payload.intentGraphId },
      });

      if (!intentGraph) {
        throw new DesignEngineError(
          DesignEngineErrorCode.INVALID_INPUT,
          `Intent Graph not found: ${payload.intentGraphId}`,
          false,
          404
        );
      }

      // Import mapper
      const { mapIntentGraphToIntentPayload } = await import(
        '../design-engine/sense/intentGraphMapper'
      );

      // Map Intent Graph → IntentPayload
      const intentPayload = mapIntentGraphToIntentPayload(
        intentGraph.inferred as any
      );

      logger.info('Intent Graph mapped to IntentPayload', {
        jobId,
        intentGraphId: payload.intentGraphId,
        spaceType: (intentGraph.inferred as any).spaceType,
      });

      // Build room context for mapping
      const roomContext: RoomContext = {
        roomId,
        roomName: payload.roomName || 'Room',
        roomType: payload.roomType || 'LIVING_ROOM',
        areaEstimate: payload.areaEstimate,
      };

      // Map IntentPayload → DesignIntent (using existing mapper)
      designIntent = mapIntentToDesignIntent(intentPayload, roomContext);

      logger.info('Intent Graph fully mapped to DesignIntent', {
        jobId,
        roomType: designIntent.roomType,
        aestheticStyle: designIntent.aestheticStyle,
      });
      
    } else if (payload.intentPayload) {
      // FORMAT 2 (New): IntentPayload from UI forms - needs mapping
      // This is the NEW FLOW from Intent stage
      
      logger.info('Mapping IntentPayload to DesignIntent', {
        jobId,
        roomId,
        roomType: payload.roomType,
        isGlobalIntent: payload.isGlobalIntent,
      });

      // Build room context for mapping
      const roomContext: RoomContext = {
        roomId,
        roomName: payload.roomName || 'Room',
        roomType: payload.roomType || 'UNCLASSIFIED',
        areaEstimate: payload.areaEstimate,
      };

      // ============================================================
      // ❗ MAPPING HAPPENS HERE - NO PROMPT CHANGES ❗
      // The mapper converts IntentPayload → DesignIntent
      // Then generateMoodboard() uses unchanged buildMoodboardPrompt()
      // ============================================================
      designIntent = mapIntentToDesignIntent(payload.intentPayload, roomContext);

      // Validate the mapped intent
      const validation = validateMappedIntent(designIntent);
      if (!validation.valid) {
        logger.error('Mapped intent validation failed', {
          jobId,
          errors: validation.errors,
        });
        throw new Error(`Invalid mapped intent: ${validation.errors.join(', ')}`);
      }

      logger.debug('Mapped intent to design intent', {
        jobId,
        aestheticStyle: designIntent.aestheticStyle,
        themeMood: designIntent.themeMood,
        colorPalette: designIntent.colorPalette,
      });
      
    } else {
      throw new Error('No designIntent or intentPayload provided in payload');
    }

    // Step 3: Build input for Design Engine
    // ============================================================
    // ❗ THIS INPUT GOES DIRECTLY TO generateMoodboard() ❗
    // Which uses buildMoodboardPrompt() UNCHANGED from moodboard-main
    // ============================================================
    const input: MoodboardJobInput = {
      jobId,
      projectId,
      roomId,
      userId,
      designIntent,  // Either legacy or mapped
      referenceImages: payload.referenceImages,
      regenerationOverrides: payload.regenerationOverrides,
      version: payload.version || 1,
    };

    // Step 4: Generate moodboard using Design Engine
    // ============================================================
    // ❗ DO NOT MODIFY - CALLS UNCHANGED MOODBOARD-MAIN LOGIC ❗
    // ============================================================
    const result: MoodboardJobResult = await generateMoodboard(input);

    // Step 5: Store asset version in database
    await storeAssetVersion({
      jobId,
      projectId,
      roomId,
      userId,
      result,
      version: payload.version || 1,
    });

    // Step 6: Store moodboard record in room
    await storeMoodboardInRoom({
      jobId,
      roomId,
      result,
      version: payload.version || 1,
      designIntent,
    });

    // Step 7: Update job status to COMPLETED
    await updateJobStatus(jobId, 'COMPLETED', {
      result: {
        moodboardId: result.versionId,
        moodboardUrl: result.assetUrl,
        assetUrl: result.assetUrl,
        versionId: result.versionId,
        promptHash: result.promptHash,
        s3Key: result.s3Key,
      },
    });

    logger.info('Moodboard generation completed', {
      requestId,
      jobId,
      versionId: result.versionId,
      durationMs: result.durationMs,
      isGlobalIntent: payload.isGlobalIntent || false,
    });

    return true;

  } catch (error) {
    const isRetryable = error instanceof DesignEngineError && error.retryable;
    const errorDetails = error instanceof DesignEngineError 
      ? error.toJSON() 
      : { message: String(error) };

    logger.error('Moodboard generation failed', {
      requestId,
      jobId,
      isRetryable,
      error: errorDetails,
    });

    // Update job status to FAILED
    await updateJobStatus(jobId, 'FAILED', {
      error: errorDetails,
    });

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
    await prisma().aIJob.update({
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
 * Store the generated asset version.
 * Uses the AssetVersion model from Prisma schema with correct field mappings.
 */
async function storeAssetVersion(params: {
  jobId: string;
  projectId: string;
  roomId: string;
  userId: string;
  result: MoodboardJobResult;
  version: number;
}): Promise<void> {
  const { jobId, projectId, roomId, userId, result, version } = params;

  try {
    // Extract bucket name from s3Key (format: bucket/key or just key)
    const s3Bucket = process.env.AWS_S3_MOODBOARD_BUCKET || 'tatvaops-moodboards';
    
    // Use upsert to handle version conflicts (regeneration)
    await prisma().assetVersion.upsert({
      where: {
        projectId_roomId_assetType_version: {
          projectId,
          roomId,
          assetType: 'MOODBOARD',
          version,
        },
      },
      update: {
        s3Key: result.s3Key,
        contentType: result.mimeType || 'image/png',
        metadata: {
          jobId,
          promptHash: result.promptHash,
          generatedAt: result.generatedAt,
          durationMs: result.durationMs,
          assetUrl: result.assetUrl,
        },
        isLatest: true,
      },
      create: {
        id: result.versionId,
        projectId,
        roomId,
        assetType: 'MOODBOARD',
        version,
        s3Bucket,
        s3Key: result.s3Key,
        contentType: result.mimeType || 'image/png',
        createdBy: userId,
        metadata: {
          jobId,
          promptHash: result.promptHash,
          generatedAt: result.generatedAt,
          durationMs: result.durationMs,
          assetUrl: result.assetUrl,
        },
        isLatest: true,
      },
    });

    // Mark previous versions as not latest
    if (version > 1) {
      await prisma().assetVersion.updateMany({
        where: {
          projectId,
          roomId,
          assetType: 'MOODBOARD',
          version: { lt: version },
        },
        data: {
          isLatest: false,
        },
      });
    }

    logger.debug('Asset version stored', {
      versionId: result.versionId,
      projectId,
      roomId,
      version,
    });
  } catch (error) {
    logger.error('Failed to store asset version', {
      versionId: result.versionId,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Store/update moodboard in room record for frontend retrieval.
 * Uses the RoomMoodboard model from Prisma schema.
 * Uses upsert to handle regeneration (same room + version).
 */
async function storeMoodboardInRoom(params: {
  jobId: string;
  roomId: string;
  result: MoodboardJobResult;
  version: number;
  designIntent?: DesignIntent;
}): Promise<void> {
  const { jobId, roomId, result, version, designIntent } = params;

  const colorPalette = designIntent?.colorPalette?.split(',').map(c => c.trim()) || [];
  const style = designIntent?.aestheticStyle || 'Generated';
  const metadata = {
    mimeType: result.mimeType,
    generatedAt: result.generatedAt,
    durationMs: result.durationMs,
    roomType: designIntent?.roomType,
    themeMood: designIntent?.themeMood,
  };

  try {
    // Use upsert to handle regeneration (same room + version)
    await prisma().roomMoodboard.upsert({
      where: {
        roomId_version: {
          roomId,
          version,
        },
      },
      update: {
        imageUrl: result.assetUrl,
        s3Key: result.s3Key,
        style,
        colorPalette,
        promptHash: result.promptHash,
        jobId,
        metadata,
      },
      create: {
        roomId,
        version,
        imageUrl: result.assetUrl,
        s3Key: result.s3Key,
        style,
        colorPalette,
        promptHash: result.promptHash,
        jobId,
        metadata,
      },
    });

    logger.info('Moodboard stored in room', {
      roomId,
      version,
      s3Key: result.s3Key,
      jobId,
    });
  } catch (error) {
    // Log full error for debugging
    logger.warn('Failed to store moodboard in room', {
      roomId,
      version,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// ===========================================
// Cleanup
// ===========================================

/**
 * Cleanup (no-op when using shared Prisma singleton; connection is managed by worker lifecycle).
 */
export async function cleanupMoodboardHandler(): Promise<void> {
  // Do not disconnect: we use getPrisma() singleton shared across handlers.
}
