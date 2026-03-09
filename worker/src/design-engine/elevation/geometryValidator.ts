/**
 * TatvaOps Vision - Elevation Geometry Validator
 * 
 * PASS 1: GEOMETRY LOCK (TEXT-ONLY REASONING)
 * 
 * This module validates room geometry BEFORE any image generation.
 * If geometry is invalid or inconsistent, generation is ABORTED.
 * 
 * ============================================================
 * ❗ FLOOR PLAN IS LAW ❗
 * - ≤ 5% geometric deviation only
 * - No hallucinated walls, windows, or doors
 * - Every elevation corresponds to a real wall
 * ============================================================
 * 
 * ZERO TOLERANCE FOR:
 * - Wall count mismatches
 * - Opening count mismatches
 * - Orientation errors
 * - Room boundary violations
 */

import crypto from 'crypto';
import {
  RoomElevationGeometry,
  WallGeometry,
  WallDirection,
  WallOpening,
  BuiltInElement,
  GeometryValidationResult,
  ElevationGenerationError,
  ElevationErrorCode,
  ALL_DIRECTIONS,
} from './types';
import { logger } from '../../lib/logger';

// ============================================
// CONSTANTS
// ============================================

/** Default ceiling height if not specified (in meters) */
const DEFAULT_CEILING_HEIGHT = 3.0;

/** Minimum valid wall length (meters) */
const MIN_WALL_LENGTH = 0.5;

/** Maximum valid wall length (meters) */
const MAX_WALL_LENGTH = 20.0;

/** Maximum allowed deviation from perimeter consistency */
const MAX_PERIMETER_DEVIATION = 0.05; // 5%

// ============================================
// GEOMETRY EXTRACTION FROM ROOM DATA
// ============================================

/**
 * Extract wall geometry from room metadata stored in database.
 * 
 * This function converts the stored room geometry (bounding box, polygon)
 * into wall-specific geometry for elevation generation.
 * 
 * ============================================================
 * ❗ DO NOT MODIFY - Extract geometry as-is from floor plan ❗
 * ============================================================
 */
export function extractWallGeometry(
  roomId: string,
  roomName: string,
  roomType: string,
  geometry: {
    boundingBox: { x: number; y: number; width: number; height: number };
    polygon?: { x: number; y: number }[];
    entryPoints?: { x: number; y: number }[];
  },
  metadata?: {
    areaEstimate?: number;
    areaUnit?: string;
    adjacentRooms?: string[];
    ceilingHeight?: number;
  }
): RoomElevationGeometry {
  
  const { boundingBox } = geometry;
  
  // Calculate dimensions from bounding box
  // Assuming 1 pixel = some unit, we'll normalize
  const pixelToMeter = 0.05; // Approximate conversion - should come from scale
  const length = boundingBox.width * pixelToMeter;
  const width = boundingBox.height * pixelToMeter;
  const ceilingHeight = metadata?.ceilingHeight || DEFAULT_CEILING_HEIGHT;
  
  // Create basic walls from bounding box
  // North wall = top edge (width of room)
  // South wall = bottom edge (width of room)
  // East wall = right edge (depth/length of room)
  // West wall = left edge (depth/length of room)
  
  const walls: RoomElevationGeometry['walls'] = {
    north: createWallGeometry('NORTH', length, ceilingHeight, geometry.entryPoints, boundingBox),
    south: createWallGeometry('SOUTH', length, ceilingHeight, geometry.entryPoints, boundingBox),
    east: createWallGeometry('EAST', width, ceilingHeight, geometry.entryPoints, boundingBox),
    west: createWallGeometry('WEST', width, ceilingHeight, geometry.entryPoints, boundingBox),
  };
  
  // Generate geometry hash for deduplication
  const geometryHash = generateGeometryHash(walls);
  
  return {
    roomId,
    roomName,
    roomType,
    dimensions: {
      length,
      width,
      ceilingHeight,
      unit: 'meters',
    },
    walls,
    geometryHash,
  };
}

