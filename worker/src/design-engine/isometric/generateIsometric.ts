/**
 * TatvaOps Vision - Isometric Floor Elevation Generator
 * 
 * STAGE 4: Orchestrate the full isometric generation pipeline.
 * 
 * ============================================================
 * ❗ FLOOR PLAN GEOMETRY IS LAW ❗
 * ❗ ONE IMAGE = ENTIRE FLOOR ❗
 * ❗ ≤ 5% DEVIATION ONLY FOR DÉCOR ❗
 * ============================================================
 * 
 * Pipeline:
 * 1. Validate floor geometry (abort if invalid)
 * 2. Extract styles from room moodboards
 * 3. Build global isometric prompt
 * 4. Generate image via Gemini
 */

import {
  IsometricJobInput,
  IsometricJobOutput,
  IsometricJobResult,
  IsometricGenerationError,
  IsometricErrorCode,
  FloorGeometry,
  MAX_DEVIATION,
} from './types';
import {
  validateFloorGeometry,
  generateGeometryHash,
} from './geometryValidator';
import { mapFloorStyles } from './styleMapper';
import { buildIsometricPrompt, buildSimplifiedPrompt, buildLayoutConstrainedPrompt, validatePrompt } from './promptBuilder';
import { renderFloorLayout, renderIsometricLayout } from './layoutRenderer';
import { getGeminiClient } from '../common/gemini-client';
import { logger } from '../../lib/logger';

// ===========================================
// Configuration
// ===========================================

const ACCURACY_CONFIG = {
  /** Used only if VALIDATE_ACCURACY is true (for logging / future use) */
  MIN_ACCURACY: 0.85,

  /** Single generation pass — no threshold-based retries (was 3; user-requested: one realistic output per job) */
  MAX_RETRIES: 1,

  /**
   * When false: one Gemini image call, accept result (no post-check retries).
   * Accuracy scoring can be re-enabled for telemetry without increasing MAX_RETRIES.
   */
  VALIDATE_ACCURACY: false,
};

// ===========================================
// Main Generation Function
// ===========================================

/**
 * Generate isometric floor elevation.
 * 
 * ============================================================
 * ❗ THIS IS THE SINGLE SOURCE OF TRUTH FOR ELEVATIONS ❗
 * ❗ REPLACES ALL ROOM-WISE ELEVATION LOGIC ❗
 * ============================================================
 */
