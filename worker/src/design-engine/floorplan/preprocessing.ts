/**
 * Floor Plan Image Preprocessing
 * 
 * Stage 1 of the analysis pipeline - NON-AI operations
 * 
 * This module handles:
 * - Image normalization (contrast, brightness)
 * - Noise reduction
 * - Wall/line detection enhancement
 * - Text region detection hints
 * 
 * Uses lightweight image operations (no ML)
 * Prepares image for optimal Gemini Vision analysis
 */

import sharp from 'sharp';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { 
  PreprocessingResult, 
  BoundingBox, 
  ImageMetadata,
  FloorPlanAnalysisError,
  FloorPlanErrorCode 
} from './types';
import { logger } from '../../lib/logger';
import { config } from '../../config';

// S3 Client for fetching images from private buckets
const s3Client = new S3Client({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
});

// ============================================
// CONFIGURATION
// ============================================

const PREPROCESSING_CONFIG = {
  // Target dimensions for processing (maintain aspect ratio)
  maxDimension: 2048,
  
  // Contrast normalization
  normalizeContrast: true,
  contrastFactor: 1.2,
  
  // Sharpening for line detection
  sharpenSigma: 1.0,
  
  // Grayscale conversion (optional, helps with line detection)
  convertToGrayscale: false, // Keep color for symbol detection
  
  // Quality for output
  outputQuality: 90,
};

// ============================================
// MAIN PREPROCESSING FUNCTION
// ============================================

/**
 * Preprocess floor plan image for optimal analysis
 * 
 * @param imageBuffer - Raw image buffer
 * @param mimeType - Image MIME type
 * @returns Preprocessing result with enhanced image and metadata
 */
