/**
 * TatvaOps Vision - Elevation Generation Core
 * 
 * PASS 4: IMAGE GENERATION
 * 
 * Main module for generating 2D wall elevations.
 * Orchestrates the full multi-pass generation flow.
 * 
 * ============================================================
 * ❗ FLOOR PLAN IS LAW ❗
 * ❗ MOODBOARD IS STYLE ONLY ❗
 * ❗ NO HALLUCINATED GEOMETRY ❗
 * ============================================================
 * 
 * GENERATION FLOW:
 * 1. Validate geometry (PASS 1)
 * 2. Extract style from moodboard (PASS 2)
 * 3. Build wall-specific prompt (PASS 3)
 * 4. Generate elevation image (PASS 4)
 * 5. Upload to S3 and store metadata
 */

import { v4 as uuidv4 } from 'uuid';
import {
  WallDirection,
  ALL_DIRECTIONS,
  RoomElevationGeometry,
  ElevationStyle,
  WallElevationInput,
  WallElevationOutput,
  ElevationJobInput,
  ElevationJobResult,
  ElevationGenerationError,
  ElevationErrorCode,
} from './types';
import {
  extractWallGeometry,
  validateGeometry,
  generateGeometryHash,
} from './geometryValidator';
import {
  extractStyleFromMoodboard,
  getDefaultStyle,
  generateStyleHash,
} from './styleExtractor';
import {
  buildElevationPrompt,
  validatePrompt,
  generatePromptHash,
} from './promptBuilder';
import { getGeminiClient } from '../common/gemini-client';
import { DesignEngineError } from '../types';
import { logger } from '../../lib/logger';

// ============================================
// CONSTANTS
// ============================================

/** Timeout for elevation image generation (2 minutes) */
const ELEVATION_GENERATION_TIMEOUT_MS = 120000;

/** Temperature for consistent architectural output */
const ELEVATION_TEMPERATURE = 0.3; // Lower = more consistent

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

/**
 * Generate all wall elevations for a room.
 * 
 * This is the main entry point for elevation generation.
 * Executes the full multi-pass flow:
 * 
 * PASS 1: Validate geometry
 * PASS 2: Extract style
 * PASS 3: Build prompts
 * PASS 4: Generate images
 * 
 * ============================================================
 * ❗ IF GEOMETRY VALIDATION FAILS, ABORT ENTIRELY ❗
 * No partial generation with invalid geometry.
 * ============================================================
 */
export async function generateRoomElevations(
  input: ElevationJobInput
): Promise<ElevationJobResult> {
  const startTime = Date.now();
  
  logger.info('Starting room elevation generation', {
    jobId: input.jobId,
    roomId: input.roomId,
    projectId: input.projectId,
  });

  const elevations: ElevationJobResult['elevations'] = [];
  const failures: ElevationJobResult['failures'] = [];

  try {
    // =============================================
    // PASS 1: GEOMETRY VALIDATION (MANDATORY)
    // =============================================
    
    if (!input.roomGeometry) {
      throw new ElevationGenerationError(
        ElevationErrorCode.MISSING_ROOM_DATA,
        'Room geometry is required for elevation generation',
        false
      );
    }

    const validationResult = validateGeometry(input.roomGeometry);
    
    if (!validationResult.isValid) {
      logger.error('Geometry validation failed - aborting generation', {
        roomId: input.roomId,
        errors: validationResult.errors,
      });
      
      throw new ElevationGenerationError(
        ElevationErrorCode.INVALID_GEOMETRY,
        `Geometry validation failed: ${validationResult.errors.join('; ')}`,
        false,
        undefined,
        { errors: validationResult.errors, warnings: validationResult.warnings }
      );
    }

    // Log any warnings
    if (validationResult.warnings.length > 0) {
      logger.warn('Geometry validation warnings', {
        roomId: input.roomId,
        warnings: validationResult.warnings,
      });
    }

    // =============================================
    // PASS 2: STYLE EXTRACTION
    // =============================================
    
    let style: ElevationStyle;
    
    if (input.moodboardUrl) {
      try {
        style = await extractStyleFromMoodboard(
          input.moodboardUrl,
          input.roomGeometry.roomType,
          input.roomGeometry.roomName
        );
      } catch (styleError) {
        logger.warn('Style extraction failed, using defaults', {
          roomId: input.roomId,
          error: String(styleError),
        });
        style = getDefaultStyle(input.roomGeometry.roomType);
      }
    } else {
      logger.info('No moodboard provided, using default style', {
        roomId: input.roomId,
        roomType: input.roomGeometry.roomType,
      });
      style = getDefaultStyle(input.roomGeometry.roomType);
    }

    // =============================================
    // PASS 3 & 4: BUILD PROMPTS AND GENERATE IMAGES
    // =============================================
    
    const wallsToGenerate = input.wallsToGenerate || ALL_DIRECTIONS;
    
    for (const direction of wallsToGenerate) {
      try {
        const wallOutput = await generateSingleWallElevation({
          roomGeometry: input.roomGeometry,
          wallDirection: direction,
          style,
          moodboardUrl: input.moodboardUrl,
          version: input.version,
        });
        
        elevations.push({
          direction,
          output: wallOutput,
        });
        
        logger.info('Wall elevation generated successfully', {
          roomId: input.roomId,
          direction,
          durationMs: wallOutput.durationMs,
        });
        
      } catch (wallError) {
        const isRetryable = wallError instanceof ElevationGenerationError
          ? wallError.isRetryable
          : true;
        
        failures.push({
          direction,
          error: String(wallError),
          isRetryable,
        });
        
        logger.error('Wall elevation generation failed', {
          roomId: input.roomId,
          direction,
          error: String(wallError),
        });
      }
    }

    const totalDurationMs = Date.now() - startTime;

    logger.info('Room elevation generation complete', {
      roomId: input.roomId,
      successCount: elevations.length,
      failureCount: failures.length,
      totalDurationMs,
    });

    return {
      roomId: input.roomId,
      elevations,
      failures,
      totalDurationMs,
    };

  } catch (error) {
    // Re-throw ElevationGenerationError as-is
    if (error instanceof ElevationGenerationError) {
      throw error;
    }
    
    // Wrap other errors
    throw new ElevationGenerationError(
      ElevationErrorCode.UNKNOWN,
      `Elevation generation failed: ${String(error)}`,
      true,
      undefined,
      { originalError: String(error) }
    );
  }
}