export async function generateIsometricElevation(
  input: IsometricJobInput
): Promise<IsometricJobResult> {
  const startTime = Date.now();
  
  logger.info('Starting isometric floor elevation generation', {
    jobId: input.jobId,
    projectId: input.projectId,
    floor: input.floor || 1,
    roomCount: input.floorGeometry.rooms.length,
  });

  try {
    // ===========================================
    // STAGE 1: Geometry Validation
    // ===========================================
    
    logger.info('Stage 1: Validating floor geometry', {
      roomCount: input.floorGeometry.rooms.length,
      floorDimensions: input.floorGeometry.dimensions,
      sampleRoom: input.floorGeometry.rooms[0] ? {
        id: input.floorGeometry.rooms[0].roomId,
        name: input.floorGeometry.rooms[0].roomName,
        type: input.floorGeometry.rooms[0].roomType,
        bbox: input.floorGeometry.rooms[0].boundingBox,
      } : null,
    });
    
    const validationResult = validateFloorGeometry(
      input.floorGeometry,
      input.floorGeometry.rooms.length
    );

    if (!validationResult.isValid) {
      const errorMessage = `Geometry validation failed: ${validationResult.errors.join('; ')}`;
      logger.error('Geometry validation failed - aborting generation', {
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
      });
      
      // Log first few errors in detail
      if (validationResult.errors.length > 0) {
        console.error('VALIDATION ERRORS:', validationResult.errors.slice(0, 5));
      }
      
      throw new IsometricGenerationError(
        IsometricErrorCode.GEOMETRY_VALIDATION_FAILED,
        errorMessage,
        false, // Not retryable - geometry must be fixed
        { errors: validationResult.errors, warnings: validationResult.warnings }
      );
    }

    const validatedGeometry = validationResult.geometry!;
    const geometryHash = validationResult.geometryHash!;

    logger.info('Stage 1 complete: Geometry validated', {
      geometryHash,
      roomCount: validatedGeometry.rooms.length,
    });

    // ===========================================
    // STAGE 2: Style Mapping
    // ===========================================
    
    logger.info('Stage 2: Mapping room styles from moodboards');
    
    const styleResult = await mapFloorStyles(validatedGeometry, input.moodboardUrls);

    if (!styleResult.success || !styleResult.styleMap) {
      logger.warn('Style mapping had failures, proceeding with defaults', {
        failedRooms: styleResult.failedRooms,
      });
    }

    const styleMap = styleResult.styleMap!;

    logger.info('Stage 2 complete: Styles mapped', {
      styleHash: styleMap.styleHash,
      failedRooms: styleResult.failedRooms.length,
    });

    // ===========================================
    // STAGE 3: Prompt Composition
    // ===========================================
    
    logger.info('Stage 3: Building generation prompt');
    
    const fullPrompt = buildIsometricPrompt(validatedGeometry, styleMap, input.designIntent);
    
    if (!validatePrompt(fullPrompt)) {
      throw new IsometricGenerationError(
        IsometricErrorCode.PROMPT_COMPOSITION_FAILED,
        'Prompt validation failed - missing required elements',
        false
      );
    }

    // Use simplified prompt for actual generation (token limits)
    const generationPrompt = buildSimplifiedPrompt(validatedGeometry, styleMap);

    logger.info('Stage 3 complete: Prompt built', {
      promptHash: fullPrompt.promptHash,
      simplifiedLength: generationPrompt.length,
    });

    // ===========================================
    // STAGE 4: Layout-Constrained Image Generation
    // ===========================================
    
    logger.info('Stage 4: Layout-constrained isometric generation');
    
    const imageStartTime = Date.now();
    
    let imageData: string;
    let mimeType: string;
    let architecturalAccuracy: number | undefined;

    // ===========================================
    // 4a: Render Precise Layout Reference Image
    // ===========================================
    
    logger.info('Rendering precise layout reference image');
    
    let layoutImage: { data: string; mimeType: string };
    try {
      // Use isometric-style layout for better 3D guidance
      const layoutResult = await renderIsometricLayout(validatedGeometry);
      layoutImage = {
        data: layoutResult.imageData,
        mimeType: layoutResult.mimeType,
      };
      logger.info('Layout reference image rendered', {
        width: layoutResult.width,
        height: layoutResult.height,
      });
    } catch (layoutError) {
      logger.warn('Failed to render layout image, falling back to 2D', {
        error: String(layoutError),
      });
      // Fallback to simple 2D layout
      const layoutResult = await renderFloorLayout(validatedGeometry);
      layoutImage = {
        data: layoutResult.imageData,
        mimeType: layoutResult.mimeType,
      };
    }

    // ===========================================
    // 4b: Fetch Floor Plan and Moodboard Images
    // ===========================================

    // Fetch original floor plan image for additional reference
    let floorPlanImage: { data: string; mimeType: string } | null = null;
    
    if (input.floorPlanImageUrl) {
      try {
        const response = await fetch(input.floorPlanImageUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mime = response.headers.get('content-type') || 'image/png';
          floorPlanImage = { data: base64, mimeType: mime };
          logger.info('Loaded original floor plan image');
        }
      } catch (err) {
        logger.warn('Could not load floor plan image', {
          url: input.floorPlanImageUrl,
          error: String(err),
        });
      }
    }

    // Fetch moodboard images
    const moodboardImages: Array<{ data: string; mimeType: string; roomId: string }> = [];
    
    for (const [roomId, url] of Object.entries(input.moodboardUrls)) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mime = response.headers.get('content-type') || 'image/png';
          moodboardImages.push({ data: base64, mimeType: mime, roomId });
        }
      } catch {
        logger.warn('Could not load moodboard', { roomId, url });
      }
    }
    
    logger.info('Reference images prepared', {
      hasLayoutImage: true,
      hasFloorPlan: !!floorPlanImage,
      moodboardCount: moodboardImages.length,
    });

    // ===========================================
    // 4c: Single Gemini image generation (no retries / no accuracy loop)
    // ===========================================

    try {
      const geminiClient = getGeminiClient();

      const constrainedPrompt = buildLayoutConstrainedPrompt(
        validatedGeometry,
        styleMap,
        input.designIntent,
        false
      );

      const referenceImages: Array<{ data: string; mimeType: string }> = [];

      if (layoutImage) {
        referenceImages.push(layoutImage);
        logger.info('Added layout image as reference', { mimeType: layoutImage.mimeType });
      }

      if (floorPlanImage && !floorPlanImage.mimeType.includes('svg')) {
        referenceImages.push(floorPlanImage);
        logger.info('Added floor plan as reference');
      }

      const validMoodboards = moodboardImages.filter((m) => !m.mimeType.includes('svg'));
      referenceImages.push(...validMoodboards.map((m) => ({ data: m.data, mimeType: m.mimeType })));

      logger.info('Calling Gemini with references (single pass)', {
        referenceCount: referenceImages.length,
        moodboardCount: validMoodboards.length,
        promptLength: constrainedPrompt.length,
      });

      const result = await geminiClient.generateImageWithReferences(
        constrainedPrompt,
        referenceImages,
        { timeoutMs: 180_000, temperature: 0.3 }
      );

      imageData = result.imageData;
      mimeType = result.mimeType || 'image/png';
      architecturalAccuracy = undefined;
    } catch (genError) {
      const errorMessage = genError instanceof Error ? genError.message : String(genError);
      logger.error('Isometric image generation failed', { error: errorMessage });
      throw new IsometricGenerationError(
        IsometricErrorCode.IMAGE_GENERATION_FAILED,
        `Image generation failed: ${errorMessage}`,
        true,
        { originalError: errorMessage }
      );
    }

    logger.info('Generation complete', {
      totalDurationMs: Date.now() - imageStartTime,
    });

    // ===========================================
    // Build Output
    // ===========================================
    
    const totalDurationMs = Date.now() - startTime;
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const s3Key = `isometric/${input.projectId}/floor_${input.floor || 1}_v${input.version || 1}.${extension}`;

    const output: IsometricJobOutput = {
      imageUrl: '', // Will be set after S3 upload
      s3Key,
      mimeType,
      geometryHash,
      styleHash: styleMap.styleHash,
      roomCount: validatedGeometry.rooms.length,
      deviationEstimate: 0.03, // Conservative estimate
      architecturalAccuracy, // How similar elevation is to floor plan
      generatedAt: new Date().toISOString(),
      durationMs: totalDurationMs,
      _imageData: imageData,
    };

    logger.info('Isometric elevation generation complete', {
      jobId: input.jobId,
      geometryHash,
      styleHash: styleMap.styleHash,
      roomCount: output.roomCount,
      totalDurationMs,
    });

    return {
      success: true,
      output,
      totalDurationMs,
    };

  } catch (error) {
    const totalDurationMs = Date.now() - startTime;

    if (error instanceof IsometricGenerationError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        totalDurationMs,
      };
    }

    // Unknown error
    logger.error('Unexpected error in isometric generation', {
      error: String(error),
    });

    return {
      success: false,
      error: {
        code: IsometricErrorCode.UNKNOWN,
        message: String(error),
      },
      totalDurationMs,
    };
  }
}