export async function preprocessFloorPlan(
  imageBuffer: Buffer,
  mimeType: string
): Promise<PreprocessingResult> {
  const startTime = Date.now();
  const notes: string[] = [];
  
  try {
    logger.info('Starting floor plan preprocessing', { mimeType });
    
    // NOTE: PDFs should be converted to images BEFORE calling this function
    // The PDF-to-images conversion happens in analyzer.ts via analyzePdfAsImages()
    // If a PDF reaches here, it's an error in the flow
    if (mimeType === 'application/pdf') {
      logger.error('PDF passed to image preprocessing - this should not happen');
      throw new FloorPlanAnalysisError(
        FloorPlanErrorCode.INVALID_IMAGE,
        'PDF files must be converted to images before preprocessing. Use convertPdfToImages() first.',
        false
      );
    }
    
    // Step 1: Load image and get metadata
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new FloorPlanAnalysisError(
        FloorPlanErrorCode.INVALID_IMAGE,
        'Could not read image dimensions',
        false
      );
    }
    
    logger.debug('Image metadata', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      channels: metadata.channels,
    });
    
    notes.push(`Original size: ${metadata.width}x${metadata.height}`);
    
    // Step 2: Resize if too large (maintain aspect ratio)
    let pipeline = image;
    const maxDim = Math.max(metadata.width, metadata.height);
    
    if (maxDim > PREPROCESSING_CONFIG.maxDimension) {
      pipeline = pipeline.resize({
        width: metadata.width > metadata.height ? PREPROCESSING_CONFIG.maxDimension : undefined,
        height: metadata.height >= metadata.width ? PREPROCESSING_CONFIG.maxDimension : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
      notes.push(`Resized to max ${PREPROCESSING_CONFIG.maxDimension}px`);
    }
    
    // Step 3: Normalize contrast and brightness
    if (PREPROCESSING_CONFIG.normalizeContrast) {
      pipeline = pipeline.normalize(); // Auto-level
      notes.push('Applied contrast normalization');
    }
    
    // Step 4: Apply gentle sharpening to enhance lines
    pipeline = pipeline.sharpen({
      sigma: PREPROCESSING_CONFIG.sharpenSigma,
    });
    notes.push('Applied line sharpening');
    
    // Step 5: Optional grayscale (disabled by default to preserve color info)
    if (PREPROCESSING_CONFIG.convertToGrayscale) {
      pipeline = pipeline.grayscale();
      notes.push('Converted to grayscale');
    }
    
    // Step 6: Output as high-quality JPEG or PNG
    let outputBuffer: Buffer;
    let outputMimeType: string;
    
    if (mimeType === 'image/png') {
      outputBuffer = await pipeline.png({ quality: PREPROCESSING_CONFIG.outputQuality }).toBuffer();
      outputMimeType = 'image/png';
    } else {
      outputBuffer = await pipeline.jpeg({ quality: PREPROCESSING_CONFIG.outputQuality }).toBuffer();
      outputMimeType = 'image/jpeg';
    }
    
    // Step 7: Analyze for wall detection confidence
    const analysisResult = await analyzeImageCharacteristics(imageBuffer, metadata);
    
    const processingTime = Date.now() - startTime;
    notes.push(`Processing time: ${processingTime}ms`);
    
    logger.info('Preprocessing complete', {
      processingTimeMs: processingTime,
      outputSize: outputBuffer.length,
      wallConfidence: analysisResult.wallDetectionConfidence,
      lineDensity: analysisResult.lineDensity,
    });
    
    return {
      processedImage: outputBuffer.toString('base64'),
      mimeType: outputMimeType,
      wallDetectionConfidence: analysisResult.wallDetectionConfidence,
      lineDensity: analysisResult.lineDensity,
      textRegions: analysisResult.textRegions,
      notes,
    };
    
  } catch (error) {
    if (error instanceof FloorPlanAnalysisError) {
      throw error;
    }
    
    logger.error('Preprocessing failed', { error });
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.PREPROCESSING_FAILED,
      `Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true // Retryable
    );
  }
}

// ============================================
// IMAGE ANALYSIS HELPERS
// ============================================

/**
 * Analyze image characteristics for floor plan detection
 * Uses simple heuristics, not ML
 */
async function analyzeImageCharacteristics(
  imageBuffer: Buffer,
  metadata: sharp.Metadata
): Promise<{
  wallDetectionConfidence: number;
  lineDensity: 'high' | 'medium' | 'low';
  textRegions: BoundingBox[];
}> {
  try {
    // Get image stats for analysis
    const stats = await sharp(imageBuffer).stats();
    
    // Calculate contrast from channel stats
    // Higher stddev in channels typically means more defined lines
    const avgStdDev = stats.channels.reduce(
      (sum, ch) => sum + (ch.stdev || 0), 
      0
    ) / stats.channels.length;
    
    // Estimate wall detection confidence based on contrast
    // Floor plans with clear lines have higher contrast
    let wallDetectionConfidence: number;
    if (avgStdDev > 80) {
      wallDetectionConfidence = 0.9;
    } else if (avgStdDev > 50) {
      wallDetectionConfidence = 0.7;
    } else if (avgStdDev > 30) {
      wallDetectionConfidence = 0.5;
    } else {
      wallDetectionConfidence = 0.3;
    }
    
    // Estimate line density
    // This is a rough heuristic - actual detection happens in Gemini
    let lineDensity: 'high' | 'medium' | 'low';
    const entropy = stats.entropy || 0;
    
    if (entropy > 7) {
      lineDensity = 'high';
    } else if (entropy > 5) {
      lineDensity = 'medium';
    } else {
      lineDensity = 'low';
    }
    
    // Text regions - we can't detect these without OCR
    // Return empty array, Gemini will handle text detection
    const textRegions: BoundingBox[] = [];
    
    return {
      wallDetectionConfidence,
      lineDensity,
      textRegions,
    };
    
  } catch (error) {
    logger.warn('Image analysis failed, using defaults', { error });
    
    return {
      wallDetectionConfidence: 0.5,
      lineDensity: 'medium',
      textRegions: [],
    };
  }
}

// ============================================
// IMAGE METADATA EXTRACTION
// ============================================

/**
 * Extract image metadata for analysis result
 * 
 * NOTE: PDFs should be converted to images before reaching this function
 */
export async function extractImageMetadata(
  imageBuffer: Buffer,
  mimeType?: string
): Promise<ImageMetadata> {
  // PDFs should be converted to images before this function is called
  if (mimeType === 'application/pdf') {
    logger.error('PDF passed to extractImageMetadata - should be converted to image first');
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.INVALID_IMAGE,
      'PDF files must be converted to images before metadata extraction',
      false
    );
  }

  const metadata = await sharp(imageBuffer).metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.INVALID_IMAGE,
      'Invalid image: cannot determine dimensions',
      false
    );
  }
  
  // Determine orientation
  const orientation = metadata.width > metadata.height ? 'landscape' : 'portrait';
  
  // Estimate quality based on dimensions
  const maxDim = Math.max(metadata.width, metadata.height);
  let quality: 'high' | 'medium' | 'low';
  if (maxDim >= 2000) {
    quality = 'high';
  } else if (maxDim >= 1000) {
    quality = 'medium';
  } else {
    quality = 'low';
  }
  
  return {
    width: metadata.width,
    height: metadata.height,
    orientation,
    quality,
    // Scale and unit will be extracted by Gemini from the image
    scale: undefined,
    pixelsPerUnit: undefined,
    unit: undefined,
    planType: undefined, // Will be determined by Gemini
  };
}

// ============================================
// IMAGE FETCHING
// ============================================

/**
 * Fetch image from S3 URL or decode base64
 */
export async function fetchImage(
  imageUrl?: string,
  imageBase64?: string,
  mimeType?: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (imageBase64) {
    logger.debug('Using base64 image input');
    return {
      buffer: Buffer.from(imageBase64, 'base64'),
      mimeType: mimeType || 'image/png',
    };
  }
  
  if (imageUrl) {
    logger.debug('Fetching image from URL', { url: imageUrl.substring(0, 100) });
    
    try {
      // Check if this is an S3 URL
      const s3Match = imageUrl.match(/https?:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/);
      
      if (s3Match) {
        // Parse S3 URL: https://bucket.s3.region.amazonaws.com/key
        const [, bucket, , key] = s3Match;
        const decodedKey = decodeURIComponent(key);
        
        logger.debug('Fetching from S3', { bucket, key: decodedKey });
        
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: decodedKey,
        });
        
        const response = await s3Client.send(command);
        
        if (!response.Body) {
          throw new FloorPlanAnalysisError(
            FloorPlanErrorCode.S3_FETCH_FAILED,
            'S3 response has no body',
            true
          );
        }
        
        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        const stream = response.Body as NodeJS.ReadableStream;
        
        for await (const chunk of stream) {
          chunks.push(chunk as Uint8Array);
        }
        
        const buffer = Buffer.concat(chunks);
        const detectedMimeType = response.ContentType || mimeType || 'image/png';
        
        logger.debug('S3 image fetched', { 
          size: buffer.length, 
          mimeType: detectedMimeType 
        });
        
        return {
          buffer,
          mimeType: detectedMimeType,
        };
      }
      
      // Not an S3 URL, use regular fetch
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new FloorPlanAnalysisError(
          FloorPlanErrorCode.S3_FETCH_FAILED,
          `Failed to fetch image: ${response.status} ${response.statusText}`,
          true // Retryable
        );
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const detectedMimeType = response.headers.get('content-type') || mimeType || 'image/png';
      
      return {
        buffer: Buffer.from(arrayBuffer),
        mimeType: detectedMimeType,
      };
      
    } catch (error) {
      if (error instanceof FloorPlanAnalysisError) {
        throw error;
      }
      
      throw new FloorPlanAnalysisError(
        FloorPlanErrorCode.S3_FETCH_FAILED,
        `Failed to fetch image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }
  
  throw new FloorPlanAnalysisError(
    FloorPlanErrorCode.INVALID_IMAGE,
    'No image provided: either imageUrl or imageBase64 is required',
    false
  );
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that image is a valid floor plan format
 * 
 * NOTE: PDFs should be converted to images before validation
 */
export async function validateFloorPlanImage(imageBuffer: Buffer, mimeType?: string): Promise<void> {
  // Check maximum file size (50MB) - applies to all formats
  const maxSize = 50 * 1024 * 1024;
  if (imageBuffer.length > maxSize) {
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.INVALID_IMAGE,
      `File too large: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB. Maximum: 50MB`,
      false
    );
  }

  // PDFs should be converted to images before validation
  if (mimeType === 'application/pdf') {
    logger.error('PDF passed to validateFloorPlanImage - should be converted to image first');
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.INVALID_IMAGE,
      'PDF files must be converted to images before validation',
      false
    );
  }

  try {
    const metadata = await sharp(imageBuffer).metadata();
    
    // Check format
    const validFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (!metadata.format || !validFormats.includes(metadata.format)) {
      throw new FloorPlanAnalysisError(
        FloorPlanErrorCode.INVALID_IMAGE,
        `Unsupported image format: ${metadata.format}. Supported: ${validFormats.join(', ')}, PDF`,
        false
      );
    }
    
    // Check minimum dimensions
    if (!metadata.width || !metadata.height) {
      throw new FloorPlanAnalysisError(
        FloorPlanErrorCode.INVALID_IMAGE,
        'Could not determine image dimensions',
        false
      );
    }
    
    const minDimension = 200;
    if (metadata.width < minDimension || metadata.height < minDimension) {
      throw new FloorPlanAnalysisError(
        FloorPlanErrorCode.INVALID_IMAGE,
        `Image too small: ${metadata.width}x${metadata.height}. Minimum: ${minDimension}x${minDimension}`,
        false
      );
    }
    
    logger.debug('Image validation passed', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: imageBuffer.length,
    });
    
  } catch (error) {
    if (error instanceof FloorPlanAnalysisError) {
      throw error;
    }
    
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.INVALID_IMAGE,
      `Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      false
    );
  }
}

