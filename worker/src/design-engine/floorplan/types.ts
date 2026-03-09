/**
 * Floor Plan Vision Analysis Engine - Type Definitions
 * 
 * This module defines all types for the floor plan analysis system.
 * The engine prioritizes COMPLETENESS over confidence - better to
 * over-detect than miss a room.
 * 
 * CORE PRINCIPLE: Never miss a room. False positives are acceptable,
 * false negatives are NOT.
 */

// ============================================
// ROOM TYPE CLASSIFICATION
// ============================================

/**
 * Supported room types - extensible list
 * If uncertain, use UNCLASSIFIED (never drop a detected space)
 */
export enum RoomType {
  LIVING_ROOM = 'LIVING_ROOM',
  BEDROOM = 'BEDROOM',
  KITCHEN = 'KITCHEN',
  DINING = 'DINING',
  BATHROOM = 'BATHROOM',
  TOILET = 'TOILET',
  BALCONY = 'BALCONY',
  UTILITY = 'UTILITY',
  STORE = 'STORE',
  STUDY = 'STUDY',
  PUJA = 'PUJA',
  PASSAGE = 'PASSAGE',
  STAIRCASE = 'STAIRCASE',
  LOBBY = 'LOBBY',
  FOYER = 'FOYER',
  TERRACE = 'TERRACE',
  GARAGE = 'GARAGE',
  SERVANT_ROOM = 'SERVANT_ROOM',
  DRESS = 'DRESS', // Dressing room
  UNCLASSIFIED = 'UNCLASSIFIED', // CRITICAL: Use this if uncertain, NEVER drop
}

/**
 * Room status for human-in-the-loop workflow
 */
export enum RoomStatus {
  PENDING = 'PENDING',       // Detected by AI, awaiting human confirmation
  CONFIRMED = 'CONFIRMED',   // Human confirmed
  LOCKED = 'LOCKED',         // Locked for subsequent processing
  REJECTED = 'REJECTED',     // Human rejected (false positive)
}

/**
 * Circulation types (passages, corridors, lobbies)
 */
export enum CirculationType {
  PASSAGE = 'PASSAGE',
  CORRIDOR = 'CORRIDOR',
  LOBBY = 'LOBBY',
  STAIRWELL = 'STAIRWELL',
}

/**
 * Detectable symbols in floor plans
 */
export enum FloorPlanSymbol {
  BED = 'BED',
  SOFA = 'SOFA',
  DINING_TABLE = 'DINING_TABLE',
  SINK = 'SINK',
  TOILET_SEAT = 'TOILET_SEAT',
  BATHTUB = 'BATHTUB',
  SHOWER = 'SHOWER',
  KITCHEN_COUNTER = 'KITCHEN_COUNTER',
  STOVE = 'STOVE',
  REFRIGERATOR = 'REFRIGERATOR',
  WARDROBE = 'WARDROBE',
  DOOR = 'DOOR',
  DOOR_ARC = 'DOOR_ARC',
  WINDOW = 'WINDOW',
  STAIRS = 'STAIRS',
  ELEVATOR = 'ELEVATOR',
  AC_UNIT = 'AC_UNIT',
  WASHING_MACHINE = 'WASHING_MACHINE',
  UNKNOWN = 'UNKNOWN',
}

// ============================================
// GEOMETRY TYPES
// ============================================

/**
 * 2D point in image coordinates
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Bounding box for a room
 */
export interface BoundingBox {
  x: number;      // Top-left X
  y: number;      // Top-left Y
  width: number;  // Width
  height: number; // Height
}

/**
 * Room geometry - supports both simple bbox and complex polygons
 */
export interface RoomGeometry {
  /** Axis-aligned bounding box (always present) */
  boundingBox: BoundingBox;
  
  /** Polygon vertices for irregular shapes (optional but preferred) */
  polygon?: Point2D[];
  
  /** Centroid of the room */
  centroid?: Point2D;
  
  /** Room entry points (door locations) */
  entryPoints?: Point2D[];
}

// ============================================
// ROOM & SPACE DEFINITIONS
// ============================================

