/**
 * TatvaOps Vision - 2D Wall Elevation Generation Types
 * 
 * Type definitions for the elevation generation system.
 * 
 * CORE PRINCIPLE: Floor plan is LAW. Moodboard is style only.
 * 
 * ============================================================
 * ❗ FLOOR PLAN GEOMETRY IS NON-NEGOTIABLE ❗
 * - ≤ 5% geometric deviation only
 * - No hallucinated walls, windows, or doors
 * - Every elevation corresponds to a real wall
 * ============================================================
 */

import { DesignIntent } from '../types';

// ============================================
// WALL DIRECTION
// ============================================

/**
 * Cardinal directions for wall elevations.
 * Each room generates 4 elevations (N/E/S/W).
 */
export type WallDirection = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export const ALL_DIRECTIONS: WallDirection[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

// ============================================
// OPENING TYPES
// ============================================

/**
 * Types of openings in a wall.
 */
export type OpeningType = 'DOOR' | 'WINDOW' | 'ARCHWAY' | 'NICHE' | 'PASS_THROUGH';

/**
 * Opening specification in a wall.
 * Position is relative (0-1 scale where 0 = left edge, 1 = right edge).
 */
export interface WallOpening {
  type: OpeningType;
  /** Relative horizontal position (0-1, left to right) */
  positionX: number;
  /** Opening width relative to wall width (0-1) */
  widthRatio: number;
  /** Opening height relative to ceiling height (0-1) */
  heightRatio: number;
  /** Bottom position relative to floor (0-1, 0 = floor level) */
  bottomRatio: number;
  /** Optional: specific dimension in meters/feet */
  widthActual?: number;
  heightActual?: number;
  /** Optional: styling hints */
  style?: string;
}

// ============================================
// WALL GEOMETRY (STRICT)
// ============================================

/**
 * Wall geometry extracted from floor plan.
 * 
 * ============================================================
 * ❗ DO NOT MODIFY THIS DATA DURING GENERATION ❗
 * This is the source of truth from floor plan analysis.
 * ============================================================
 */
export interface WallGeometry {
  /** Wall direction relative to room center */
  direction: WallDirection;
  
  /** Wall length in relative units (meters or feet) */
  length: number;
  
  /** Ceiling height in relative units */
  ceilingHeight: number;
  
  /** Wall thickness (for depth indication) */
  thickness?: number;
  
  /** Openings in this wall (doors/windows) */
  openings: WallOpening[];
  
  /** Adjacent room on the other side (if any) */
  adjacentRoom?: {
    id: string;
    type: string;
    name?: string;
  };
  
  /** Is this an exterior wall? */
  isExterior: boolean;
  
  /** Any built-in elements on this wall */
  builtIns?: BuiltInElement[];
}

/**
 * Built-in element specification.
 */
export interface BuiltInElement {
  type: 'WARDROBE' | 'TV_UNIT' | 'BOOKSHELF' | 'KITCHEN_COUNTER' | 'VANITY' | 'STORAGE' | 'OTHER';
  /** Relative position on wall (0-1) */
  positionX: number;
  /** Width relative to wall (0-1) */
  widthRatio: number;
  /** Height relative to ceiling (0-1) */
  heightRatio: number;
  /** Bottom position (0 = floor) */
  bottomRatio: number;
  /** Description for styling */
  description?: string;
}

// ============================================
// ROOM GEOMETRY FOR ELEVATION
// ============================================

/**
 * Complete room geometry for elevation generation.
 * Derived from floor plan analysis.
 */
export interface RoomElevationGeometry {
  /** Room ID from database */
  roomId: string;
  
  /** Room name */
  roomName: string;
  
  /** Room type for contextual styling */
  roomType: string;
  
  /** Approximate room dimensions */
  dimensions: {
    length: number;
    width: number;
    ceilingHeight: number;
    unit: 'meters' | 'feet';
  };
  
  /** All four walls */
  walls: {
    north: WallGeometry;
    east: WallGeometry;
    south: WallGeometry;
    west: WallGeometry;
  };
  
  /** Geometry hash for deduplication */
  geometryHash: string;
}

// ============================================
// MOODBOARD STYLE EXTRACTION
// ============================================

/**
 * Style attributes extracted from moodboard.
 * These ONLY affect finishes, NEVER geometry.
 * 
 * ============================================================
 * ❗ MOODBOARD MUST NEVER OVERRIDE GEOMETRY ❗
 * Style is secondary to structural accuracy.
 * ============================================================
 */
export interface ElevationStyle {
  /** Primary wall color/finish */
  wallFinish: string;
  
  /** Wall treatment (paint, wallpaper, paneling, etc.) */
  wallTreatment: string;
  
  /** Color palette from moodboard */
  colorPalette: string[];
  
  /** Material preferences */
  materials: string[];
  
  /** Lighting fixture style */
  lightingStyle: string;
  
  /** Furniture/decor hints */
  decorStyle: string;
  
  /** Flooring visible at bottom of elevation */
  flooringHint: string;
  
  /** Ceiling treatment */
  ceilingTreatment: string;
  
  /** Overall aesthetic */
  aesthetic: string;
  
  /** Style hash for deduplication */
  styleHash: string;
}

// ============================================
// GENERATION INPUT/OUTPUT
// ============================================

/**
 * Input for generating a single wall elevation.
 */
export interface WallElevationInput {
  /** Room geometry */
  roomGeometry: RoomElevationGeometry;
  
  /** Which wall to generate */
  wallDirection: WallDirection;
  
  /** Style to apply */
  style: ElevationStyle;
  
  /** Design intent/preferences */
  designIntent?: DesignIntent;
  
  /** Moodboard image URL for reference (optional) */
  moodboardUrl?: string;
  
  /** Generation version */
  version: number;
}

/**
 * Output from wall elevation generation.
 */
export interface WallElevationOutput {
  /** Generated image URL (S3) */
  imageUrl: string;
  
  /** S3 key for the image */
  s3Key: string;
  
  /** MIME type */
  mimeType: string;
  
  /** Geometry hash used */
  geometryHash: string;
  
  /** Style hash used */
  styleHash: string;
  
  /** Estimated deviation from target (0-1) */
  deviationEstimate: number;
  
  /** Generation timestamp */
  generatedAt: string;
  
  /** Processing duration in ms */
  durationMs: number;
}

/**
 * Complete elevation job input.
 */
export interface ElevationJobInput {
  /** Job ID */
  jobId: string;
  
  /** Project ID */
  projectId: string;
  
  /** Room ID */
  roomId: string;
  
  /** User ID */
  userId: string;
  
  /** Room geometry (from floor plan) */
  roomGeometry?: RoomElevationGeometry;
  
  /** Moodboard URL for style extraction */
  moodboardUrl?: string;

  /** Design intent/preferences */
  designIntent?: DesignIntent;
  
  /** Which walls to generate (default: all 4) */
  wallsToGenerate?: WallDirection[];
  
  /** Version number */
  version: number;
}

/**
 * Complete elevation job output.
 */
export interface ElevationJobResult {
  /** Room ID */
  roomId: string;
  
  /** Generated elevations (up to 4) */
  elevations: {
    direction: WallDirection;
    output: WallElevationOutput;
  }[];
  
  /** Any walls that failed */
  failures: {
    direction: WallDirection;
    error: string;
    isRetryable: boolean;
  }[];
  
  /** Total duration */
  totalDurationMs: number;
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Geometry validation result.
 */
export interface GeometryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  
  /** Validated walls with any corrections */
  validatedWalls?: {
    north: WallGeometry;
    east: WallGeometry;
    south: WallGeometry;
    west: WallGeometry;
  };
}

/**
 * Error codes for elevation generation.
 */
export enum ElevationErrorCode {
  INVALID_GEOMETRY = 'INVALID_GEOMETRY',
  GEOMETRY_MISMATCH = 'GEOMETRY_MISMATCH',
  MISSING_ROOM_DATA = 'MISSING_ROOM_DATA',
  MOODBOARD_EXTRACTION_FAILED = 'MOODBOARD_EXTRACTION_FAILED',
  PROMPT_GENERATION_FAILED = 'PROMPT_GENERATION_FAILED',
  IMAGE_GENERATION_FAILED = 'IMAGE_GENERATION_FAILED',
  S3_UPLOAD_FAILED = 'S3_UPLOAD_FAILED',
  DEVIATION_TOO_HIGH = 'DEVIATION_TOO_HIGH',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error for elevation generation.
 */
export class ElevationGenerationError extends Error {
  constructor(
    public code: ElevationErrorCode,
    message: string,
    public isRetryable: boolean = false,
    public wallDirection?: WallDirection,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ElevationGenerationError';
  }
}


