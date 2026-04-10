/**
 * TatvaOps Vision - Isometric Floor Elevation Types
 * 
 * Type definitions for the full-floor isometric elevation generation system.
 * 
 * ============================================================
 * ❗ FLOOR PLAN GEOMETRY IS LAW ❗
 * ❗ ONE IMAGE = ENTIRE FLOOR ❗
 * ❗ ≤ 5% DEVIATION ONLY FOR DÉCOR ❗
 * ============================================================
 */

import { DesignIntent } from '../types';

// ===========================================
// Room Data Types
// ===========================================

/**
 * Room geometry from floor plan extractor
 */
export interface RoomGeometry {
  /** Unique room identifier */
  roomId: string;
  
  /** Room display name */
  roomName: string;
  
  /** Room type (BEDROOM, LIVING_ROOM, etc.) */
  roomType: string;
  
  /** Bounding box */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Polygon points (if available) */
  polygon?: { x: number; y: number }[];
  
  /** Area in square units */
  area?: number;
  
  /** Ceiling height (default: 10ft / 3m) */
  ceilingHeight?: number;
  
  /** Adjacent room IDs */
  adjacentRooms?: string[];
}

/**
 * Door/window opening
 */
export interface Opening {
  type: 'DOOR' | 'WINDOW' | 'ARCHWAY';
  position: { x: number; y: number };
  width: number;
  height: number;
  connectsRooms?: [string, string];
}

/**
 * Full floor geometry from extractor
 */
export interface FloorGeometry {
  /** Floor number (1-indexed) */
  floor: number;
  
  /** Total floor dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  
  /** All rooms on this floor */
  rooms: RoomGeometry[];
  
  /** Wall thickness (default: 6 inches) */
  wallThickness?: number;
  
  /** All openings (doors, windows) */
  openings?: Opening[];
  
  /** Orientation reference (north direction) */
  northAngle?: number;
  
  /** Circulation paths (hallways, passages) */
  circulationPaths?: { x: number; y: number }[][];
  
  /** Balconies/voids */
  balconies?: RoomGeometry[];
  
  /** Stairs (if any) */
  stairs?: {
    position: { x: number; y: number };
    width: number;
    length: number;
    direction: 'UP' | 'DOWN';
  }[];
}

// ===========================================
// Style Types
// ===========================================

/**
 * Extracted style from a room's moodboard
 */
export interface RoomStyle {
  roomId: string;
  roomType: string;
  
  /** Color palette */
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  
  /** Material preferences */
  materials: {
    walls: string;
    flooring: string;
    ceiling?: string;
  };
  
  /** Furniture details */
  furniture?: {
    pieces?: string[];
    materials?: string;
    arrangement?: string;
  };
  
  /** Decorative elements */
  decorativeElements?: string[];
  
  /** Textures and patterns */
  textures?: {
    fabrics?: string;
    wood?: string;
    tiles?: string;
    other?: string;
  };
  
  /** Lighting fixtures */
  lightingFixtures?: string[];
  
  /** Furniture style */
  furnitureStyle: string;
  
  /** Lighting mood */
  lightingMood: 'warm' | 'neutral' | 'cool';
  
  /** Additional style notes */
  styleNotes?: string;
}

/**
 * Combined floor-wide style map
 */
export interface FloorStyleMap {
  /** Room ID -> Style mapping */
  roomStyles: Record<string, RoomStyle>;
  
  /** Global style coherence notes */
  coherenceNotes?: string;
  
  /** Hash for deduplication */
  styleHash: string;
}

// ===========================================
// Job Input/Output Types
// ===========================================

/**
 * Input for isometric floor elevation generation
 */
export interface IsometricJobInput {
  /** AI job ID */
  jobId: string;
  
  /** Project ID */
  projectId: string;
  
  /** User ID */
  userId: string;
  
  /** Floor geometry (from extractor) */
  floorGeometry: FloorGeometry;
  
  /** Room moodboard URLs (roomId -> moodboardUrl) */
  moodboardUrls: Record<string, string>;
  
  /** Original floor plan image URL (for geometry reference) */
  floorPlanImageUrl?: string;
  
  /** Design intent/preferences */
  designIntent?: DesignIntent;
  
  /** Floor number */
  floor?: number;
  
  /** Version for regeneration */
  version?: number;
}

/**
 * Single elevation output
 */
export interface IsometricJobOutput {
  /** Generated image URL */
  imageUrl: string;
  
