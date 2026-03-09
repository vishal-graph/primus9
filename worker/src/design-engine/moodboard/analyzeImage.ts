/**
 * TatvaOps Vision - Image Analysis
 * 
 * Analyzes reference images to extract design intent.
 * Extracted from moodboard-main API routes.
 * 
 * Source: moodboard-main/app/api/analyze-image/route.ts
 * Source: moodboard-main/app/api/summary/route.ts
 */

import {
  ImageAnalysisJobInput,
  ImageAnalysisResult,
  DesignIntent,
  DesignEngineError,
  DesignEngineErrorCode,
  GeminiPart,
} from '../types';
import { getGeminiClient } from '../common/gemini-client';
import { buildImageAnalysisPrompt, buildSummaryAnalysisPrompt } from './buildPrompt';
import {
  parseDesignIntentResponse,
  parseSummaryAnalysisResponse,
} from './parseGeminiResponse';
import { downloadFromS3, isS3Url, parseS3Url } from '../../lib/s3';
import { logger } from '../../lib/logger';

// ===========================================
// Image Analysis
// ===========================================

/**
 * Analyze an image to extract design intent.
 * 
 * REFACTORED FROM: moodboard-main/app/api/analyze-image/route.ts
 * 
 * Changes from original:
 * - No longer depends on NextRequest/FormData
 * - Accepts S3 URL or base64 data
 * - Returns structured result instead of NextResponse
 * 
 * @param input - Analysis job input
 * @returns Analysis result with design intent
 */
export async function analyzeImage(
  input: ImageAnalysisJobInput
): Promise<ImageAnalysisResult> {
  const { jobId, projectId, userId, imageSource, mimeType: inputMimeType } = input;

  logger.info('Starting image analysis', {
    jobId,
    projectId,
    userId,
    imageSourceType: isS3Url(imageSource) ? 's3' : 'base64',
  });

  try {
    // Step 1: Get image data
    const { data: imageData, mimeType } = await resolveImageSource(
      imageSource,
      inputMimeType
    );

    logger.debug('Image data resolved', {
      jobId,
      mimeType,
      dataLength: imageData.length,
    });

    // Step 2: Build parts for Gemini
    // PRESERVED: Part structure from moodboard-main/app/api/analyze-image/route.ts lines 74-82
    const parts: GeminiPart[] = [
      {
        inlineData: {
          mimeType,
          data: imageData,
        },
      },
      { text: buildImageAnalysisPrompt() },
    ];

    // Step 3: Call Gemini
    const geminiClient = getGeminiClient();
    const rawText = await geminiClient.analyzeContent(parts, {
      timeoutMs: 60000, // 60 second timeout
    });

    logger.debug('Gemini analysis complete', {
      jobId,
      responseLength: rawText.length,
    });

    // Step 4: Parse response
    const designIntent = parseDesignIntentResponse(rawText);

    logger.info('Image analysis complete', {
      jobId,
      roomType: designIntent.roomType,
      aestheticStyle: designIntent.aestheticStyle,
    });

    return {
      designIntent,
      summary: buildQuickSummary(designIntent),
      confidence: calculateConfidence(designIntent),
    };

  } catch (error) {
    if (error instanceof DesignEngineError) {
      logger.error('Image analysis failed', {
        jobId,
        error: error.toJSON(),
      });
      throw error;
    }

    logger.error('Unexpected error in image analysis', {
      jobId,
      error: String(error),
    });

    throw new DesignEngineError(
      DesignEngineErrorCode.UNKNOWN_ERROR,
      'Unexpected error during image analysis',
      true,
      500,
      { originalError: String(error) }
    );
  }
}

/**
 * Analyze image with user-provided hints.
 * Combines image analysis with text context.
 * 
 * REFACTORED FROM: moodboard-main/app/api/summary/route.ts
 * 
 * @param imageSource - S3 URL or base64 data
 * @param userHints - Optional user-provided design hints
 * @returns Combined analysis with summary
 */
