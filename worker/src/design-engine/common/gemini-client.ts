/**
 * TatvaOps Vision - Gemini API Client
 * 
 * Abstracted Gemini API client for worker-based execution.
 * Extracted from moodboard-main API routes with improved error handling.
 * 
 * Source: moodboard-main/app/api/moodboard/route.ts
 * Source: moodboard-main/app/api/analyze-image/route.ts
 */

import {
  GeminiGenerateRequest,
  GeminiResponse,
  GeminiPart,
  GeminiCallOptions,
  DesignEngineError,
  DesignEngineErrorCode,
} from '../types';
import { logger } from '../../lib/logger';

// ===========================================
// Default Configuration
// ===========================================
// Image generation can take 2–3+ minutes under load; use 3 min default. Override with GEMINI_IMAGE_TIMEOUT_MS.
const DEFAULT_IMAGE_TIMEOUT_MS = 180000; // 3 minutes for image generation
const DEFAULT_TEXT_TIMEOUT_MS = 60000;  // 60 seconds for text analysis
const DEFAULT_IMAGE_TEMPERATURE = 0.4;

function getImageTimeoutMs(overrideMs?: number): number {
  const envMs = process.env.GEMINI_IMAGE_TIMEOUT_MS ? parseInt(process.env.GEMINI_IMAGE_TIMEOUT_MS, 10) : NaN;
  return overrideMs ?? (Number.isFinite(envMs) ? envMs : DEFAULT_IMAGE_TIMEOUT_MS);
}

// ===========================================
// Gemini Client Class
// ===========================================

/** Errors that warrant retrying with fallback image model (not content-blocked or bad request). */
function isRetryableImageError(error: unknown): boolean {
  if (!(error instanceof DesignEngineError)) return true;
  return error.code !== DesignEngineErrorCode.CONTENT_BLOCKED && error.code !== DesignEngineErrorCode.MISSING_API_KEY;
}

export class GeminiClient {
  private readonly apiKey: string;
  private readonly imageModel: string;
  private readonly imageModelFallback: string | undefined;
  private readonly textModel: string;
  private readonly imageApiVersion: string;
  private readonly textApiVersion: string;

  constructor(config: {
    apiKey: string;
    imageModel: string;
    textModel: string;
    imageApiVersion?: string;
    textApiVersion?: string;
    imageModelFallback?: string;
  }) {
    if (!config.apiKey) {
      throw new DesignEngineError(
        DesignEngineErrorCode.MISSING_API_KEY,
        'GEMINI_API_KEY is not configured',
        false,
        500
      );
    }

    this.apiKey = config.apiKey;
    this.imageModel = config.imageModel;
    this.imageModelFallback = config.imageModelFallback;
    this.textModel = config.textModel;
    this.imageApiVersion = config.imageApiVersion || 'v1beta';
    this.textApiVersion = config.textApiVersion || 'v1';
  }

