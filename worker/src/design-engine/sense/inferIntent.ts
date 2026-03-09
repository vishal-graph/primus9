/**
 * TatvaOps Vision - Sense Layer Intent Inference
 * 
 * Main orchestration for Intent Graph inference using Gemini.
 * Downloads images, builds prompts, calls Gemini, parses response.
 */

import { GeminiClient } from '../common/gemini-client';
import { buildSensePrompt, buildGeminiParts } from './promptBuilder';
import { parseGeminiResponse, InferredIntent } from './responseParser';
import { logger } from '../../lib/logger';
import { DesignEngineError, DesignEngineErrorCode } from '../types';
import { config } from '../../config';

// ============================================
// TYPES
// ============================================

export interface IntentInferenceInput {
  images?: string[];           // S3 URLs
  floorPlan?: string;          // S3 URL
  moodboards?: string[];       // S3 URLs
  text?: string;
  hints?: {
    spaceType?: string;
    budget?: string;
    priority?: string;
  };
}

export interface IntentInferenceResult {
  inferred: InferredIntent;
  processingTimeMs: number;
}

// ============================================
// MAIN INFERENCE FUNCTION
// ============================================

/**
 * Infer design intent from user inputs using Gemini
 * 
 * @param input - User inputs (images, text, hints)
 * @returns Inferred intent with confidence scores
 */
export async function inferIntent(
  input: IntentInferenceInput
): Promise<IntentInferenceResult> {
  const startTime = Date.now();

  logger.info('Starting intent inference', {
    imageCount: input.images?.length || 0,
    hasFloorPlan: !!input.floorPlan,
    moodboardCount: input.moodboards?.length || 0,
    hasText: !!input.text,
    hasHints: !!input.hints,
  });

  try {
    // Fetch images from S3 and convert to base64
    const imageParts = await fetchAndConvertImages(input);

    // Build Gemini parts (text prompt + images)
    const geminiParts = buildGeminiParts(input, imageParts);

    // Initialize Gemini client
    const geminiClient = new GeminiClient({
      apiKey: config.geminiApiKey,
      imageModel: config.geminiImageModel,
      textModel: config.geminiTextModel,
      textApiVersion: config.geminiTextApiVersion,
      imageApiVersion: config.geminiImageApiVersion,
    });

    logger.info('Calling Gemini for intent inference');

    // Call Gemini analyzeContent (supports multimodal with text + images)
    const response = await geminiClient.analyzeContent(
      geminiParts,
      {
        timeoutMs: 60000, // 60 second timeout
        temperature: 0.3, // Lower temperature for more consistent output
      }
    );

    logger.info('Received Gemini response', {
      responseLength: response.length,
      responsePreview: response.substring(0, 100),
    });

    // Parse response
    const inferred = parseGeminiResponse(response);

    const processingTimeMs = Date.now() - startTime;

    logger.info('Intent inference completed', {
      processingTimeMs,
      spaceType: inferred.spaceType,
      confidence: inferred.confidence,
    });

    return {
      inferred,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    logger.error({ error, processingTimeMs }, 'Intent inference failed');

    if (error instanceof DesignEngineError) {
      throw error;
    }

    throw new DesignEngineError(
      DesignEngineErrorCode.API_ERROR,
      `Intent inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true,
      500
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch images from S3 URLs and convert to base64 for Gemini
 */
async function fetchAndConvertImages(
  input: IntentInferenceInput
): Promise<Array<{ inlineData: { mimeType: string; data: string } }>> {
  const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

  // Collect all image URLs
  const allImageUrls: string[] = [];
  if (input.images) allImageUrls.push(...input.images);
  if (input.floorPlan) allImageUrls.push(input.floorPlan);
  if (input.moodboards) allImageUrls.push(...input.moodboards);

  // Limit to max 10 images for Gemini
  const imageUrlsToFetch = allImageUrls.slice(0, 10);

  if (imageUrlsToFetch.length === 0) {
    return imageParts;
  }

  logger.info(`Fetching ${imageUrlsToFetch.length} images`);

  // Fetch images in parallel
  const fetchPromises = imageUrlsToFetch.map(async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        logger.warn({ url, status: response.status }, 'Failed to fetch image');
        return null;
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      // Detect mime type from URL or default to png
      let mimeType = 'image/png';
      if (url.includes('.jpg') || url.includes('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (url.includes('.webp')) {
        mimeType = 'image/webp';
      } else if (url.includes('.pdf')) {
        mimeType = 'application/pdf';
      }

      return {
        inlineData: {
          mimeType,
          data: base64,
        },
      };
    } catch (error) {
      logger.error({ error, url }, 'Failed to fetch and convert image');
      return null;
    }
  });

  const results = await Promise.all(fetchPromises);

  // Filter out null results
  for (const result of results) {
    if (result) {
      imageParts.push(result);
    }
  }

  logger.info(`Converted ${imageParts.length} images to base64`);

  return imageParts;
}