// ============================================
// SINGLE WALL GENERATION
// ============================================

/**
 * Generate a single wall elevation.
 * 
 * ============================================================
 * ❗ DO NOT MODIFY GEOMETRY IN THE PROMPT ❗
 * Geometry comes from floor plan via validation.
 * ============================================================
 */
async function generateSingleWallElevation(
  input: WallElevationInput
): Promise<WallElevationOutput> {
  const startTime = Date.now();
  const { roomGeometry, wallDirection, style } = input;
  
  const directionKey = wallDirection.toLowerCase() as keyof typeof roomGeometry.walls;
  const wall = roomGeometry.walls[directionKey];
  
  if (!wall) {
    throw new ElevationGenerationError(
      ElevationErrorCode.INVALID_GEOMETRY,
      `Wall not found for direction: ${wallDirection}`,
      false,
      wallDirection
    );
  }

  // =============================================
  // PASS 3: BUILD PROMPT
  // =============================================
  
  const prompt = buildElevationPrompt(wall, style, roomGeometry);
  
  // Validate prompt contains all mandatory constraints
  const promptValidation = validatePrompt(prompt);
  if (!promptValidation.isValid) {
    logger.error('Prompt validation failed', {
      missingConstraints: promptValidation.missingConstraints,
    });
    throw new ElevationGenerationError(
      ElevationErrorCode.PROMPT_GENERATION_FAILED,
      'Generated prompt missing mandatory constraints',
      false,
      wallDirection,
      { missingConstraints: promptValidation.missingConstraints }
    );
  }

  // =============================================
  // PASS 4: GENERATE IMAGE
  // =============================================
  
  logger.info('Generating elevation image', {
    roomId: roomGeometry.roomId,
    direction: wallDirection,
    promptLength: prompt.length,
  });

  const gemini = getGeminiClient();
  
  const { imageData, mimeType } = await gemini.generateImage(prompt, {
    timeoutMs: ELEVATION_GENERATION_TIMEOUT_MS,
    temperature: ELEVATION_TEMPERATURE,
  });

  logger.info('Elevation image generated', {
    roomId: roomGeometry.roomId,
    direction: wallDirection,
    mimeType,
    dataLength: imageData.length,
  });

  // Generate hashes
  const promptHash = generatePromptHash(
    roomGeometry.geometryHash,
    style.styleHash,
    wallDirection
  );

  const durationMs = Date.now() - startTime;

  // Note: S3 upload will be handled by the handler
  // Here we return the base64 data for the handler to upload
  return {
    imageUrl: '', // Will be set after S3 upload
    s3Key: '', // Will be set after S3 upload
    mimeType,
    geometryHash: roomGeometry.geometryHash,
    styleHash: style.styleHash,
    deviationEstimate: 0.03, // TODO: Implement actual deviation estimation
    generatedAt: new Date().toISOString(),
    durationMs,
    // Internal: pass imageData for upload
    // @ts-ignore - Internal property
    _imageData: imageData,
  };
}

// ============================================
// UTILITY EXPORTS
// ============================================

export {
  extractWallGeometry,
  validateGeometry,
  extractStyleFromMoodboard,
  getDefaultStyle,
  buildElevationPrompt,
};