/**
 * Detected room from floor plan analysis
 * 
 * CRITICAL: Every room MUST have:
 * - confidenceScore (0-1)
 * - reasoning (human-readable explanation)
 */
export interface DetectedRoom {
  /** Temporary ID for graph construction (will become DB UUID) */
  tempId: string;
  
  /** Room name from floor plan label (null if not labeled) */
  name: string | null;
  
  /** Classified room type */
  type: RoomType;
  
  /** Confidence score (0-1) - lower is acceptable if room is included */
  confidenceScore: number;
  
  /** Room geometry in image coordinates */
  geometry: RoomGeometry;
  
  /** Estimated area in sq.ft or sq.m (null if cannot determine scale) */
  areaEstimate: number | null;
  
  /** Unit for area estimate */
  areaUnit?: 'sqft' | 'sqm' | null;
  
  /** IDs of adjacent rooms (graph edges) */
  adjacentRooms: string[];
  
  /** Symbols detected within this room */
  symbolsDetected: FloorPlanSymbol[];
  
  /** Text labels detected within/near this room */
  textDetected: string[];
  
  /** 
   * CRITICAL: Human-readable reasoning for classification
   * This enables debugging, admin review, and user trust
   */
  reasoning: string;
  
  /** Room status for human-in-the-loop workflow */
  status: RoomStatus;
  
  /** Source of detection */
  detectionSource: 'label' | 'symbol' | 'inference' | 'boundary';
}

/**
 * Circulation path connecting rooms
 */
export interface CirculationPath {
  /** Unique ID for this circulation element */
  id: string;
  
  /** Type of circulation */
  type: CirculationType;
  
  /** Room IDs this circulation connects */
  connects: string[];
  
  /** Geometry of the circulation path */
  geometry?: RoomGeometry;
}

// ============================================
// IMAGE METADATA
// ============================================

/**
 * Metadata extracted from the floor plan image
 */
export interface ImageMetadata {
  /** Image width in pixels */
  width: number;
  
  /** Image height in pixels */
  height: number;
  
  /** Detected scale (e.g., "1:100") - optional */
  scale?: string;
  
  /** Pixels per unit if scale detected */
  pixelsPerUnit?: number;
  
  /** Unit of measurement */
  unit?: 'feet' | 'meters' | 'inches';
  
  /** Detected orientation */
  orientation?: 'portrait' | 'landscape';
  
  /** Image quality assessment */
  quality?: 'high' | 'medium' | 'low';
  
  /** Detected plan type */
  planType?: 'architectural' | 'hand_drawn' | 'cad' | 'scan' | 'photo';
}

// ============================================
// ANALYSIS OUTPUT
// ============================================

/**
 * Warning/note from analysis
 * Used to flag potential issues for human review
 */
export interface AnalysisWarning {
  /** Warning severity */
  severity: 'info' | 'warning' | 'critical';
  
  /** Warning message */
  message: string;
  
  /** Affected room IDs (if applicable) */
  affectedRooms?: string[];
  
  /** Location in image (if applicable) */
  location?: BoundingBox;
}

/**
 * Complete floor plan analysis result
 * 
 * This is the structured output that will be:
 * 1. Stored in the database
 * 2. Sent to the UI for human confirmation
 * 3. Used by subsequent stages (moodboard, elevation, etc.)
 */
export interface FloorPlanAnalysisResult {
  /** Project's floor plan ID */
  floorplanId: string;
  
  /** Analysis version for future migrations */
  analysisVersion: string;
  
  /** Timestamp of analysis */
  analyzedAt: string;
  
  /** Image metadata */
  imageMetadata: ImageMetadata;
  
  /** All detected rooms - NEVER empty if image contains spaces */
  rooms: DetectedRoom[];
  
  /** Circulation paths */
  circulation: CirculationPath[];
  
  /** Warnings for human review */
  warnings: AnalysisWarning[];
  
  /** Overall analysis confidence */
  overallConfidence: number;
  
