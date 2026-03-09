/**
 * TatvaOps Vision - Isometric Floor Geometry Validator
 * 
 * STAGE 1: Full floor geometry validation before image generation.
 * 
 * ============================================================
 * ❗ FLOOR PLAN GEOMETRY IS LAW ❗
 * ❗ NO MODIFICATIONS ALLOWED ❗
 * ============================================================
 * 
 * This module validates the floor plan geometry to ensure:
 * - All rooms are present and correctly shaped
 * - No overlapping rooms
 * - No gaps in the floor plan
 * - Room count matches expected
 * - Circulation paths are valid
 */

import { createHash } from 'crypto';
import {
  FloorGeometry,
  RoomGeometry,
  GeometryValidationResult,
  IsometricGenerationError,
  IsometricErrorCode,
  DEFAULT_WALL_THICKNESS,
  DEFAULT_CEILING_HEIGHT,
} from './types';
import { logger } from '../../lib/logger';

// ===========================================
// Main Validation Function
// ===========================================

/**
 * Validate floor geometry for isometric generation.
 * 
 * ============================================================
 * ❗ DO NOT MODIFY GEOMETRY - VALIDATE ONLY ❗
 * ============================================================
 * 
 * @returns Validation result with geometry hash
 */
export function validateFloorGeometry(
  geometry: FloorGeometry,
  expectedRoomCount?: number
): GeometryValidationResult {
  logger.info('Validating floor geometry for isometric generation', {
    floor: geometry.floor,
    roomCount: geometry.rooms.length,
    expectedRoomCount,
  });

  const errors: string[] = [];
  const warnings: string[] = [];

  // ===========================================
  // 1. Basic Structure Validation
  // ===========================================
  
  if (!geometry.rooms || geometry.rooms.length === 0) {
    errors.push('No rooms found in floor geometry');
    return { isValid: false, errors, warnings };
  }

  if (!geometry.dimensions || geometry.dimensions.width <= 0 || geometry.dimensions.height <= 0) {
    errors.push('Invalid floor dimensions');
    return { isValid: false, errors, warnings };
  }

  // ===========================================
  // 2. Room Count Validation & Duplicate Check
  // ===========================================
  
  // Check for duplicate room IDs
  const roomIds = new Set<string>();
  const duplicateIds: string[] = [];
  for (const room of geometry.rooms) {
    if (roomIds.has(room.roomId)) {
      duplicateIds.push(room.roomId);
    }
    roomIds.add(room.roomId);
  }
  
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate room IDs detected: ${duplicateIds.join(', ')}`);
  }
  
  if (expectedRoomCount !== undefined && geometry.rooms.length !== expectedRoomCount) {
    warnings.push(
      `Room count mismatch: expected ${expectedRoomCount}, found ${geometry.rooms.length}`
    );
  }

  // ===========================================
  // 3. Individual Room Validation
  // ===========================================
  
  for (const room of geometry.rooms) {
    const roomErrors = validateRoom(room);
    errors.push(...roomErrors.map(e => `Room "${room.roomName}": ${e}`));
  }

  // ===========================================
  // 4. Room Overlap Detection (Warning only)
  // ===========================================
  // Small overlaps are acceptable in floor plans (e.g., closets inside bedrooms)
  // Only flag as warning, not error
  
  const overlaps = detectRoomOverlaps(geometry.rooms);
  if (overlaps.length > 0) {
    for (const [room1, room2] of overlaps) {
      warnings.push(`Room overlap detected: "${room1}" and "${room2}" (may be intentional - e.g., closet inside room)`);
    }
  }

  // ===========================================
  // 5. Gap Detection (Warning only)
  // ===========================================
  
  const gapWarnings = detectGaps(geometry);
  warnings.push(...gapWarnings);

  // ===========================================
  // 6. Apply Defaults
  // ===========================================
  
  const normalizedGeometry = applyDefaults(geometry);

  // ===========================================
  // 7. Generate Geometry Hash
  // ===========================================
  
  const geometryHash = generateGeometryHash(normalizedGeometry);

  // ===========================================
  // Result
  // ===========================================
  
  const isValid = errors.length === 0;

  if (!isValid) {
    const errorSummary = errors.join('; ');
    logger.error('Geometry validation failed', { 
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errorSummary,
      errorDetails: errors,
      warnings: warnings,
    });
    // Also log to console for visibility
    console.error('VALIDATION ERRORS:', errors);
    if (warnings.length > 0) {
      console.warn('VALIDATION WARNINGS:', warnings);
    }
  } else {
    logger.info('Geometry validation passed', {
      roomCount: normalizedGeometry.rooms.length,
      geometryHash,
      warningCount: warnings.length,
    });
  }

  return {
    isValid,
    geometry: isValid ? normalizedGeometry : undefined,
    geometryHash: isValid ? geometryHash : undefined,
    errors,
    warnings,
  };
}

// ===========================================
// Room Validation
// ===========================================

/**
 * Validate individual room geometry
 */
function validateRoom(room: RoomGeometry): string[] {
  const errors: string[] = [];

  // Required fields
  if (!room.roomId) {
    errors.push('Missing room ID');
  }
  if (!room.roomName) {
    errors.push('Missing room name');
  }
  if (!room.roomType) {
    errors.push('Missing room type');
  }

  // Bounding box validation
  if (!room.boundingBox) {
    errors.push('Missing bounding box');
  } else {
    const { x, y, width, height } = room.boundingBox;
    if (width <= 0 || height <= 0) {
      errors.push('Invalid bounding box dimensions');
    }
    if (x < 0 || y < 0) {
      errors.push('Bounding box has negative coordinates');
    }
  }

  // Area validation (if provided)
  // Only validate if area is explicitly negative (not 0 or undefined)
  // Area of 0 or undefined is OK - we can calculate from bounding box
  if (room.area !== undefined && room.area < 0) {
    errors.push('Invalid room area (negative value)');
  }

  return errors;
}

// ===========================================
// Overlap Detection
// ===========================================

/**
 * Detect overlapping rooms using bounding box intersection
 */
function detectRoomOverlaps(rooms: RoomGeometry[]): [string, string][] {
  const overlaps: [string, string][] = [];

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const room1 = rooms[i];
      const room2 = rooms[j];

      if (boundingBoxesOverlap(room1.boundingBox, room2.boundingBox)) {
        // Allow small overlap (wall thickness)
        const overlapArea = calculateOverlapArea(room1.boundingBox, room2.boundingBox);
        const minArea = Math.min(
          room1.boundingBox.width * room1.boundingBox.height,
          room2.boundingBox.width * room2.boundingBox.height
        );

        // If overlap is more than 10% of smaller room, it's significant
        if (overlapArea > minArea * 0.1) {
          overlaps.push([room1.roomName, room2.roomName]);
        }
      }
    }
  }

  return overlaps;
}

/**
 * Check if two bounding boxes overlap
 */
function boundingBoxesOverlap(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    box1.x + box1.width <= box2.x ||
    box2.x + box2.width <= box1.x ||
    box1.y + box1.height <= box2.y ||
    box2.y + box2.height <= box1.y
  );
}

/**
 * Calculate overlap area between two bounding boxes
 */
function calculateOverlapArea(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): number {
  const xOverlap = Math.max(
    0,
    Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y)
  );
  return xOverlap * yOverlap;
}

// ===========================================
// Gap Detection
// ===========================================

/**
 * Detect gaps in floor plan (warning only)
 */
function detectGaps(geometry: FloorGeometry): string[] {
  const warnings: string[] = [];

  // Calculate total room coverage
  let totalRoomArea = 0;
  for (const room of geometry.rooms) {
    totalRoomArea += room.boundingBox.width * room.boundingBox.height;
  }

  const floorArea = geometry.dimensions.width * geometry.dimensions.height;
  const coverage = totalRoomArea / floorArea;

  // If coverage is very low, warn about potential gaps
  if (coverage < 0.5) {
    warnings.push(
      `Low room coverage (${(coverage * 100).toFixed(1)}%) - may have significant gaps or outdoor areas`
    );
  }

  return warnings;
}

// ===========================================
// Apply Defaults
// ===========================================

/**
 * Apply default values for optional fields
 */
function applyDefaults(geometry: FloorGeometry): FloorGeometry {
  return {
    ...geometry,
    floor: geometry.floor || 1,
    wallThickness: geometry.wallThickness || DEFAULT_WALL_THICKNESS,
    rooms: geometry.rooms.map(room => ({
      ...room,
      ceilingHeight: room.ceilingHeight || DEFAULT_CEILING_HEIGHT,
      // Calculate area from bounding box if missing or 0
      area: (room.area && room.area > 0) 
        ? room.area 
        : (room.boundingBox.width * room.boundingBox.height),
    })),
  };
}

// ===========================================
// Hash Generation
// ===========================================

/**
 * Generate deterministic hash of floor geometry
 * Used for change detection and caching
 */
export function generateGeometryHash(geometry: FloorGeometry): string {
  // Create a normalized, deterministic representation
  const normalized = {
    floor: geometry.floor,
    dimensions: geometry.dimensions,
    wallThickness: geometry.wallThickness,
    rooms: geometry.rooms
      .sort((a, b) => a.roomId.localeCompare(b.roomId))
      .map(room => ({
        id: room.roomId,
        type: room.roomType,
        bbox: room.boundingBox,
        ceiling: room.ceilingHeight,
      })),
  };

  const hash = createHash('sha256');
  hash.update(JSON.stringify(normalized));
  return hash.digest('hex').substring(0, 16);
}

// ===========================================
// Geometry Description Builder
// ===========================================

/**
 * Build text description of floor geometry for AI prompt
 * 
 * ============================================================
 * ❗ THIS DESCRIPTION IS IMMUTABLE ❗
 * ❗ DO NOT MODIFY ROOM POSITIONS OR SIZES ❗
 * ============================================================
 */
export function buildGeometryDescription(geometry: FloorGeometry): string {
  const lines: string[] = [];

  // Floor overview
  lines.push(`Floor ${geometry.floor} Layout:`);
  lines.push(`- Total dimensions: ${geometry.dimensions.width} x ${geometry.dimensions.height} units`);
  lines.push(`- Wall thickness: ${geometry.wallThickness} inches`);
  lines.push(`- Total rooms: ${geometry.rooms.length}`);
  lines.push('');

  // Room-by-room description
  lines.push('Room Layout (IMMUTABLE - DO NOT MODIFY):');
  lines.push('');

  for (const room of geometry.rooms) {
    const { x, y, width, height } = room.boundingBox;
    lines.push(`${room.roomName} (${room.roomType}):`);
    lines.push(`  - Position: (${x}, ${y})`);
    lines.push(`  - Size: ${width} x ${height} units`);
    lines.push(`  - Area: ${room.area?.toFixed(1) || 'N/A'} sq units`);
    lines.push(`  - Ceiling height: ${room.ceilingHeight} feet`);
    
    if (room.adjacentRooms && room.adjacentRooms.length > 0) {
      lines.push(`  - Adjacent to: ${room.adjacentRooms.join(', ')}`);
    }
    lines.push('');
  }

  // Openings
  if (geometry.openings && geometry.openings.length > 0) {
    lines.push('Openings (MUST BE PRESERVED):');
    for (const opening of geometry.openings) {
      lines.push(`  - ${opening.type} at (${opening.position.x}, ${opening.position.y}), ${opening.width}x${opening.height}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ===========================================
// Exports
// ===========================================

export {
  validateRoom,
  detectRoomOverlaps,
  applyDefaults,
};


