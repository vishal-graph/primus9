/**
 * Floor Plan Vision Analysis Engine
 * 
 * Main analyzer that orchestrates the multi-stage pipeline:
 * 1. Image Preprocessing (non-AI)
 * 2. Gemini Vision Analysis (multi-pass)
 * 3. Room Graph Construction
 * 
 * CORE PRINCIPLE: NEVER MISS A ROOM
 * - Completeness over confidence
 * - False positives are acceptable, false negatives are NOT
 * - Every room must have reasoning
 * - UNCLASSIFIED is always acceptable
 */

import {
  FloorPlanAnalysisInput,
  FloorPlanAnalysisResult,
  FloorPlanAnalysisError,
  FloorPlanErrorCode,
  DetectedRoom,
  CirculationPath,
  AnalysisWarning,
  ImageMetadata,
  RoomType,
  RoomStatus,
  RoomGeometry,
  FloorPlanSymbol,
} from './types';
import {
  preprocessFloorPlan,
  extractImageMetadata,
  fetchImage,
  validateFloorPlanImage,
} from './preprocessing';
import { convertPdfToImages, PdfPageImage } from './pdfToImages';
import { uploadToS3 } from '../../lib/s3';
import { getPrisma } from '../../lib/prisma';
import {
  SYSTEM_INSTRUCTION,
  PROMPT_SPATIAL_SEGMENTATION,
  PROMPT_TEXT_SYMBOL_EXTRACTION,
  PROMPT_ROOM_CLASSIFICATION,
  PROMPT_COMPREHENSIVE_SINGLE_PASS,
  buildClassificationPrompt,
  buildPromptWithHints,
  parseGeminiResponse,
  validateRoomResponse,
} from './prompts';
import { buildRoomGraph, validateRoomGraph } from './room-graph';
import { getGeminiClient } from '../common/gemini-client';
import { logger } from '../../lib/logger';
import { redisClient } from '../../lib/redis-client';

// Progress callback type
type ProgressCallback = (progress: number, stage: string, message: string) => Promise<void>;

// Default progress reporter using Redis
async function reportProgress(jobId: string, progress: number, stage: string, message: string) {
  await redisClient.setJobStatus(jobId, {
    status: 'PROCESSING',
    progress,
    stage,
    message,
  });
}

/**
 * Upload converted PDF image to S3 for UI display
 */
