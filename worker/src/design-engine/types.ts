/**
 * TatvaOps Vision - Design Engine Types
 * 
 * Core type definitions for the moodboard generation system.
 * These types are extracted from moodboard-main and adapted for worker-based execution.
 * 
 * Source: moodboard-main/app/api/moodboard/route.ts
 * Source: moodboard-main/app/api/analyze-image/route.ts
 * Source: moodboard-main/app/api/summary/route.ts
 */

// ===========================================
// Design Intent Types
// ===========================================

/**
 * Extracted design preferences from image analysis or user input.
 * Maps directly to the analysis output from Gemini.
 * 
 * PRESERVED FROM: moodboard-main/app/api/analyze-image/route.ts (AnalysisResult type)
 */
export interface DesignIntent {
  roomType: string;
  aestheticStyle: string;
  themeMood: string;
  colorPalette: string;
  materialPreferences: string;
  texturePreferences: string;
  furniturePreferences: string;
  decorPreferences: string;
  lightingPreferences: string;
  notes: string;
  
  // Practical constraints
  budget?: string; // Economy, Standard, Premium
  maintenanceTolerance?: string; // Low, Medium, High
  executionPriority?: string; // Quality, Speed, Cost
}

/**
 * User-provided overrides for regeneration.
 * Any non-null field overrides the original value.
 * 
 * PRESERVED FROM: moodboard-main - regeneration override logic
 */
export interface RegenerationOverrides {
  style?: string | null;
  colorPalette?: string | null;
  mood?: string | null;
  materials?: string | null;
  textures?: string | null;
  furniture?: string | null;
  decor?: string | null;
  lighting?: string | null;
  notes?: string | null;
  
  // Practical constraints overrides
  budget?: string | null;
  maintenanceTolerance?: string | null;
  executionPriority?: string | null;
}

// ===========================================
// Job Input/Output Types
// ===========================================

/**
 * Input for moodboard generation job.
 * Received from SQS queue.
 */
export interface MoodboardJobInput {
  jobId: string;
  projectId: string;
  roomId: string;
  userId: string;
  
  /** Design parameters extracted from questionnaire or image analysis */
  designIntent: DesignIntent;
  
  /** 
   * Reference images for context.
   * Can be S3 URLs (s3://bucket/key) or pre-fetched base64 data.
   */
  referenceImages?: string[];
  
  /**
   * Override values for regeneration.
   * Non-null values replace corresponding designIntent fields.
   * 
   * CRITICAL: This preserves the exact regeneration behavior from moodboard-main
   */
  regenerationOverrides?: RegenerationOverrides;
  
  /** Version number for this generation (1 for initial, 2+ for regenerations) */
  version?: number;
  
  /** Metadata from upstream service */
  metadata?: Record<string, unknown>;
}

/**
 * Output from moodboard generation job.
 * Returned after successful generation and S3 upload.
 */
export interface MoodboardJobResult {
  /** Signed S3 URL for the generated moodboard image */
  assetUrl: string;
  
  /** Unique version identifier in the database */
  versionId: string;
  
  /** Hash of the prompt used (for deduplication and debugging) */
  promptHash: string;
  
  /** S3 key where the image is stored */
  s3Key: string;
  
  /** Mime type of the generated image */
  mimeType: string;
  
  /** Generation metadata */
  generatedAt: string;
  durationMs: number;
}

// ===========================================
// Image Analysis Types
// ===========================================

/**
 * Input for image analysis job.
 */
export interface ImageAnalysisJobInput {
  jobId: string;
  projectId: string;
  userId: string;
  
  /**
   * Image to analyze.
   * Can be S3 URL (s3://bucket/key) or base64 data.
   */
  imageSource: string;
  
  /** Optional MIME type if not auto-detected */
  mimeType?: string;
}

/**
 * Output from image analysis.
 */
export interface ImageAnalysisResult {
  designIntent: DesignIntent;
  summary: string;
  confidence: number;
}

// ===========================================
// Gemini API Types
// ===========================================

/**
 * Request body for Gemini generateContent API.
 * 
 * PRESERVED FROM: moodboard-main API route implementations
 */
export interface GeminiGenerateRequest {
  contents: Array<{
    parts: GeminiPart[];
  }>;
  generationConfig?: {
    responseModalities?: ('Text' | 'Image')[];
    temperature?: number;
    maxOutputTokens?: number;
  };
}

/**
 * Part in a Gemini request/response.
 */
export type GeminiPart = 
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * Gemini API response structure.
 */
export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

// ===========================================
// Error Types
// ===========================================

/**
 * Categorized error from design engine operations.
 * 
 * PRESERVED FROM: moodboard-main error handling patterns
 */
export enum DesignEngineErrorCode {
  // Configuration errors
  MISSING_API_KEY = 'MISSING_API_KEY',
  INVALID_MODEL = 'INVALID_MODEL',
  
  // Input errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_IMAGE_FORMAT = 'INVALID_IMAGE_FORMAT',
  
  // API errors
  API_ERROR = 'API_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Generation errors
  NO_IMAGE_GENERATED = 'NO_IMAGE_GENERATED',
  TEXT_INSTEAD_OF_IMAGE = 'TEXT_INSTEAD_OF_IMAGE',
  INVALID_RESPONSE_FORMAT = 'INVALID_RESPONSE_FORMAT',
  CONTENT_BLOCKED = 'CONTENT_BLOCKED',
  
  // Storage errors
  S3_UPLOAD_FAILED = 'S3_UPLOAD_FAILED',
  S3_DOWNLOAD_FAILED = 'S3_DOWNLOAD_FAILED',
  
  // Database errors
  DB_ERROR = 'DB_ERROR',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured error from design engine.
 */
export class DesignEngineError extends Error {
  constructor(
    public readonly code: DesignEngineErrorCode,
    message: string,
    public readonly retryable: boolean = false,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DesignEngineError';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

// ===========================================
// Utility Types
// ===========================================

/**
 * Options for Gemini API calls.
 */
export interface GeminiCallOptions {
  /** Timeout in milliseconds */
  timeoutMs?: number;
  
  /** Temperature for generation (0.0 - 1.0) */
  temperature?: number;
  
  /** Maximum output tokens */
  maxOutputTokens?: number;
  
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Configuration for the design engine.
 */
export interface DesignEngineConfig {
  geminiApiKey: string;
  geminiImageModel: string;
  geminiTextModel: string;
  
  s3BucketMoodboards: string;
  s3BucketFloorplans: string;
  awsRegion: string;
  
  /** Default timeout for image generation (ms) */
  imageGenerationTimeoutMs: number;
  
  /** Default timeout for text analysis (ms) */
  textAnalysisTimeoutMs: number;
  
  /** Default temperature for image generation */
  imageGenerationTemperature: number;
}