  /** S3 key for storage */
  s3Key: string;
  
  /** Image MIME type */
  mimeType: string;
  
  /** Geometry hash (for change detection) */
  geometryHash: string;
  
  /** Style hash (for change detection) */
  styleHash: string;
  
  /** Number of rooms in elevation */
  roomCount: number;
  
  /** Estimated geometric deviation from geometry (0-1) */
  deviationEstimate: number;
  
  /** Architectural accuracy - how similar elevation is to floor plan (0-1, 1.0 = perfect match) */
  architecturalAccuracy?: number;
  
  /** Generation timestamp */
  generatedAt: string;
  
  /** Generation duration in ms */
  durationMs: number;
  
  /** Internal: base64 image data for S3 upload */
  _imageData?: string;
}

/**
 * Full job result
 */
export interface IsometricJobResult {
  /** Success indicator */
  success: boolean;
  
  /** Output (if successful) */
  output?: IsometricJobOutput;
  
  /** Error details (if failed) */
  error?: {
    code: IsometricErrorCode;
    message: string;
    details?: unknown;
  };
  
  /** Total processing time */
  totalDurationMs: number;
}

// ===========================================
// Error Types
// ===========================================

/**
 * Error codes for isometric generation
 */
export enum IsometricErrorCode {
  /** Invalid or missing floor geometry */
  INVALID_GEOMETRY = 'INVALID_GEOMETRY',
  
  /** Geometry validation failed */
  GEOMETRY_VALIDATION_FAILED = 'GEOMETRY_VALIDATION_FAILED',
  
  /** Room count mismatch */
  ROOM_COUNT_MISMATCH = 'ROOM_COUNT_MISMATCH',
  
  /** Room overlap detected */
  ROOM_OVERLAP_DETECTED = 'ROOM_OVERLAP_DETECTED',
  
  /** Missing moodboard */
  MISSING_MOODBOARD = 'MISSING_MOODBOARD',
  
  /** Style extraction failed */
  STYLE_EXTRACTION_FAILED = 'STYLE_EXTRACTION_FAILED',
  
  /** Prompt composition failed */
  PROMPT_COMPOSITION_FAILED = 'PROMPT_COMPOSITION_FAILED',
  
  /** Image generation failed */
  IMAGE_GENERATION_FAILED = 'IMAGE_GENERATION_FAILED',
  
  /** Deviation exceeded limit */
  DEVIATION_EXCEEDED = 'DEVIATION_EXCEEDED',
  
  /** Storage failed */
  STORAGE_FAILED = 'STORAGE_FAILED',
  
  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for isometric generation
 */
export class IsometricGenerationError extends Error {
  constructor(
    public readonly code: IsometricErrorCode,
    message: string,
    public readonly isRetryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'IsometricGenerationError';
  }
}

// ===========================================
// Validation Types
// ===========================================

/**
 * Geometry validation result
 */
export interface GeometryValidationResult {
  /** Validation passed */
  isValid: boolean;
  
  /** Validated geometry (may have corrections) */
  geometry?: FloorGeometry;
  
  /** Hash of validated geometry */
  geometryHash?: string;
  
  /** Validation errors */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
}

/**
 * Style mapping result
 */
export interface StyleMappingResult {
  /** Mapping successful */
  success: boolean;
  
  /** Floor style map */
  styleMap?: FloorStyleMap;
  
  /** Rooms with missing/failed moodboards */
  failedRooms: string[];
}

// ===========================================
// Prompt Types
// ===========================================

/**
 * Composed prompt for image generation
 */
export interface IsometricPrompt {
  /** Main generation prompt */
  prompt: string;
  
  /** Geometry description section */
  geometrySection: string;
  
  /** Room-by-room style section */
  styleSection: string;
  
  /** Prohibitions list */
  prohibitions: string[];
  
  /** Prompt hash for caching */
  promptHash: string;
}

// ===========================================
// Constants
// ===========================================

/**
 * Maximum allowed geometric deviation (5%)
 */
export const MAX_DEVIATION = 0.05;

/**
 * Default ceiling height in feet
 */
export const DEFAULT_CEILING_HEIGHT = 10;

/**
 * Default wall thickness in inches
 */
export const DEFAULT_WALL_THICKNESS = 6;

/**
 * Minimum image resolution
 */
export const MIN_RESOLUTION = {
  width: 3840,
  height: 2160,
};


