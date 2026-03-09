/**
 * TatvaOps Vision - Moodboard Generation Core
 * 
 * Main entry point for moodboard generation.
 * This is the worker-friendly version of the moodboard-main logic.
 * 
 * CRITICAL: This module preserves the exact generation quality from moodboard-main.
 * All prompt construction and Gemini interaction logic is extracted unchanged.
 * 
 * Source: moodboard-main/app/api/moodboard/route.ts
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MoodboardJobInput,
  MoodboardJobResult,
  DesignIntent,
  DesignEngineError,
  DesignEngineErrorCode,
} from '../types';
import { getGeminiClient } from '../common/gemini-client';
import {
  buildMoodboardPrompt,
  applyRegenerationOverrides,
  hashPrompt,
} from './buildPrompt';
import { validateDesignIntent } from './parseGeminiResponse';
import { uploadToS3, generateSignedUrl } from '../../lib/s3';
import { logger } from '../../lib/logger';

// ===========================================
// Main Generation Function
// ===========================================

/**
 * Generate a moodboard from design intent.
 * 
 * This is the main entry point for moodboard generation workers.
 * It replaces the API route handler with a clean async function.
 * 
 * SIGNATURE CHANGE:
 * Before (API route): POST handler with NextRequest/NextResponse
 * After (worker): Async function with typed input/output
 * 
 * @param input - Job input with design parameters
 * @returns Job result with asset URL and metadata
 */
export async function generateMoodboard(
  input: MoodboardJobInput
): Promise<MoodboardJobResult> {
  const startTime = Date.now();
  const { jobId, projectId, roomId, userId, designIntent, regenerationOverrides, version = 1 } = input;

  logger.info('Starting moodboard generation', {
    jobId,
    projectId,
    roomId,
    userId,
    version,
    hasOverrides: !!regenerationOverrides,
  });

  try {
    // Step 1: Validate input
    validateMoodboardInput(input);

    // Step 2: Apply regeneration overrides if present
    // PRESERVED: Override logic from moodboard-main
    const effectiveIntent = applyRegenerationOverrides(designIntent, regenerationOverrides);
    validateDesignIntent(effectiveIntent);

    logger.debug('Effective design intent after overrides', {
      jobId,
      roomType: effectiveIntent.roomType,
      aestheticStyle: effectiveIntent.aestheticStyle,
      themeMood: effectiveIntent.themeMood,
    });

    // Step 3: Build the prompt
    // PRESERVED: Exact prompt construction from moodboard-main
    const prompt = buildMoodboardPrompt(effectiveIntent);
    const promptHash = hashPrompt(prompt);

    logger.debug('Built moodboard prompt', {
      jobId,
      promptHash,
      promptLength: prompt.length,
    });

    // Step 4: Call Gemini to generate image
    const geminiClient = getGeminiClient();
    const { imageData, mimeType } = await geminiClient.generateImage(prompt, {
      timeoutMs: 180000, // 3 minutes; image generation can be slow. Override with GEMINI_IMAGE_TIMEOUT_MS.
      temperature: 0.4, // PRESERVED: Temperature from moodboard-main
    });

    logger.info('Gemini image generation complete', {
      jobId,
      mimeType,
      imageDataLength: imageData.length,
    });

    // Step 5: Upload to S3
    const s3Key = buildS3Key(projectId, roomId, version, mimeType);
    const bucket = process.env.S3_BUCKET_MOODBOARDS || 'tatvaops-vision-moodboards';

    await uploadToS3({
      bucket,
      key: s3Key,
      body: Buffer.from(imageData, 'base64'),
      contentType: mimeType,
      metadata: {
        jobId,
        projectId,
        roomId,
        userId,
        version: String(version),
        promptHash,
        generatedAt: new Date().toISOString(),
      },
    });

    logger.info('Uploaded moodboard to S3', {
      jobId,
      bucket,
      key: s3Key,
    });

    // Step 6: Generate signed URL
    const assetUrl = await generateSignedUrl(bucket, s3Key, 3600); // 1 hour expiry

    // Step 7: Generate version ID
    const versionId = uuidv4();
    const durationMs = Date.now() - startTime;

    logger.info('Moodboard generation complete', {
      jobId,
      versionId,
      durationMs,
      promptHash,
    });

    return {
      assetUrl,
      versionId,
      promptHash,
      s3Key,
      mimeType,
      generatedAt: new Date().toISOString(),
      durationMs,
    };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    if (error instanceof DesignEngineError) {
      logger.error('Moodboard generation failed', {
        jobId,
        error: error.toJSON(),
        durationMs,
      });
      throw error;
    }

    logger.error('Unexpected error in moodboard generation', {
      jobId,
      error: String(error),
      durationMs,
    });

    throw new DesignEngineError(
      DesignEngineErrorCode.UNKNOWN_ERROR,
      'Unexpected error during moodboard generation',
      true,
      500,
      { originalError: String(error) }
    );
  }
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Validate moodboard job input.
 */
function validateMoodboardInput(input: MoodboardJobInput): void {
  if (!input.jobId) {
    throw new DesignEngineError(
      DesignEngineErrorCode.MISSING_REQUIRED_FIELD,
      'jobId is required',
      false,
      400
    );
  }

  if (!input.projectId) {
    throw new DesignEngineError(
      DesignEngineErrorCode.MISSING_REQUIRED_FIELD,
      'projectId is required',
      false,
      400
    );
  }

  if (!input.roomId) {
    throw new DesignEngineError(
      DesignEngineErrorCode.MISSING_REQUIRED_FIELD,
      'roomId is required',
      false,
      400
    );
  }

  if (!input.designIntent) {
    throw new DesignEngineError(
      DesignEngineErrorCode.MISSING_REQUIRED_FIELD,
      'designIntent is required',
      false,
      400
    );
  }
}

/**
 * Build S3 key for moodboard storage.
 * 
 * Structure: moodboards/{projectId}/{roomId}/v{version}.{extension}
 */
function buildS3Key(
  projectId: string,
  roomId: string,
  version: number,
  mimeType: string
): string {
  const extension = mimeType.split('/')[1] || 'png';
  const timestamp = Date.now();
  return `moodboards/${projectId}/${roomId}/v${version}_${timestamp}.${extension}`;
}

// ===========================================
// Regeneration Support
// ===========================================

/**
 * Regenerate a moodboard with overrides.
 * This is a convenience wrapper that handles version incrementing.
 * 
 * PRESERVED BEHAVIOR: Exact regeneration logic from moodboard-main.
 * Override fields replace original values; null/undefined fields keep originals.
 */
export async function regenerateMoodboard(
  originalInput: MoodboardJobInput,
  overrides: MoodboardJobInput['regenerationOverrides'],
  newVersion: number
): Promise<MoodboardJobResult> {
  return generateMoodboard({
    ...originalInput,
    regenerationOverrides: overrides,
    version: newVersion,
    jobId: uuidv4(), // New job ID for regeneration
  });
}