  /**
   * Generate an image using Gemini's image generation model.
   * Tries primary model up to 2 times; if both fail, uses fallback model if configured.
   *
   * @param prompt - The prompt for image generation
   * @param options - Call options (timeout, temperature, etc.)
   * @returns Base64-encoded image data
   */
  async generateImage(
    prompt: string,
    options: GeminiCallOptions = {}
  ): Promise<{ imageData: string; mimeType: string }> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await this.generateImageWithModel(prompt, this.imageModel, options);
      } catch (err) {
        lastError = err;
        if (!isRetryableImageError(err)) throw err;
        logger.warn('Primary image model failed, retrying primary', {
          primary: this.imageModel,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (this.imageModelFallback && isRetryableImageError(lastError)) {
      logger.warn('Primary image model failed twice, using fallback', {
        primary: this.imageModel,
        fallback: this.imageModelFallback,
        error: lastError instanceof Error ? (lastError as Error).message : String(lastError),
      });
      return await this.generateImageWithModel(prompt, this.imageModelFallback, options);
    }
    throw lastError;
  }

  /**
   * Internal: generate image using a specific model (used for primary and fallback).
   */
  private async generateImageWithModel(
    prompt: string,
    model: string,
    options: GeminiCallOptions = {}
  ): Promise<{ imageData: string; mimeType: string }> {
    const timeoutMs = getImageTimeoutMs(options.timeoutMs);
    const temperature = options.temperature ?? DEFAULT_IMAGE_TEMPERATURE;

    const url = `https://generativelanguage.googleapis.com/${this.imageApiVersion}/models/${model}:generateContent?key=${this.apiKey}`;

    const requestBody: GeminiGenerateRequest = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        // PRESERVED: Explicit image output request
        // FROM: moodboard-main/app/api/moodboard/route.ts lines 128-131
        responseModalities: ['Image'],
        temperature,
      },
    };

    // PRESERVED: AbortController with timeout
    // FROM: moodboard-main/app/api/moodboard/route.ts lines 113-114
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.debug('Calling Gemini image generation API', {
        model,
        promptLength: prompt.length,
        timeoutMs,
        temperature,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: options.abortSignal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini image API error', { status: response.status, error: errorText });
        throw new DesignEngineError(
          DesignEngineErrorCode.API_ERROR,
          'Failed to generate moodboard image',
          response.status >= 500, // Retry only on server errors
          response.status,
          { errorText }
        );
      }

      const data = await response.json() as GeminiResponse;

      // Check for blocked content
      if (data.promptFeedback?.blockReason) {
        throw new DesignEngineError(
          DesignEngineErrorCode.CONTENT_BLOCKED,
          `Content blocked: ${data.promptFeedback.blockReason}`,
          false,
          400
        );
      }

      // PRESERVED: Extract image from response parts
      // FROM: moodboard-main/app/api/moodboard/route.ts lines 151-159
      const parts = data.candidates?.[0]?.content?.parts || [];
      let imageData: string | undefined;
      let mimeType = 'image/png'; // Default

      for (const part of parts) {
        if ('inlineData' in part && part.inlineData?.data) {
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }

      if (!imageData) {
        // PRESERVED: Check if model returned text instead of image
        // FROM: moodboard-main/app/api/moodboard/route.ts lines 166-175
        const textResponse = parts.find((p): p is { text: string } => 'text' in p)?.text;
        if (textResponse) {
          logger.error('Model returned text instead of image', { textResponse });
          throw new DesignEngineError(
            DesignEngineErrorCode.TEXT_INSTEAD_OF_IMAGE,
            'The image generation model returned text instead of an image. Check GEMINI_IMAGE_MODEL configuration.',
            false,
            500,
            { textResponse }
          );
        }

        logger.error('No image data in response', { response: JSON.stringify(data) });
        throw new DesignEngineError(
          DesignEngineErrorCode.NO_IMAGE_GENERATED,
          'No image data returned from model',
          true, // Retry - might be transient
          500
        );
      }

      logger.info('Image generated successfully', { 
        mimeType, 
        dataLength: imageData.length 
      });

      return { imageData, mimeType };

    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof DesignEngineError) {
        throw error;
      }

      // PRESERVED: Timeout and connection error handling
      // FROM: moodboard-main/app/api/moodboard/route.ts lines 184-200
      const fetchError = error as { name?: string; code?: string; cause?: { code?: string } };

      if (fetchError.name === 'AbortError') {
        logger.error('Image generation timeout', { timeoutMs });
        throw new DesignEngineError(
          DesignEngineErrorCode.API_TIMEOUT,
          'Request timed out. Image generation may require more time.',
          true,
          504
        );
      }

      if (
        fetchError.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        fetchError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'
      ) {
        logger.error('Connection timeout', { error: fetchError });
        throw new DesignEngineError(
          DesignEngineErrorCode.CONNECTION_TIMEOUT,
          'Connection timeout to AI service',
          true,
          504
        );
      }

      logger.error('Unexpected error during image generation', { error });
      throw new DesignEngineError(
        DesignEngineErrorCode.UNKNOWN_ERROR,
        'Unexpected error while generating image',
        true,
        500,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Generate an image using reference images (moodboards) for style guidance.
   * Passes the reference images to Gemini along with the prompt.
   * 
   * @param prompt - The prompt for image generation
   * @param referenceImages - Array of reference images (moodboards) to guide style
   * @param options - Call options (timeout, temperature, etc.)
   * @returns Base64-encoded image data
   */
  async generateImageWithReferences(
    prompt: string,
    referenceImages: Array<{ data: string; mimeType: string }>,
    options: GeminiCallOptions = {}
  ): Promise<{ imageData: string; mimeType: string }> {
    // If no reference images, fall back to standard generation (which has its own fallback)
    if (!referenceImages || referenceImages.length === 0) {
      return this.generateImage(prompt, options);
    }

    let lastErr: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await this.generateImageWithReferencesWithModel(prompt, referenceImages, this.imageModel, options);
      } catch (err) {
        lastErr = err;
        if (!isRetryableImageError(err)) throw err;
        logger.warn('Primary image model failed (with references), retrying primary', {
          primary: this.imageModel,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (this.imageModelFallback && isRetryableImageError(lastErr)) {
      logger.warn('Primary image model failed twice (with references), using fallback', {
        primary: this.imageModel,
        fallback: this.imageModelFallback,
        error: lastErr instanceof Error ? (lastErr as Error).message : String(lastErr),
      });
      return await this.generateImageWithReferencesWithModel(prompt, referenceImages, this.imageModelFallback, options);
    }
    throw lastErr;
  }

  private async generateImageWithReferencesWithModel(
    prompt: string,
    referenceImages: Array<{ data: string; mimeType: string }>,
    model: string,
    options: GeminiCallOptions = {}
  ): Promise<{ imageData: string; mimeType: string }> {
    const timeoutMs = getImageTimeoutMs(options.timeoutMs);
    const temperature = options.temperature ?? DEFAULT_IMAGE_TEMPERATURE;

    const url = `https://generativelanguage.googleapis.com/${this.imageApiVersion}/models/${model}:generateContent?key=${this.apiKey}`;

    // Build parts array with reference images first, then text prompt
    const parts: GeminiPart[] = [];
    
    // Add reference images with clear labeling
    for (let i = 0; i < referenceImages.length; i++) {
      const ref = referenceImages[i];
      parts.push({
        inlineData: {
          mimeType: ref.mimeType,
          data: ref.data,
        },
      });
    }
    
    // Add the main prompt with instructions to match reference styles
    parts.push({ text: prompt });

    const requestBody: GeminiGenerateRequest = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        responseModalities: ['Image'],
        temperature,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.info('Calling Gemini image generation with references', {
        model,
        promptLength: prompt.length,
        referenceCount: referenceImages.length,
        timeoutMs,
        temperature,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: options.abortSignal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini image API error (with references)', { 
          status: response.status, 
          error: errorText,
          referenceCount: referenceImages.length,
        });
        throw new DesignEngineError(
          DesignEngineErrorCode.API_ERROR,
          'Failed to generate image with references',
          response.status >= 500,
          response.status,
          { errorText }
        );
      }

      const data = await response.json() as GeminiResponse;

      // Check for blocked content
      if (data.promptFeedback?.blockReason) {
        throw new DesignEngineError(
          DesignEngineErrorCode.CONTENT_BLOCKED,
          `Content blocked: ${data.promptFeedback.blockReason}`,
          false,
          400
        );
      }

      // Extract image from response parts
      const responseParts = data.candidates?.[0]?.content?.parts || [];
      let imageData: string | undefined;
      let mimeType = 'image/png';

      for (const part of responseParts) {
        if ('inlineData' in part && part.inlineData?.data) {
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }

      if (!imageData) {
        const textResponse = responseParts.find((p): p is { text: string } => 'text' in p)?.text;
        if (textResponse) {
          logger.error('Model returned text instead of image (with references)', { textResponse });
          throw new DesignEngineError(
            DesignEngineErrorCode.TEXT_INSTEAD_OF_IMAGE,
            'The image generation model returned text instead of an image.',
            false,
            500,
            { textResponse }
          );
        }

        logger.error('No image data in response (with references)', { response: JSON.stringify(data) });
        throw new DesignEngineError(
          DesignEngineErrorCode.NO_IMAGE_GENERATED,
          'No image data returned from model',
          true,
          500
        );
      }

      logger.info('Image generated successfully with references', { 
        mimeType, 
        dataLength: imageData.length,
        referenceCount: referenceImages.length,
      });

      return { imageData, mimeType };

    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof DesignEngineError) {
        throw error;
      }

      const fetchError = error as { name?: string; code?: string; cause?: { code?: string } };

      if (fetchError.name === 'AbortError') {
        logger.error('Image generation timeout (with references)', { timeoutMs });
        throw new DesignEngineError(
          DesignEngineErrorCode.API_TIMEOUT,
          'Request timed out. Image generation may require more time.',
          true,
          504
        );
      }

      if (
        fetchError.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        fetchError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'
      ) {
        throw new DesignEngineError(
          DesignEngineErrorCode.CONNECTION_TIMEOUT,
          'Connection timeout to AI service',
          true,
          504
        );
      }

      logger.error('Unexpected error during image generation with references', { error });
      throw new DesignEngineError(
        DesignEngineErrorCode.UNKNOWN_ERROR,
        'Unexpected error while generating image',
        true,
        500,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Analyze text/image using Gemini's text model.
   * 
   * PRESERVED FROM: moodboard-main/app/api/analyze-image/route.ts
   * PRESERVED FROM: moodboard-main/app/api/summary/route.ts
   * 
   * @param parts - Content parts (text and/or images)
   * @param options - Call options
   * @returns Raw text response from model
   */
  async analyzeContent(
    parts: GeminiPart[],
    options: GeminiCallOptions = {}
  ): Promise<string> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TEXT_TIMEOUT_MS;

    // Use configured API version for text models
    const url = `https://generativelanguage.googleapis.com/${this.textApiVersion}/models/${this.textModel}:generateContent?key=${this.apiKey}`;

    const requestBody: GeminiGenerateRequest = {
      contents: [
        {
          parts,
        },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.debug('Calling Gemini text analysis API', {
        model: this.textModel,
        partsCount: parts.length,
        timeoutMs,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: options.abortSignal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini text API error', { status: response.status, error: errorText });
        throw new DesignEngineError(
          DesignEngineErrorCode.API_ERROR,
          'Failed to analyze content',
          response.status >= 500,
          response.status,
          { errorText }
        );
      }

      const data = await response.json() as GeminiResponse;

      // Check for blocked content
      if (data.promptFeedback?.blockReason) {
        throw new DesignEngineError(
          DesignEngineErrorCode.CONTENT_BLOCKED,
          `Content blocked: ${data.promptFeedback.blockReason}`,
          false,
          400
        );
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0];
      const textContent = rawText && 'text' in rawText ? rawText.text : undefined;

      // PRESERVED: Validate response
      // FROM: moodboard-main/app/api/analyze-image/route.ts lines 150-162
      if (!textContent || typeof textContent !== 'string' || textContent.trim().length < 10) {
        logger.error('Empty or invalid model response', { rawText });
        throw new DesignEngineError(
          DesignEngineErrorCode.INVALID_RESPONSE_FORMAT,
          'AI model did not return a valid response',
          true,
          502
        );
      }

      return textContent;

    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof DesignEngineError) {
        throw error;
      }

      const fetchError = error as { name?: string; code?: string; cause?: { code?: string } };

      // PRESERVED: Error categorization
      // FROM: moodboard-main/app/api/analyze-image/route.ts lines 118-148
      if (fetchError.name === 'AbortError') {
        logger.error('Text analysis timeout', { timeoutMs });
        throw new DesignEngineError(
          DesignEngineErrorCode.API_TIMEOUT,
          'Request to AI model timed out',
          true,
          504
        );
      }

      if (
        fetchError.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        fetchError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'
      ) {
        logger.error('Connection timeout', { error: fetchError });
        throw new DesignEngineError(
          DesignEngineErrorCode.CONNECTION_TIMEOUT,
          'Connection to AI service timed out',
          true,
          504
        );
      }

      logger.error('Network error during content analysis', { error });
      throw new DesignEngineError(
        DesignEngineErrorCode.NETWORK_ERROR,
        'Network error while contacting AI service',
        true,
        502
      );
    }
  }
}

// ===========================================
// Factory Function
// ===========================================

let clientInstance: GeminiClient | null = null;

/**
 * Get or create the Gemini client singleton.
 */
export function getGeminiClient(): GeminiClient {
  if (!clientInstance) {
    // Note: In a real worker environment, these would come from the 'config' module
    // which has been updated with these values.
    clientInstance = new GeminiClient({
      apiKey: process.env.GEMINI_API_KEY || '',
      imageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview',
      imageModelFallback: process.env.GEMINI_IMAGE_MODEL_FALLBACK || 'gemini-3.1-flash-image-preview',
      textModel: process.env.GEMINI_MODEL || process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
      imageApiVersion: process.env.GEMINI_IMAGE_API_VERSION || 'v1beta',
      textApiVersion: process.env.GEMINI_TEXT_API_VERSION || 'v1',
    });
  }
  return clientInstance;
}

/**
 * Reset the client (for testing).
 */
export function resetGeminiClient(): void {
  clientInstance = null;
}