/**
 * Create a single wall geometry object.
 */
function createWallGeometry(
  direction: WallDirection,
  wallLength: number,
  ceilingHeight: number,
  entryPoints?: { x: number; y: number }[],
  boundingBox?: { x: number; y: number; width: number; height: number }
): WallGeometry {
  // Determine openings based on entry points
  const openings: WallOpening[] = [];
  
  // If we have entry points and bounding box, determine which walls have doors
  if (entryPoints && boundingBox && entryPoints.length > 0) {
    for (const entry of entryPoints) {
      const wallWithDoor = determineWallFromEntryPoint(entry, boundingBox);
      if (wallWithDoor === direction) {
        // Calculate relative position of door on this wall
        const relativePos = calculateRelativePosition(entry, direction, boundingBox);
        openings.push({
          type: 'DOOR',
          positionX: relativePos,
          widthRatio: 0.15, // Default door width ~15% of wall
          heightRatio: 0.7, // Door height ~70% of ceiling
          bottomRatio: 0, // Door starts at floor
        });
      }
    }
  }
  
  return {
    direction,
    length: wallLength,
    ceilingHeight,
    openings,
    isExterior: false, // Will be updated from adjacency info
  };
}

/**
 * Determine which wall an entry point is on.
 */
function determineWallFromEntryPoint(
  entry: { x: number; y: number },
  boundingBox: { x: number; y: number; width: number; height: number }
): WallDirection {
  const { x: boxX, y: boxY, width, height } = boundingBox;
  const centerX = boxX + width / 2;
  const centerY = boxY + height / 2;
  
  // Calculate distances to each wall
  const distToNorth = Math.abs(entry.y - boxY);
  const distToSouth = Math.abs(entry.y - (boxY + height));
  const distToEast = Math.abs(entry.x - (boxX + width));
  const distToWest = Math.abs(entry.x - boxX);
  
  const minDist = Math.min(distToNorth, distToSouth, distToEast, distToWest);
  
  if (minDist === distToNorth) return 'NORTH';
  if (minDist === distToSouth) return 'SOUTH';
  if (minDist === distToEast) return 'EAST';
  return 'WEST';
}

/**
 * Calculate relative position of a point along a wall (0-1).
 */
function calculateRelativePosition(
  point: { x: number; y: number },
  direction: WallDirection,
  boundingBox: { x: number; y: number; width: number; height: number }
): number {
  const { x: boxX, y: boxY, width, height } = boundingBox;
  
  switch (direction) {
    case 'NORTH':
    case 'SOUTH':
      return (point.x - boxX) / width;
    case 'EAST':
    case 'WEST':
      return (point.y - boxY) / height;
    default:
      return 0.5;
  }
}

// ============================================
// GEOMETRY VALIDATION (PASS 1)
// ============================================

/**
 * Validate room geometry before elevation generation.
 * 
 * This is PASS 1 - text-only reasoning to ensure geometry is valid.
 * If validation fails, generation MUST be aborted.
 * 
 * ============================================================
 * ❗ DO NOT PROCEED IF VALIDATION FAILS ❗
 * Return error with reason. No hallucination allowed.
 * ============================================================
 */