export async function analyzeImageWithHints(
  imageSource: string | null,
  userHints: {
    roomType?: string;
    style?: string;
    colorPalette?: string;
    materials?: string;
    textures?: string;
    mood?: string;
    furniture?: string;
    decor?: string;
    lighting?: string;
    technology?: string;
    budget?: string;
    renovationScope?: string;
    timeframe?: string;
    imageLinks?: string;
  }
): Promise<{ summary: string; designIntent: DesignIntent }> {
  logger.info('Starting image analysis with hints', {
    hasImage: !!imageSource,
    hasHints: Object.values(userHints).some((v) => v),
  });

  try {
    // Build parts
    const parts: GeminiPart[] = [];

    // Add image if provided
    if (imageSource) {
      const { data: imageData, mimeType } = await resolveImageSource(imageSource);
      parts.push({
        inlineData: {
          mimeType,
          data: imageData,
        },
      });
    }

    // Add prompt with user hints
    parts.push({ text: buildSummaryAnalysisPrompt(userHints) });

    // Call Gemini
    const geminiClient = getGeminiClient();
    const rawText = await geminiClient.analyzeContent(parts, {
      timeoutMs: 60000,
    });

    // Parse response
    return parseSummaryAnalysisResponse(rawText, userHints);

  } catch (error) {
    if (error instanceof DesignEngineError) {
      throw error;
    }

    throw new DesignEngineError(
      DesignEngineErrorCode.UNKNOWN_ERROR,
      'Unexpected error during analysis with hints',
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
 * Resolve image source to base64 data.
 * Handles S3 URLs and direct base64 data.
 * 
 * REPLACES: FormData/File handling from moodboard-main
 * 
 * @param source - S3 URL (s3://bucket/key) or base64 data
 * @param fallbackMimeType - MIME type if not auto-detected
 */
async function resolveImageSource(
  source: string,
  fallbackMimeType?: string
): Promise<{ data: string; mimeType: string }> {
  // Handle S3 URLs
  if (isS3Url(source)) {
    const { bucket, key } = parseS3Url(source);
    
    logger.debug('Downloading image from S3', { bucket, key });
    
    const { data, contentType } = await downloadFromS3(bucket, key);
    return {
      data: data.toString('base64'),
      mimeType: contentType || fallbackMimeType || 'image/png',
    };
  }

  // Handle base64 data URLs (data:image/png;base64,...)
  if (source.startsWith('data:')) {
    // PRESERVED: Base64 data URL parsing from moodboard-main
    // FROM: moodboard-main/app/api/summary/route.ts lines 104-117
    const matches = source.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      return {
        mimeType: matches[1],
        data: matches[2],
      };
    }
    
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_IMAGE_FORMAT,
      'Invalid base64 data URL format',
      false,
      400
    );
  }

  // Handle raw base64 data
  if (source.length > 100 && /^[A-Za-z0-9+/=]+$/.test(source.substring(0, 100))) {
    return {
      data: source,
      mimeType: fallbackMimeType || 'image/png',
    };
  }

  throw new DesignEngineError(
    DesignEngineErrorCode.INVALID_IMAGE_FORMAT,
    'Image source must be S3 URL, base64 data URL, or raw base64 data',
    false,
    400
  );
}

/**
 * Build a quick summary from design intent.
 */
function buildQuickSummary(intent: DesignIntent): string {
  const parts = [];
  
  if (intent.aestheticStyle) {
    parts.push(intent.aestheticStyle);
  }
  if (intent.roomType) {
    parts.push(intent.roomType.toLowerCase());
  }
  if (intent.themeMood) {
    parts.push(`with a ${intent.themeMood.toLowerCase()} atmosphere`);
  }
  
  return parts.length > 0
    ? `A ${parts.join(' ')} featuring ${intent.colorPalette || 'harmonious colors'}.`
    : 'Interior design analysis complete.';
}

/**
 * Calculate confidence score based on filled fields.
 */
function calculateConfidence(intent: DesignIntent): number {
  const fields = [
    intent.roomType,
    intent.aestheticStyle,
    intent.themeMood,
    intent.colorPalette,
    intent.materialPreferences,
    intent.texturePreferences,
    intent.furniturePreferences,
    intent.decorPreferences,
    intent.lightingPreferences,
  ];
  
  const filledCount = fields.filter((f) => f && f.trim().length > 0).length;
  return Math.round((filledCount / fields.length) * 100);
}