async function uploadConvertedPdfImage(
  projectId: string,
  userId: string,
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<void> {
  const prisma = getPrisma();

  const bucket = process.env.S3_BUCKET_FLOORPLANS || 'tatvaops-vision-floorplans';
  const key = `${userId}/${projectId}/converted-floorplan.png`;

  await uploadToS3({
    bucket,
    key,
    body: imageBuffer,
    contentType: 'image/png',
    metadata: {
      projectId,
      userId,
      source: 'pdf-conversion',
      width: width.toString(),
      height: height.toString(),
    },
  });

  logger.info('Converted PDF image uploaded to S3', {
    projectId,
    bucket,
    key,
    size: imageBuffer.length,
  });

  await prisma.assetVersion.create({
    data: {
      projectId,
      assetType: 'FLOORPLAN_ANALYZED',
      version: 1,
      s3Bucket: bucket,
      s3Key: key,
      contentType: 'image/png',
      fileSize: imageBuffer.length,
      metadata: {
        source: 'pdf-conversion',
        width,
        height,
        originalFormat: 'pdf',
      },
      isLatest: true,
      createdBy: userId,
    },
  });

  logger.info('AssetVersion created for converted PDF', {
    projectId,
    assetType: 'FLOORPLAN_ANALYZED',
  });
}

// ============================================
// CONFIGURATION
// ============================================

const ANALYSIS_CONFIG = {
  // Use multi-pass for complex plans, single-pass for simple ones
  useMultiPass: false, // Start with single-pass for stability
  
  // Timeouts
  preprocessingTimeoutMs: 30000,
  geminiTimeoutMs: 120000, // 2 minutes for vision analysis
  
  // Retry settings
  maxRetries: 2,
  retryDelayMs: 2000,
  
  // Minimum rooms to consider analysis successful
  minRoomsExpected: 1,
  
  // Analysis version for tracking
  analysisVersion: '1.0.0',
};

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analyze a floor plan image and extract all rooms
 * 
 * This is the main entry point for floor plan analysis.
 * Supports both images (JPEG, PNG) and PDFs with separate flows.
 * 
 * @param input - Analysis job input
 * @returns Complete analysis result with rooms, circulation, and warnings
 */
export async function analyzeFloorPlan(
  input: FloorPlanAnalysisInput
): Promise<FloorPlanAnalysisResult> {
  const startTime = Date.now();
  const warnings: AnalysisWarning[] = [];
  
  logger.info('Starting floor plan analysis', {
    jobId: input.jobId,
    projectId: input.projectId,
    hasImageUrl: !!input.imageUrl,
    hasBase64: !!input.imageBase64,
    mimeType: input.mimeType,
    hints: input.hints,
  });
  
  const jobId = input.jobId;
  
  try {
    // ========================================
    // STAGE 1: Fetch floor plan file
    // ========================================
    await reportProgress(jobId, 15, 'Fetching', 'Loading floor plan...');
    logger.debug('Stage 1: Fetching floor plan file');
    
    const { buffer: fileBuffer, mimeType } = await fetchImage(
      input.imageUrl,
      input.imageBase64,
      input.mimeType
    );
    
    // ========================================
    // PDF FLOW: Convert to images and use image pipeline
    // ========================================
    if (mimeType === 'application/pdf') {
      logger.info('PDF detected - converting to images for image-based analysis');
      return await analyzePdfAsImages(input, fileBuffer, jobId, startTime);
    }
    
    // ========================================
    // IMAGE FLOW: Standard image processing
    // ========================================
    await reportProgress(jobId, 20, 'Validating', 'Validating floor plan format...');
    await validateFloorPlanImage(fileBuffer, mimeType);
    
    await reportProgress(jobId, 25, 'Processing', 'Enhancing image quality...');
    const imageMetadata = await extractImageMetadata(fileBuffer, mimeType);
    const preprocessResult = await preprocessFloorPlan(fileBuffer, mimeType);
    
    logger.info('Preprocessing complete', {
      originalSize: fileBuffer.length,
      wallConfidence: preprocessResult.wallDetectionConfidence,
      lineDensity: preprocessResult.lineDensity,
    });
    
    await reportProgress(jobId, 35, 'Preprocessing', 'Image preprocessing complete');
    
    // Add preprocessing notes as warnings if relevant
    if (preprocessResult.wallDetectionConfidence < 0.5) {
      warnings.push({
        severity: 'warning',
        message: 'Low wall detection confidence - floor plan may have unclear boundaries',
      });
    }
    
    // ========================================
    // STAGE 2: Gemini Vision Analysis (Images)
    // ========================================
    await reportProgress(jobId, 40, 'AI Analysis', 'AI is detecting rooms and boundaries...');
    logger.debug('Stage 2: Running Gemini Vision analysis');
    
    let analysisResult: {
      rooms: DetectedRoom[];
      circulation: CirculationPath[];
      warnings: AnalysisWarning[];
    };
    
    if (ANALYSIS_CONFIG.useMultiPass) {
      await reportProgress(jobId, 45, 'AI Analysis', 'Running multi-pass room detection...');
      analysisResult = await runMultiPassAnalysis(
        preprocessResult.processedImage,
        preprocessResult.mimeType,
        imageMetadata,
        input.hints
      );
    } else {
      await reportProgress(jobId, 50, 'AI Analysis', 'Analyzing floor plan structure...');
      analysisResult = await runSinglePassAnalysis(
        preprocessResult.processedImage,
        preprocessResult.mimeType,
        imageMetadata,
        input.hints
      );
    }
    
    await reportProgress(jobId, 70, 'AI Analysis', `Detected ${analysisResult.rooms.length} rooms`);
    warnings.push(...analysisResult.warnings);
    
    // ========================================
    // STAGE 3: Validate and finalize
    // ========================================
    await reportProgress(jobId, 80, 'Validating', 'Validating room boundaries...');
    logger.debug('Stage 3: Validating and finalizing');
    
    // Validate room graph
    const graphWarnings = validateRoomGraph(analysisResult.rooms);
    warnings.push(...graphWarnings);
    
    // Check for minimum rooms
    if (analysisResult.rooms.length < ANALYSIS_CONFIG.minRoomsExpected) {
      warnings.push({
        severity: 'critical',
        message: 'Very few rooms detected - floor plan may not have been analyzed correctly',
      });
    }
    
    await reportProgress(jobId, 90, 'Finalizing', 'Calculating confidence scores...');
    
    // Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(analysisResult.rooms);
    
    const processingTimeMs = Date.now() - startTime;
    
    await reportProgress(jobId, 95, 'Complete', `Found ${analysisResult.rooms.length} rooms`);
    
    logger.info('Floor plan analysis complete', {
      jobId: input.jobId,
      roomCount: analysisResult.rooms.length,
      circulationCount: analysisResult.circulation.length,
      warningCount: warnings.length,
      overallConfidence,
      processingTimeMs,
    });
    
    return {
      floorplanId: input.projectId, // Will be updated with actual floorplan ID
      analysisVersion: ANALYSIS_CONFIG.analysisVersion,
      analyzedAt: new Date().toISOString(),
      imageMetadata,
      rooms: analysisResult.rooms,
      circulation: analysisResult.circulation,
      warnings,
      overallConfidence,
      processingTimeMs,
    };
    
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    
    if (error instanceof FloorPlanAnalysisError) {
      logger.error('Floor plan analysis failed', {
        jobId: input.jobId,
        errorCode: error.code,
        message: error.message,
        isRetryable: error.isRetryable,
        processingTimeMs,
      });
      throw error;
    }
    
    logger.error('Unexpected floor plan analysis error', {
      jobId: input.jobId,
      error,
      processingTimeMs,
    });
    
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.UNKNOWN,
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
      true
    );
  }
}