  /** Raw Gemini response for debugging (stripped in production) */
  rawResponse?: string;
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

// ============================================
// INPUT TYPES
// ============================================

/**
 * Floor plan analysis job input
 */
export interface FloorPlanAnalysisInput {
  /** Job ID for tracking */
  jobId: string;
  
  /** User ID */
  userId: string;
  
  /** Project ID */
  projectId: string;
  
  /** S3 URL of the floor plan image (preferred) */
  imageUrl?: string;
  
  /** Base64 encoded image (fallback) */
  imageBase64?: string;
  
  /** MIME type of the image */
  mimeType: 'image/png' | 'image/jpeg' | 'image/jpg' | 'application/pdf';
  
  /** Optional hints from user */
  hints?: {
    /** Expected number of rooms */
    expectedRoomCount?: number;
    /** Known room names */
    knownRoomNames?: string[];
    /** Plan type hint */
    planType?: 'residential' | 'commercial' | 'mixed';
  };
}

// ============================================
// GEMINI RESPONSE TYPES
// ============================================

/**
 * Gemini Vision spatial segmentation response
 */
export interface GeminiSpatialResponse {
  enclosedSpaces: Array<{
    id: string;
    boundingBox: BoundingBox;
    isFullyEnclosed: boolean;
    wallBoundaries: 'complete' | 'partial' | 'open';
  }>;
  openSpaces: Array<{
    id: string;
    boundingBox: BoundingBox;
    openTo: string[];
  }>;
  circulationAreas: Array<{
    id: string;
    type: string;
    boundingBox: BoundingBox;
    connectsSpaces: string[];
  }>;
}

/**
 * Gemini Vision text and symbol extraction response
 */
export interface GeminiTextSymbolResponse {
  textLabels: Array<{
    text: string;
    location: BoundingBox;
    confidence: number;
    associatedSpaceId?: string;
  }>;
  symbols: Array<{
    type: string;
    location: BoundingBox;
    confidence: number;
    associatedSpaceId?: string;
  }>;
  dimensions: Array<{
    value: string;
    unit?: string;
    location: BoundingBox;
  }>;
}

/**
 * Gemini Vision reasoning response
 */
export interface GeminiReasoningResponse {
  roomClassifications: Array<{
    spaceId: string;
    classifiedType: RoomType;
    confidence: number;
    reasoning: string;
    alternativeTypes?: Array<{
      type: RoomType;
      confidence: number;
    }>;
  }>;
  uncertainAreas: Array<{
    location: BoundingBox;
    reason: string;
    suggestedType?: RoomType;
  }>;
  adjacencyGraph: Array<{
    roomA: string;
    roomB: string;
    connectionType: 'door' | 'opening' | 'adjacent_wall';
  }>;
}

// ============================================
// PREPROCESSING TYPES
// ============================================

/**
 * Image preprocessing result
 */
export interface PreprocessingResult {
  /** Preprocessed image as base64 */
  processedImage: string;
  
  /** MIME type */
  mimeType: string;
  
  /** Wall detection confidence */
  wallDetectionConfidence: number;
  
  /** Detected line density */
  lineDensity: 'high' | 'medium' | 'low';
  
  /** Text region hints */
  textRegions: BoundingBox[];
  
  /** Processing notes */
  notes: string[];
}

// ============================================
// ERROR TYPES
// ============================================

export enum FloorPlanErrorCode {
  INVALID_IMAGE = 'INVALID_IMAGE',
  NO_ROOMS_DETECTED = 'NO_ROOMS_DETECTED',
  PREPROCESSING_FAILED = 'PREPROCESSING_FAILED',
  GEMINI_API_ERROR = 'GEMINI_API_ERROR',
  PARSING_FAILED = 'PARSING_FAILED',
  S3_FETCH_FAILED = 'S3_FETCH_FAILED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export class FloorPlanAnalysisError extends Error {
  constructor(
    public code: FloorPlanErrorCode,
    message: string,
    public isRetryable: boolean = false,
    public partialResult?: Partial<FloorPlanAnalysisResult>
  ) {
    super(message);
    this.name = 'FloorPlanAnalysisError';
  }
}

