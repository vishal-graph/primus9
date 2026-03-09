import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { config } from '../../config';
import { logger } from '../../lib/logger';
import { cache, cacheKeys } from '../../lib/redis';

/**
 * Base AI Service
 * Abstract base class for AI service modules
 * Provides prompt versioning, caching, and retry logic
 */

export interface AIServiceConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  cacheResults?: boolean;
  cacheTtl?: number;
  apiVersion?: string;
}

export interface GenerationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  promptVersion: string;
  cached?: boolean;
}

export abstract class BaseAIService<TInput, TOutput> {
  protected genAI: GoogleGenerativeAI;
  protected model: GenerativeModel;
  protected serviceName: string;
  protected serviceConfig: AIServiceConfig;

  constructor(serviceName: string, serviceConfig: AIServiceConfig = {}, isImage: boolean = false) {
    this.serviceName = serviceName;
    
    // Choose model and API version from global config
    const defaultModel = isImage ? config.geminiImageModel : config.geminiModel;
    const defaultApiVersion = isImage ? config.geminiImageApiVersion : config.geminiTextApiVersion;

    this.serviceConfig = {
      model: defaultModel,
      apiVersion: defaultApiVersion,
      temperature: 0.7,
      maxTokens: 4096,
      cacheResults: true,
      cacheTtl: 3600, // 1 hour
      ...serviceConfig,
    };

    // Initialize Google Generative AI with specific API version if provided
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    
    // Note: The @google/generative-ai SDK version ^0.2.0 uses a specific way to set API version 
    // If we need to force v1beta, we might need to use a custom fetch implementation or update the SDK
    // For now, we'll use the model name which often dictates the capability
    this.model = this.genAI.getGenerativeModel({
      model: this.serviceConfig.model!,
      generationConfig: {
        temperature: this.serviceConfig.temperature,
        maxOutputTokens: this.serviceConfig.maxTokens,
      },
    });
  }

  /**
   * Get the current prompt version
   * Override in subclasses for versioning
   */
  protected abstract getPromptVersion(): string;

  /**
   * Build the prompt for generation
   * Override in subclasses
   */
  protected abstract buildPrompt(input: TInput): string | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;

  /**
   * Parse the AI response
   * Override in subclasses
   */
  protected abstract parseResponse(response: string): TOutput;

  /**
   * Generate cache key for input
   */
  protected getCacheKey(input: TInput): string {
    const hash = Buffer.from(JSON.stringify(input)).toString('base64');
    return cacheKeys.aiResult(this.serviceName, hash);
  }

  /**
   * Main generation method with retry and caching
   */
  async generate(input: TInput): Promise<GenerationResult<TOutput>> {
    const promptVersion = this.getPromptVersion();

    // Check cache first
    if (this.serviceConfig.cacheResults) {
      const cacheKey = this.getCacheKey(input);
      const cached = await cache.get<TOutput>(cacheKey);
      if (cached) {
        logger.info({ service: this.serviceName }, 'Cache hit for AI generation');
        return {
          success: true,
          data: cached,
          promptVersion,
          cached: true,
        };
      }
    }

    // Generate with retry
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const prompt = this.buildPrompt(input);
        const result = await this.model.generateContent(prompt as string);
        const response = result.response;
        const text = response.text();

        const output = this.parseResponse(text);

        // Cache result
        if (this.serviceConfig.cacheResults) {
          const cacheKey = this.getCacheKey(input);
          await cache.set(cacheKey, output, this.serviceConfig.cacheTtl);
        }

        logger.info(
          { service: this.serviceName, attempt: attempt + 1 },
          'AI generation successful'
        );

        return {
          success: true,
          data: output,
          promptVersion,
          cached: false,
        };
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          { service: this.serviceName, attempt: attempt + 1, error },
          'AI generation failed, retrying'
        );

        // Exponential backoff
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }

    logger.error(
      { service: this.serviceName, error: lastError },
      'AI generation failed after retries'
    );

    return {
      success: false,
      error: lastError?.message || 'Generation failed',
      promptVersion,
    };
  }
}