// ============================================
// PDF AS IMAGES ANALYSIS FLOW (NEW)
// ============================================

/**
 * Analyze a PDF floor plan by converting it to images first
 * 
 * This approach:
 * 1. Converts PDF pages to high-resolution images
 * 2. Runs each image through the standard preprocessing pipeline
 * 3. Runs each image through Gemini Vision analysis
 * 4. Merges results across pages
 * 
 * Benefits:
 * - Unified analysis logic
 * - Predictable bounding boxes
 * - Better wall/line detection via sharp preprocessing
 * - No Gemini PDF quirks
 */
async function analyzePdfAsImages(
  input: FloorPlanAnalysisInput,
  pdfBuffer: Buffer,
  jobId: string,
  startTime: number
): Promise<FloorPlanAnalysisResult> {
  const warnings: AnalysisWarning[] = [];
  
  await reportProgress(jobId, 15, 'Processing', 'Converting PDF to images...');
  logger.info('Starting PDF-to-images analysis', {
    jobId,
    pdfSize: pdfBuffer.length,
  });
  
  try {
    // Step 1: Convert PDF to images
    const conversionResult = await convertPdfToImages(pdfBuffer);
    
    if (conversionResult.warnings.length > 0) {
      conversionResult.warnings.forEach(w => {
        warnings.push({ severity: 'warning', message: w });
      });
    }
    
    logger.info('PDF converted to images', {
      jobId,
      pageCount: conversionResult.pages.length,
      totalPages: conversionResult.totalPages,
    });
    
    await reportProgress(
      jobId, 
      25, 
      'Processing', 
      `Converted PDF to ${conversionResult.pages.length} image(s)`
    );
    
    // Upload the first converted page to S3 for display in UI
    if (conversionResult.pages.length > 0) {
      try {
        const firstPage = conversionResult.pages[0];
        await uploadConvertedPdfImage(
          input.projectId,
          input.userId,
          firstPage.buffer,
          firstPage.width,
          firstPage.height
        );
        logger.info('Converted PDF image uploaded to S3', {
          jobId,
          width: firstPage.width,
          height: firstPage.height,
        });
      } catch (uploadError) {
        logger.warn('Failed to upload converted PDF image', {
          jobId,
          error: uploadError,
        });
        // Don't fail the job, just log the warning
      }
    }
    
    // Step 2: Analyze each page through the image pipeline
    const allPageResults: {
      rooms: DetectedRoom[];
      circulation: CirculationPath[];
      warnings: AnalysisWarning[];
      metadata: ImageMetadata;
    }[] = [];
    
    for (let i = 0; i < conversionResult.pages.length; i++) {
      const page = conversionResult.pages[i];
      const pageProgress = 30 + Math.floor((i / conversionResult.pages.length) * 40);
      
      await reportProgress(
        jobId,
        pageProgress,
        'AI Analysis',
        `Analyzing page ${page.page} of ${conversionResult.totalPages}...`
      );
      
      logger.info('Analyzing PDF page as image', {
        jobId,
        page: page.page,
        width: page.width,
        height: page.height,
      });
      
      try {
        const pageResult = await analyzePageImage(page, input.hints);
        allPageResults.push(pageResult);
        
        logger.info('Page analysis complete', {
          jobId,
          page: page.page,
          roomCount: pageResult.rooms.length,
        });
        
      } catch (pageError) {
        logger.error('Failed to analyze PDF page', {
          jobId,
          page: page.page,
          error: pageError,
        });
        
        warnings.push({
          severity: 'warning',
          message: `Page ${page.page} analysis failed: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`,
        });
      }
    }
    
    if (allPageResults.length === 0) {
      logger.error('No pages could be analyzed', { jobId });
      warnings.push({
        severity: 'critical',
        message: 'Could not analyze any pages from the PDF',
      });
      return createEmptyResult(input.projectId, startTime, warnings);
    }
    
    // Step 3: Merge results from all pages
    await reportProgress(jobId, 75, 'Processing', 'Merging results from all pages...');
    
    const mergedResult = mergeMultiPageResults(allPageResults);
    
    // Add merge warnings
    warnings.push(...mergedResult.warnings);
    
    // Step 4: Validate merged results
    await reportProgress(jobId, 85, 'Validating', 'Validating room boundaries...');
    
    const graphWarnings = validateRoomGraph(mergedResult.rooms);
    warnings.push(...graphWarnings);
    
    // Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(mergedResult.rooms);
    
    const processingTimeMs = Date.now() - startTime;
    
    await reportProgress(
      jobId, 
      95, 
      'Complete', 
      `Found ${mergedResult.rooms.length} rooms in PDF (${conversionResult.pages.length} page(s))`
    );
    
    logger.info('PDF-to-images analysis complete', {
      jobId,
      totalPages: conversionResult.totalPages,
      analyzedPages: allPageResults.length,
      roomCount: mergedResult.rooms.length,
      warningCount: warnings.length,
      overallConfidence,
      processingTimeMs,
    });
    
    return {
      floorplanId: input.projectId,
      analysisVersion: ANALYSIS_CONFIG.analysisVersion,
      analyzedAt: new Date().toISOString(),
      imageMetadata: mergedResult.metadata,
      rooms: mergedResult.rooms,
      circulation: mergedResult.circulation,
      warnings,
      overallConfidence,
      processingTimeMs,
    };
    
  } catch (error) {
    if (error instanceof FloorPlanAnalysisError) {
      throw error;
    }
    
    logger.error('PDF-to-images analysis failed', { error, jobId });
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.PREPROCESSING_FAILED,
      `PDF analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
}

/**
 * Analyze a single page image through the standard image pipeline
 */
async function analyzePageImage(
  pageImage: PdfPageImage,
  hints?: FloorPlanAnalysisInput['hints']
): Promise<{
  rooms: DetectedRoom[];
  circulation: CirculationPath[];
  warnings: AnalysisWarning[];
  metadata: ImageMetadata;
}> {
  const warnings: AnalysisWarning[] = [];
  
  // Step 1: Preprocess the page image using existing preprocessing
  const preprocessResult = await preprocessFloorPlan(
    pageImage.buffer,
    pageImage.mimeType
  );
  
  logger.debug('Page preprocessing complete', {
    page: pageImage.page,
    wallConfidence: preprocessResult.wallDetectionConfidence,
    lineDensity: preprocessResult.lineDensity,
  });
  
  // Add preprocessing warnings
  if (preprocessResult.wallDetectionConfidence < 0.5) {
    warnings.push({
      severity: 'warning',
      message: `Page ${pageImage.page}: Low wall detection confidence`,
    });
  }
  
  // Step 2: Extract image metadata
  const metadata: ImageMetadata = {
    width: pageImage.width,
    height: pageImage.height,
    orientation: pageImage.width > pageImage.height ? 'landscape' : 'portrait',
    quality: pageImage.width >= 2000 ? 'high' : pageImage.width >= 1000 ? 'medium' : 'low',
  };
  
  // Step 3: Run Gemini Vision analysis using existing single-pass
  const analysisResult = await runSinglePassAnalysis(
    preprocessResult.processedImage,
    preprocessResult.mimeType,
    metadata,
    hints
  );
  
  warnings.push(...analysisResult.warnings);
  
  // Add page number context to room IDs to avoid collisions during merge
  const roomsWithPageContext = analysisResult.rooms.map(room => ({
    ...room,
    tempId: `p${pageImage.page}_${room.tempId}`,
    reasoning: room.reasoning || '',
  }));
  
  return {
    rooms: roomsWithPageContext,
    circulation: analysisResult.circulation,
    warnings,
    metadata,
  };
}

/**
 * Merge results from multiple PDF pages
 * 
 * Strategy:
 * - Detect duplicate rooms across pages using IoU and type matching
 * - Keep higher confidence versions
 * - Preserve adjacency relationships
 */
function mergeMultiPageResults(
  pageResults: {
    rooms: DetectedRoom[];
    circulation: CirculationPath[];
    warnings: AnalysisWarning[];
    metadata: ImageMetadata;
  }[]
): {
  rooms: DetectedRoom[];
  circulation: CirculationPath[];
  warnings: AnalysisWarning[];
  metadata: ImageMetadata;
} {
  const warnings: AnalysisWarning[] = [];
  
  if (pageResults.length === 0) {
    return {
      rooms: [],
      circulation: [],
      warnings: [{ severity: 'critical', message: 'No page results to merge' }],
      metadata: { width: 1000, height: 1000, orientation: 'landscape', quality: 'medium' },
    };
  }
  
  // For single page, no merging needed
  if (pageResults.length === 1) {
    return {
      rooms: pageResults[0].rooms,
      circulation: pageResults[0].circulation,
      warnings: pageResults[0].warnings,
      metadata: pageResults[0].metadata,
    };
  }
  
  // Collect all rooms from all pages
  const allRooms: DetectedRoom[] = [];
  const allCirculation: CirculationPath[] = [];
  
  for (const result of pageResults) {
    allRooms.push(...result.rooms);
    allCirculation.push(...result.circulation);
    warnings.push(...result.warnings);
  }
  
  // Deduplicate rooms using IoU and type matching
  const mergedRooms = deduplicateRooms(allRooms);
  
  // Use metadata from first page (or largest page)
  const primaryMetadata = pageResults.reduce((largest, current) => {
    const largestArea = largest.metadata.width * largest.metadata.height;
    const currentArea = current.metadata.width * current.metadata.height;
    return currentArea > largestArea ? current : largest;
  }).metadata;
  
  logger.info('Multi-page merge complete', {
    totalRoomsBeforeMerge: allRooms.length,
    roomsAfterMerge: mergedRooms.length,
    duplicatesRemoved: allRooms.length - mergedRooms.length,
  });
  
  if (allRooms.length !== mergedRooms.length) {
    warnings.push({
      severity: 'info',
      message: `Merged ${allRooms.length - mergedRooms.length} duplicate rooms across pages`,
    });
  }
  
  return {
    rooms: mergedRooms,
    circulation: allCirculation,
    warnings,
    metadata: primaryMetadata,
  };
}

/**
 * Calculate Intersection over Union for two bounding boxes
 */
function calculateIoU(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
  
  if (x2 <= x1 || y2 <= y1) {
    return 0; // No intersection
  }
  
  const intersectionArea = (x2 - x1) * (y2 - y1);
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const unionArea = box1Area + box2Area - intersectionArea;
  
  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

/**
 * Deduplicate rooms across pages
 * 
 * Rooms are considered duplicates if:
 * - IoU > 0.6 AND room types match
 * - OR same name and similar location
 */
function deduplicateRooms(rooms: DetectedRoom[]): DetectedRoom[] {
  const IOU_THRESHOLD = 0.6;
  const merged: DetectedRoom[] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < rooms.length; i++) {
    if (used.has(i)) continue;
    
    const room = rooms[i];
    let bestRoom = room;
    
    // Find duplicates of this room
    for (let j = i + 1; j < rooms.length; j++) {
      if (used.has(j)) continue;
      
      const otherRoom = rooms[j];
      
      // Check if rooms are duplicates
      const iou = calculateIoU(
        room.geometry.boundingBox,
        otherRoom.geometry.boundingBox
      );
      
      const sameType = room.type === otherRoom.type;
      const sameName = room.name && otherRoom.name && 
        room.name.toLowerCase() === otherRoom.name.toLowerCase();
      
      // Consider duplicate if high IoU and same type, or same name with moderate IoU
      if ((iou > IOU_THRESHOLD && sameType) || (sameName && iou > 0.4)) {
        used.add(j);
        
        // Keep the one with higher confidence
        if (otherRoom.confidenceScore > bestRoom.confidenceScore) {
          bestRoom = otherRoom;
        }
      }
    }
    
    merged.push(bestRoom);
    used.add(i);
  }
  
  // Renumber room IDs for cleanliness
  return merged.map((room, idx) => ({
    ...room,
    tempId: `room_${idx + 1}`,
  }));
}

// ============================================
// LEGACY PDF ANALYSIS FLOW (DEPRECATED)
// ============================================

/**
 * @deprecated Use analyzePdfAsImages instead
 * 
 * Analyze a PDF floor plan document
 * 
 * PDFs are sent directly to Gemini without image preprocessing.
 * Gemini can natively process PDF documents and extract floor plan information.
 * 
 * NOTE: This function is kept for reference but is no longer called.
 * The new approach converts PDFs to images for unified analysis.
 */
async function analyzePdfFloorPlan_DEPRECATED(
  input: FloorPlanAnalysisInput,
  pdfBuffer: Buffer,
  jobId: string,
  startTime: number
): Promise<FloorPlanAnalysisResult> {
  const warnings: AnalysisWarning[] = [];
  
  await reportProgress(jobId, 20, 'Processing', 'Preparing PDF for AI analysis...');
  logger.info('Starting PDF floor plan analysis', {
    jobId,
    pdfSize: pdfBuffer.length,
  });
  
  // Convert PDF buffer to base64 for Gemini
  const pdfBase64 = pdfBuffer.toString('base64');
  
  await reportProgress(jobId, 30, 'AI Analysis', 'AI is reading PDF floor plan...');
  
  // Build hints string
  const hintsString = input.hints?.knownRoomNames?.length 
    ? `HINT: Known room names include: ${input.hints.knownRoomNames.join(', ')}` 
    : '';
  
  // Build the prompt for PDF analysis
  const pdfPrompt = `You are analyzing a PDF floor plan document. This PDF contains architectural floor plan(s).

CRITICAL INSTRUCTION: You MUST detect ALL rooms visible in this floor plan. Missing a room is a CRITICAL ERROR.

Analyze this PDF floor plan and extract:
1. ALL rooms with their boundaries (approximate percentage coordinates 0-1)
2. Room types: LIVING_ROOM, BEDROOM, KITCHEN, BATHROOM, DINING, TOILET, BALCONY, UTILITY, STORE, STUDY, PUJA, PASSAGE, STAIRCASE, LOBBY, FOYER, TERRACE, GARAGE, SERVANT_ROOM, DRESS, UNCLASSIFIED
3. Room names/labels if visible in the PDF
4. Dimensions if shown
5. Connections between rooms (doors, openings)

${hintsString}

IMPORTANT RULES:
- If you cannot determine a room type, use UNCLASSIFIED - never skip a room
- Every enclosed space should be identified as a room
- Include hallways, closets, balconies - they are ALL rooms
- Provide a confidence score (0-1) for each room

Respond with ONLY valid JSON in this exact format:
{
  "rooms": [
    {
      "tempId": "room_1",
      "name": "Living Room",
      "type": "LIVING_ROOM",
      "confidence": 0.95,
      "reasoning": "Large open space labeled 'Living' in the PDF",
      "boundingBox": {
        "x": 0.1,
        "y": 0.2,
        "width": 0.3,
        "height": 0.25
      },
      "estimatedArea": 250,
      "adjacentRooms": ["room_2", "room_3"],
      "symbols": ["SOFA", "WINDOW"],
      "textLabels": ["Living", "Hall"]
    }
  ],
  "circulation": [
    {
      "id": "circ_1",
      "type": "PASSAGE",
      "connects": ["room_1", "room_2"]
    }
  ],
  "metadata": {
    "totalRoomsDetected": 8,
    "planType": "residential",
    "floors": 1
  }
}`;

  try {
    const gemini = getGeminiClient();
    
    await reportProgress(jobId, 50, 'AI Analysis', 'Gemini is analyzing PDF structure...');
    
    // Call Gemini with PDF document using analyzeContent
    const responseText = await gemini.analyzeContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      },
      {
        text: pdfPrompt,
      },
    ], {
      timeoutMs: 120000, // 2 minutes for PDF analysis
    });
    
    await reportProgress(jobId, 70, 'Processing', 'Extracting room information...');
    
    logger.debug('PDF analysis raw response', { 
      responseLength: responseText.length,
      preview: responseText.substring(0, 500),
    });
    
    const parsedResult = parseGeminiResponse(responseText) as {
      rooms?: any[];
      circulation?: CirculationPath[];
      metadata?: { planType?: string };
    };
    
    if (!parsedResult || !parsedResult.rooms || parsedResult.rooms.length === 0) {
      logger.warn('No rooms detected in PDF analysis', { response: responseText });
      warnings.push({
        severity: 'critical',
        message: 'AI could not detect rooms in this PDF. The floor plan may be unclear or in an unsupported format.',
      });
      
      // Return empty result rather than failing completely
      return createEmptyResult(input.projectId, startTime, warnings);
    }
    
    // Validate and transform rooms
    const validatedRooms = validateAndTransformPdfRooms(parsedResult.rooms);
    
    await reportProgress(jobId, 85, 'Validating', 'Validating detected rooms...');
    
    // Run graph validation
    const graphWarnings = validateRoomGraph(validatedRooms);
    warnings.push(...graphWarnings);
    
    // Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(validatedRooms);
    
    const processingTimeMs = Date.now() - startTime;
    
    await reportProgress(jobId, 95, 'Complete', `Found ${validatedRooms.length} rooms in PDF`);
    
    logger.info('PDF floor plan analysis complete', {
      jobId,
      roomCount: validatedRooms.length,
      warningCount: warnings.length,
      overallConfidence,
      processingTimeMs,
    });
    
    // Create default metadata for PDF (no image dimensions)
    const pdfMetadata: ImageMetadata = {
      width: 1000, // Placeholder
      height: 1000,
      orientation: 'landscape',
      quality: 'high',
      planType: (parsedResult.metadata?.planType as ImageMetadata['planType']) || undefined,
    };
    
    return {
      floorplanId: input.projectId,
      analysisVersion: ANALYSIS_CONFIG.analysisVersion,
      analyzedAt: new Date().toISOString(),
      imageMetadata: pdfMetadata,
      rooms: validatedRooms,
      circulation: parsedResult.circulation || [],
      warnings,
      overallConfidence,
      processingTimeMs,
    };
    
  } catch (error) {
    logger.error('PDF analysis Gemini call failed', { error, jobId });
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.GEMINI_API_ERROR,
      `PDF analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
}

/**
 * Map string room type to RoomType enum
 */
function mapToRoomType(typeStr: string): RoomType {
  const typeMap: Record<string, RoomType> = {
    'LIVING_ROOM': RoomType.LIVING_ROOM,
    'LIVING': RoomType.LIVING_ROOM,
    'BEDROOM': RoomType.BEDROOM,
    'KITCHEN': RoomType.KITCHEN,
    'BATHROOM': RoomType.BATHROOM,
    'DINING': RoomType.DINING,
    'TOILET': RoomType.TOILET,
    'BALCONY': RoomType.BALCONY,
    'UTILITY': RoomType.UTILITY,
    'STORE': RoomType.STORE,
    'STUDY': RoomType.STUDY,
    'PUJA': RoomType.PUJA,
    'PASSAGE': RoomType.PASSAGE,
    'HALLWAY': RoomType.PASSAGE,
    'STAIRCASE': RoomType.STAIRCASE,
    'LOBBY': RoomType.LOBBY,
    'FOYER': RoomType.FOYER,
    'ENTRANCE': RoomType.FOYER,
    'TERRACE': RoomType.TERRACE,
    'GARAGE': RoomType.GARAGE,
    'SERVANT_ROOM': RoomType.SERVANT_ROOM,
    'DRESS': RoomType.DRESS,
    'CLOSET': RoomType.STORE,
    'UNCLASSIFIED': RoomType.UNCLASSIFIED,
  };
  
  return typeMap[typeStr?.toUpperCase()] || RoomType.UNCLASSIFIED;
}

/**
 * Map string to FloorPlanSymbol enum
 */
function mapToSymbol(symbolStr: string): FloorPlanSymbol {
  const symbolMap: Record<string, FloorPlanSymbol> = {
    'BED': FloorPlanSymbol.BED,
    'SOFA': FloorPlanSymbol.SOFA,
    'DINING_TABLE': FloorPlanSymbol.DINING_TABLE,
    'SINK': FloorPlanSymbol.SINK,
    'TOILET_SEAT': FloorPlanSymbol.TOILET_SEAT,
    'BATHTUB': FloorPlanSymbol.BATHTUB,
    'SHOWER': FloorPlanSymbol.SHOWER,
    'KITCHEN_COUNTER': FloorPlanSymbol.KITCHEN_COUNTER,
    'STOVE': FloorPlanSymbol.STOVE,
    'REFRIGERATOR': FloorPlanSymbol.REFRIGERATOR,
    'WARDROBE': FloorPlanSymbol.WARDROBE,
    'DOOR': FloorPlanSymbol.DOOR,
    'WINDOW': FloorPlanSymbol.WINDOW,
    'STAIRS': FloorPlanSymbol.STAIRS,
  };
  
  return symbolMap[symbolStr?.toUpperCase()] || FloorPlanSymbol.UNKNOWN;
}

/**
 * Validate and transform rooms from PDF analysis
 */
function validateAndTransformPdfRooms(rooms: any[]): DetectedRoom[] {
  return rooms.map((room, index) => {
    // Generate ID if not provided
    const tempId = room.tempId || room.id || `room_${index + 1}`;
    
    // Map room type
    const type = mapToRoomType(room.type);
    
    // Normalize bounding box
    const boundingBox = room.boundingBox || {
      x: 0.1 + (index * 0.1) % 0.8,
      y: 0.1 + (index * 0.1) % 0.8,
      width: 0.2,
      height: 0.2,
    };
    
    // Build geometry
    const geometry: RoomGeometry = {
      boundingBox: {
        x: Math.max(0, Math.min(1, boundingBox.x || 0)),
        y: Math.max(0, Math.min(1, boundingBox.y || 0)),
        width: Math.max(0.05, Math.min(1, boundingBox.width || 0.2)),
        height: Math.max(0.05, Math.min(1, boundingBox.height || 0.2)),
      },
    };
    
    // Map symbols
    const symbolsDetected: FloorPlanSymbol[] = Array.isArray(room.symbols) 
      ? room.symbols.map(mapToSymbol)
      : [];
    
    return {
      tempId,
      name: room.name || null,
      type,
      confidenceScore: Math.max(0, Math.min(1, room.confidence || 0.7)),
      geometry,
      areaEstimate: room.estimatedArea || null,
      areaUnit: 'sqft' as const,
      adjacentRooms: Array.isArray(room.adjacentRooms) ? room.adjacentRooms : [],
      symbolsDetected,
      textDetected: Array.isArray(room.textLabels) ? room.textLabels : [],
      reasoning: room.reasoning || 'Detected from PDF analysis',
      status: RoomStatus.PENDING,
      detectionSource: 'inference' as const,
    };
  });
}

/**
 * Create empty result for cases where analysis fails gracefully
 */
function createEmptyResult(
  projectId: string,
  startTime: number,
  warnings: AnalysisWarning[]
): FloorPlanAnalysisResult {
  return {
    floorplanId: projectId,
    analysisVersion: ANALYSIS_CONFIG.analysisVersion,
    analyzedAt: new Date().toISOString(),
    imageMetadata: {
      width: 1000,
      height: 1000,
      orientation: 'landscape',
      quality: 'medium',
    },
    rooms: [],
    circulation: [],
    warnings,
    overallConfidence: 0,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================
// SINGLE-PASS ANALYSIS
// ============================================

/**
 * Run single-pass comprehensive analysis
 * More reliable than multi-pass, recommended for most cases
 */
async function runSinglePassAnalysis(
  imageBase64: string,
  mimeType: string,
  metadata: ImageMetadata,
  hints?: FloorPlanAnalysisInput['hints']
): Promise<{
  rooms: DetectedRoom[];
  circulation: CirculationPath[];
  warnings: AnalysisWarning[];
}> {
  const gemini = getGeminiClient();
  
  // Build prompt with optional hints
  let prompt = PROMPT_COMPREHENSIVE_SINGLE_PASS;
  if (hints) {
    prompt = buildPromptWithHints(prompt, hints);
  }
  
  // Call Gemini with image
  const response = await callGeminiVision(
    gemini,
    prompt,
    imageBase64,
    mimeType
  );
  
  logger.debug('Gemini single-pass response received', {
    responseLength: response.length,
  });
  
  // Parse and validate response
  const parsed = parseGeminiResponse<{
    rooms?: unknown[];
    circulation?: unknown[];
    warnings?: unknown[];
    selfCheck?: unknown;
    imageMetadata?: unknown;
  }>(response);
  
  // Build room graph from response
  const { rooms, circulation, warnings } = buildRoomGraph(
    parsed as Parameters<typeof buildRoomGraph>[0],
    metadata.width,
    metadata.height
  );
  
  // Validate response has rooms
  if (!rooms.length) {
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.NO_ROOMS_DETECTED,
      'No rooms detected in floor plan',
      true,
      { rooms: [], circulation: [], warnings }
    );
  }
  
  return { rooms, circulation, warnings };
}

// ============================================
// MULTI-PASS ANALYSIS
// ============================================

/**
 * Run multi-pass analysis for complex floor plans
 * Pass A: Spatial Segmentation
 * Pass B: Text & Symbol Extraction  
 * Pass C: Room Classification with Reasoning
 */
async function runMultiPassAnalysis(
  imageBase64: string,
  mimeType: string,
  metadata: ImageMetadata,
  hints?: FloorPlanAnalysisInput['hints']
): Promise<{
  rooms: DetectedRoom[];
  circulation: CirculationPath[];
  warnings: AnalysisWarning[];
}> {
  const gemini = getGeminiClient();
  const warnings: AnalysisWarning[] = [];
  
  // Pass A: Spatial Segmentation
  logger.debug('Running Pass A: Spatial Segmentation');
  const spatialResponse = await callGeminiVision(
    gemini,
    PROMPT_SPATIAL_SEGMENTATION,
    imageBase64,
    mimeType
  );
  const spatialData = parseGeminiResponse<object>(spatialResponse);
  
  logger.debug('Pass A complete', {
    enclosedSpaces: (spatialData as { enclosedSpaces?: unknown[] }).enclosedSpaces?.length || 0,
  });
  
  // Pass B: Text & Symbol Extraction
  logger.debug('Running Pass B: Text & Symbol Extraction');
  const textSymbolResponse = await callGeminiVision(
    gemini,
    PROMPT_TEXT_SYMBOL_EXTRACTION,
    imageBase64,
    mimeType
  );
  const textSymbolData = parseGeminiResponse<object>(textSymbolResponse);
  
  logger.debug('Pass B complete', {
    textLabels: (textSymbolData as { textLabels?: unknown[] }).textLabels?.length || 0,
    symbols: (textSymbolData as { symbols?: unknown[] }).symbols?.length || 0,
  });
  
  // Pass C: Room Classification with context from previous passes
  logger.debug('Running Pass C: Room Classification');
  let classificationPrompt = buildClassificationPrompt(spatialData, textSymbolData);
  if (hints) {
    classificationPrompt = buildPromptWithHints(classificationPrompt, hints);
  }
  
  const classificationResponse = await callGeminiVision(
    gemini,
    classificationPrompt,
    imageBase64,
    mimeType
  );
  const classificationData = parseGeminiResponse<object>(classificationResponse);
  
  logger.debug('Pass C complete');
  
  // Build room graph from classification result
  const result = buildRoomGraph(
    classificationData as Parameters<typeof buildRoomGraph>[0],
    metadata.width,
    metadata.height
  );
  
  warnings.push(...result.warnings);
  
  // Validate
  if (!result.rooms.length) {
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.NO_ROOMS_DETECTED,
      'No rooms detected after multi-pass analysis',
      true,
      { rooms: [], circulation: [], warnings }
    );
  }
  
  return {
    rooms: result.rooms,
    circulation: result.circulation,
    warnings,
  };
}

// ============================================
// GEMINI VISION CALL
// ============================================

/**
 * Call Gemini Vision API with image
 */
async function callGeminiVision(
  gemini: ReturnType<typeof getGeminiClient>,
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const parts = [
    { text: SYSTEM_INSTRUCTION },
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
    { text: prompt },
  ];
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= ANALYSIS_CONFIG.maxRetries; attempt++) {
    try {
      const response = await gemini.analyzeContent(parts, {
        timeoutMs: ANALYSIS_CONFIG.geminiTimeoutMs,
      });
      
      return response;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      logger.warn('Gemini Vision call failed', {
        attempt: attempt + 1,
        maxRetries: ANALYSIS_CONFIG.maxRetries,
        error: lastError.message,
      });
      
      if (attempt < ANALYSIS_CONFIG.maxRetries) {
        await new Promise(r => setTimeout(r, ANALYSIS_CONFIG.retryDelayMs * (attempt + 1)));
      }
    }
  }
  
  throw new FloorPlanAnalysisError(
    FloorPlanErrorCode.GEMINI_API_ERROR,
    `Gemini Vision API failed after ${ANALYSIS_CONFIG.maxRetries + 1} attempts: ${lastError?.message}`,
    true
  );
}

// ============================================
// HELPERS
// ============================================

/**
 * Calculate overall confidence from room confidences
 */
function calculateOverallConfidence(rooms: DetectedRoom[]): number {
  if (rooms.length === 0) return 0;
  
  // Weight by room importance (not all rooms are equally important)
  const importantTypes = new Set([
    RoomType.LIVING_ROOM,
    RoomType.BEDROOM,
    RoomType.KITCHEN,
    RoomType.BATHROOM,
  ]);
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const room of rooms) {
    const weight = importantTypes.has(room.type) ? 2 : 1;
    weightedSum += room.confidenceScore * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ============================================
// EXPORTS
// ============================================

export {
  FloorPlanAnalysisInput,
  FloorPlanAnalysisResult,
  FloorPlanAnalysisError,
  FloorPlanErrorCode,
  DetectedRoom,
  RoomType,
  RoomStatus,
};