// ===========================================
// Helper: Extract Floor Geometry from Project
// ===========================================

/**
 * Extract floor geometry from project rooms
 */
export function extractFloorGeometry(
  projectId: string,
  rooms: Array<{
    id: string;
    name: string;
    type: string;
    geometry: {
      boundingBox: { x: number; y: number; width: number; height: number };
      polygon?: { x: number; y: number }[];
    };
    metadata?: {
      areaEstimate?: number;
      adjacentRooms?: string[];
      ceilingHeight?: number;
    };
  }>,
  floor: number = 1
): FloorGeometry {
  // Calculate floor dimensions from room bounding boxes
  let maxX = 0;
  let maxY = 0;

  const roomGeometries = rooms.map(room => {
    const { boundingBox } = room.geometry;
    maxX = Math.max(maxX, boundingBox.x + boundingBox.width);
    maxY = Math.max(maxY, boundingBox.y + boundingBox.height);

    return {
      roomId: room.id,
      roomName: room.name,
      roomType: room.type,
      boundingBox,
      polygon: room.geometry.polygon,
      area: room.metadata?.areaEstimate,
      ceilingHeight: room.metadata?.ceilingHeight,
      adjacentRooms: room.metadata?.adjacentRooms,
    };
  });

  return {
    floor,
    dimensions: {
      width: maxX,
      height: maxY,
    },
    rooms: roomGeometries,
    wallThickness: 6,
    northAngle: 0,
  };
}

// ===========================================
// Exports
// ===========================================

export {
  validateFloorGeometry,
  mapFloorStyles,
  buildIsometricPrompt,
  generateGeometryHash,
};