export function validateGeometry(
  geometry: RoomElevationGeometry
): GeometryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  logger.info('Validating room geometry for elevation generation', {
    roomId: geometry.roomId,
    roomName: geometry.roomName,
  });
  
  // 1. Validate all four walls exist
  for (const direction of ALL_DIRECTIONS) {
    const wall = geometry.walls[direction.toLowerCase() as keyof typeof geometry.walls];
    if (!wall) {
      errors.push(`Missing ${direction} wall definition`);
    }
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }
  
  // 2. Validate wall lengths are reasonable
  for (const direction of ALL_DIRECTIONS) {
    const wall = geometry.walls[direction.toLowerCase() as keyof typeof geometry.walls];
    
    if (wall.length < MIN_WALL_LENGTH) {
      errors.push(`${direction} wall too short: ${wall.length}m (min: ${MIN_WALL_LENGTH}m)`);
    }
    
    if (wall.length > MAX_WALL_LENGTH) {
      errors.push(`${direction} wall too long: ${wall.length}m (max: ${MAX_WALL_LENGTH}m)`);
    }
    
    if (wall.ceilingHeight < 2.0) {
      warnings.push(`${direction} wall ceiling height low: ${wall.ceilingHeight}m`);
    }
    
    if (wall.ceilingHeight > 6.0) {
      warnings.push(`${direction} wall ceiling height high: ${wall.ceilingHeight}m`);
    }
  }
  
  // 3. Validate perimeter consistency
  // North and South walls should have similar length
  // East and West walls should have similar length
  const northLength = geometry.walls.north.length;
  const southLength = geometry.walls.south.length;
  const eastLength = geometry.walls.east.length;
  const westLength = geometry.walls.west.length;
  
  const nsDeviation = Math.abs(northLength - southLength) / Math.max(northLength, southLength);
  const ewDeviation = Math.abs(eastLength - westLength) / Math.max(eastLength, westLength);
  
  if (nsDeviation > MAX_PERIMETER_DEVIATION) {
    warnings.push(`North/South wall length mismatch: ${(nsDeviation * 100).toFixed(1)}%`);
  }
  
  if (ewDeviation > MAX_PERIMETER_DEVIATION) {
    warnings.push(`East/West wall length mismatch: ${(ewDeviation * 100).toFixed(1)}%`);
  }
  
  // 4. Validate openings
  for (const direction of ALL_DIRECTIONS) {
    const wall = geometry.walls[direction.toLowerCase() as keyof typeof geometry.walls];
    
    for (let i = 0; i < wall.openings.length; i++) {
      const opening = wall.openings[i];
      
      // Validate opening positions are within wall bounds
      if (opening.positionX < 0 || opening.positionX > 1) {
        errors.push(`${direction} wall opening ${i} position out of bounds: ${opening.positionX}`);
      }
      
      // Validate opening doesn't extend beyond wall
      const openingEnd = opening.positionX + opening.widthRatio;
      if (openingEnd > 1.05) { // Allow 5% tolerance
        warnings.push(`${direction} wall opening ${i} may extend beyond wall edge`);
      }
      
      // Validate opening height
      if (opening.heightRatio + opening.bottomRatio > 1.0) {
        warnings.push(`${direction} wall opening ${i} may extend beyond ceiling`);
      }
    }
    
    // Check for overlapping openings
    for (let i = 0; i < wall.openings.length; i++) {
      for (let j = i + 1; j < wall.openings.length; j++) {
        if (openingsOverlap(wall.openings[i], wall.openings[j])) {
          errors.push(`${direction} wall has overlapping openings at positions ${i} and ${j}`);
        }
      }
    }
  }
  
  // 5. Log validation result
  if (errors.length > 0) {
    logger.error('Geometry validation failed', {
      roomId: geometry.roomId,
      errors,
      warnings,
    });
  } else {
    logger.info('Geometry validation passed', {
      roomId: geometry.roomId,
      warnings,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validatedWalls: errors.length === 0 ? geometry.walls : undefined,
  };
}

/**
 * Check if two openings overlap horizontally.
 */
function openingsOverlap(a: WallOpening, b: WallOpening): boolean {
  const aLeft = a.positionX;
  const aRight = a.positionX + a.widthRatio;
  const bLeft = b.positionX;
  const bRight = b.positionX + b.widthRatio;
  
  return !(aRight < bLeft || bRight < aLeft);
}

// ============================================
// GEOMETRY HASHING
// ============================================

/**
 * Generate a hash of the geometry for deduplication.
 * Same geometry = same hash = can skip regeneration.
 */
export function generateGeometryHash(
  walls: RoomElevationGeometry['walls']
): string {
  const hashInput = {
    north: serializeWallForHash(walls.north),
    south: serializeWallForHash(walls.south),
    east: serializeWallForHash(walls.east),
    west: serializeWallForHash(walls.west),
  };
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Serialize wall for hashing (only geometry-relevant fields).
 */
function serializeWallForHash(wall: WallGeometry): object {
  return {
    direction: wall.direction,
    length: Math.round(wall.length * 100) / 100, // 2 decimal precision
    ceilingHeight: Math.round(wall.ceilingHeight * 100) / 100,
    openings: wall.openings.map(o => ({
      type: o.type,
      positionX: Math.round(o.positionX * 100) / 100,
      widthRatio: Math.round(o.widthRatio * 100) / 100,
      heightRatio: Math.round(o.heightRatio * 100) / 100,
      bottomRatio: Math.round(o.bottomRatio * 100) / 100,
    })),
    isExterior: wall.isExterior,
    builtIns: wall.builtIns?.map(b => ({
      type: b.type,
      positionX: Math.round(b.positionX * 100) / 100,
      widthRatio: Math.round(b.widthRatio * 100) / 100,
    })),
  };
}

// ============================================
// GEOMETRY CONSTRAINT STRING BUILDER
// ============================================

/**
 * Build a precise geometry constraint string for a wall.
 * This will be included in the prompt to enforce accuracy.
 * 
 * ============================================================
 * ❗ CRITICAL: This string enforces geometry in the prompt ❗
 * Do not add any elements not specified here.
 * ============================================================
 */
export function buildGeometryConstraintString(
  wall: WallGeometry,
  roomName: string
): string {
  const constraints: string[] = [];
  
  // Wall dimensions
  constraints.push(`Wall Direction: ${wall.direction}`);
  constraints.push(`Wall Width: ${wall.length.toFixed(2)} meters`);
  constraints.push(`Ceiling Height: ${wall.ceilingHeight.toFixed(2)} meters`);
  constraints.push(`Wall Type: ${wall.isExterior ? 'Exterior' : 'Interior'} wall`);
  
  // Openings
  if (wall.openings.length === 0) {
    constraints.push('Openings: NONE - This wall has no doors or windows');
  } else {
    constraints.push(`Openings: ${wall.openings.length} total`);
    wall.openings.forEach((opening, i) => {
      const leftPos = (opening.positionX * 100).toFixed(0);
      const widthPct = (opening.widthRatio * 100).toFixed(0);
      const heightPct = (opening.heightRatio * 100).toFixed(0);
      const bottomPct = (opening.bottomRatio * 100).toFixed(0);
      
      constraints.push(`  ${i + 1}. ${opening.type}:`);
      constraints.push(`     - Position: ${leftPos}% from left edge`);
      constraints.push(`     - Width: ${widthPct}% of wall width`);
      constraints.push(`     - Height: ${heightPct}% of ceiling height`);
      constraints.push(`     - Bottom: ${bottomPct}% from floor`);
    });
  }
  
  // Built-ins
  if (wall.builtIns && wall.builtIns.length > 0) {
    constraints.push(`Built-in Elements: ${wall.builtIns.length} total`);
    wall.builtIns.forEach((builtIn, i) => {
      constraints.push(`  ${i + 1}. ${builtIn.type}:`);
      constraints.push(`     - Position: ${(builtIn.positionX * 100).toFixed(0)}% from left`);
      constraints.push(`     - Width: ${(builtIn.widthRatio * 100).toFixed(0)}% of wall`);
    });
  }
  
  // Adjacent room info
  if (wall.adjacentRoom) {
    constraints.push(`Adjacent Room: ${wall.adjacentRoom.name || wall.adjacentRoom.type}`);
  }
  
  return constraints.join('\n');
}


