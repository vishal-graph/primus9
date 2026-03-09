/**
 * Room Graph Construction
 * 
 * Stage 3 of the analysis pipeline
 * 
 * Constructs an internal graph representation of the floor plan:
 * - Nodes = rooms/spaces
 * - Edges = adjacency/access relationships
 * 
 * This graph is the source of truth for:
 * - UI visualization
 * - Room navigation
 * - Subsequent analysis stages
 */

import { v4 as uuidv4 } from 'uuid';
import {
  DetectedRoom,
  CirculationPath,
  RoomType,
  RoomStatus,
  CirculationType,
  FloorPlanSymbol,
  BoundingBox,
  Point2D,
  RoomGeometry,
  AnalysisWarning,
} from './types';
import { logger } from '../../lib/logger';

// ============================================
// TYPES
// ============================================

interface RawRoomData {
  tempId?: string;
  spaceId?: string;
  name?: string | null;
  type?: string;
  confidenceScore?: number;
  geometry?: {
    boundingBox?: BoundingBox | { x: number; y: number; width: number; height: number };
    polygon?: Point2D[];
    centroid?: Point2D;
  };
  areaEstimate?: number | null;
  areaUnit?: string | null;
  symbolsDetected?: string[];
  textDetected?: string[];
  reasoning?: string;
  adjacentRooms?: string[];
  detectionSource?: string;
}

interface RawCirculationData {
  id?: string;
  type?: string;
  connects?: string[];
  geometry?: {
    boundingBox?: BoundingBox;
  };
}

interface GeminiAnalysisResult {
  rooms?: RawRoomData[];
  circulation?: RawCirculationData[];
  adjacencyGraph?: Array<{
    roomA: string;
    roomB: string;
    connectionType: string;
  }>;
  warnings?: Array<{
    severity?: string;
    message?: string;
    location?: BoundingBox;
  }>;
  selfCheck?: {
    totalRooms?: number;
    unclassifiedRooms?: number;
    possibleMissedAreas?: string;
  };
}

// ============================================
// ROOM GRAPH BUILDER
// ============================================

/**
 * Build structured room graph from Gemini analysis result
 */
export function buildRoomGraph(
  analysisResult: GeminiAnalysisResult,
  imageWidth: number,
  imageHeight: number
): {
  rooms: DetectedRoom[];
  circulation: CirculationPath[];
  warnings: AnalysisWarning[];
} {
  const rooms: DetectedRoom[] = [];
  const circulation: CirculationPath[] = [];
  const warnings: AnalysisWarning[] = [];
  const roomIdMap = new Map<string, string>(); // Maps original IDs to new UUIDs
  
  logger.info('Building room graph', {
    rawRoomCount: analysisResult.rooms?.length || 0,
    rawCirculationCount: analysisResult.circulation?.length || 0,
  });
  
  // Process rooms
  if (analysisResult.rooms && Array.isArray(analysisResult.rooms)) {
    for (const rawRoom of analysisResult.rooms) {
      try {
        const room = processRawRoom(rawRoom, imageWidth, imageHeight);
        rooms.push(room);
        
        // Map original ID to new UUID
        const originalId = rawRoom.tempId || rawRoom.spaceId;
        if (originalId) {
          roomIdMap.set(originalId, room.tempId);
        }
      } catch (error) {
        logger.warn('Failed to process room, including as UNCLASSIFIED', {
          rawRoom,
          error,
        });
        
        // Create minimal room to avoid missing it
        const fallbackRoom = createFallbackRoom(rawRoom, imageWidth, imageHeight);
        rooms.push(fallbackRoom);
        
        warnings.push({
          severity: 'warning',
          message: `Room processing failed, included as UNCLASSIFIED: ${error instanceof Error ? error.message : 'Unknown error'}`,
          affectedRooms: [fallbackRoom.tempId],
        });
      }
    }
  }
  
  // Process circulation
  if (analysisResult.circulation && Array.isArray(analysisResult.circulation)) {
    for (const rawCirc of analysisResult.circulation) {
      try {
        const circ = processCirculation(rawCirc, roomIdMap);
        circulation.push(circ);
      } catch (error) {
        logger.warn('Failed to process circulation', { rawCirc, error });
      }
    }
  }
  
  // Build adjacency from explicit adjacencyGraph if provided
  if (analysisResult.adjacencyGraph && Array.isArray(analysisResult.adjacencyGraph)) {
    updateAdjacencyFromGraph(rooms, analysisResult.adjacencyGraph, roomIdMap);
  }
  
  // Infer additional adjacency from geometry
  inferAdjacencyFromGeometry(rooms);
  
  // Process warnings
  if (analysisResult.warnings && Array.isArray(analysisResult.warnings)) {
    for (const rawWarning of analysisResult.warnings) {
      warnings.push({
        severity: (rawWarning.severity as 'info' | 'warning' | 'critical') || 'info',
        message: rawWarning.message || 'Unknown warning',
        location: rawWarning.location,
      });
    }
  }
  
  // Add warning if self-check indicates possible missed rooms
  if (analysisResult.selfCheck?.possibleMissedAreas) {
    const missedAreas = analysisResult.selfCheck.possibleMissedAreas;
    if (missedAreas && missedAreas.toLowerCase() !== 'none') {
      warnings.push({
        severity: 'warning',
        message: `AI self-check flagged possible missed areas: ${missedAreas}`,
      });
    }
  }
  
  // Validate: ensure no rooms were lost
  if (rooms.length === 0 && (analysisResult.rooms?.length || 0) > 0) {
    warnings.push({
      severity: 'critical',
      message: 'All rooms failed processing - this should not happen',
    });
  }
  
  logger.info('Room graph built', {
    totalRooms: rooms.length,
    unclassifiedRooms: rooms.filter(r => r.type === RoomType.UNCLASSIFIED).length,
    circulationPaths: circulation.length,
    warnings: warnings.length,
  });
  
  return { rooms, circulation, warnings };
}

// ============================================
// ROOM PROCESSING
// ============================================

/**
 * Process raw room data into structured DetectedRoom
 */
function processRawRoom(
  raw: RawRoomData,
  imageWidth: number,
  imageHeight: number
): DetectedRoom {
  // Generate stable ID
  const tempId = raw.tempId || raw.spaceId || `room_${uuidv4().substring(0, 8)}`;
  
  // Normalize room type
  const type = normalizeRoomType(raw.type);
  
  // Process geometry
  const geometry = processGeometry(raw.geometry, imageWidth, imageHeight);
  
  // Normalize symbols
  const symbolsDetected = normalizeSymbols(raw.symbolsDetected);
  
  // Ensure reasoning exists
  const reasoning = raw.reasoning || generateFallbackReasoning(type, symbolsDetected, raw.textDetected);
  
  // Normalize confidence
  const confidenceScore = normalizeConfidence(raw.confidenceScore);
  
  return {
    tempId,
    name: raw.name || null,
    type,
    confidenceScore,
    geometry,
    areaEstimate: typeof raw.areaEstimate === 'number' ? raw.areaEstimate : null,
    areaUnit: normalizeAreaUnit(raw.areaUnit),
    adjacentRooms: raw.adjacentRooms || [],
    symbolsDetected,
    textDetected: raw.textDetected || [],
    reasoning,
    status: RoomStatus.PENDING,
    detectionSource: normalizeDetectionSource(raw.detectionSource),
  };
}

/**
 * Create fallback room for failed processing
 * CRITICAL: Never drop a room, even if processing fails
 */
function createFallbackRoom(
  raw: RawRoomData,
  imageWidth: number,
  imageHeight: number
): DetectedRoom {
  const tempId = `fallback_${uuidv4().substring(0, 8)}`;
  
  // Try to extract any geometry
  let geometry: RoomGeometry;
  try {
    geometry = processGeometry(raw.geometry, imageWidth, imageHeight);
  } catch {
    // Create a placeholder geometry
    geometry = {
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
    };
  }
  
  return {
    tempId,
    name: raw.name || null,
    type: RoomType.UNCLASSIFIED,
    confidenceScore: 0.1, // Very low confidence
    geometry,
    areaEstimate: null,
    areaUnit: null,
    adjacentRooms: [],
    symbolsDetected: [],
    textDetected: raw.textDetected || [],
    reasoning: 'Room processing failed - included as UNCLASSIFIED to prevent data loss. Manual review required.',
    status: RoomStatus.PENDING,
    detectionSource: 'boundary',
  };
}

// ============================================
// GEOMETRY PROCESSING
// ============================================

/**
 * Process raw geometry into structured RoomGeometry
 * Handles percentage-based and pixel-based coordinates
 */
function processGeometry(
  rawGeometry: RawRoomData['geometry'] | undefined,
  imageWidth: number,
  imageHeight: number
): RoomGeometry {
  if (!rawGeometry || !rawGeometry.boundingBox) {
    throw new Error('Missing geometry bounding box');
  }
  
  const raw = rawGeometry.boundingBox;
  
  // Detect if coordinates are percentages (0-100) or pixels
  const isPercentage = (raw.x <= 100 && raw.y <= 100 && 
                        (raw.width || 0) <= 100 && (raw.height || 0) <= 100);
  
  let boundingBox: BoundingBox;
  
  if (isPercentage) {
    // Convert percentage to pixels
    boundingBox = {
      x: Math.round((raw.x / 100) * imageWidth),
      y: Math.round((raw.y / 100) * imageHeight),
      width: Math.round(((raw.width || 10) / 100) * imageWidth),
      height: Math.round(((raw.height || 10) / 100) * imageHeight),
    };
  } else {
    // Already in pixels
    boundingBox = {
      x: Math.round(raw.x),
      y: Math.round(raw.y),
      width: Math.round(raw.width || 100),
      height: Math.round(raw.height || 100),
    };
  }
  
  // Process polygon if available
  let polygon: Point2D[] | undefined;
  if (rawGeometry.polygon && Array.isArray(rawGeometry.polygon)) {
    polygon = rawGeometry.polygon.map(p => ({
      x: isPercentage ? Math.round((p.x / 100) * imageWidth) : Math.round(p.x),
      y: isPercentage ? Math.round((p.y / 100) * imageHeight) : Math.round(p.y),
    }));
  }
  
  // Calculate centroid
  const centroid: Point2D = rawGeometry.centroid 
    ? {
        x: isPercentage 
          ? Math.round((rawGeometry.centroid.x / 100) * imageWidth) 
          : Math.round(rawGeometry.centroid.x),
        y: isPercentage 
          ? Math.round((rawGeometry.centroid.y / 100) * imageHeight) 
          : Math.round(rawGeometry.centroid.y),
      }
    : {
        x: boundingBox.x + boundingBox.width / 2,
        y: boundingBox.y + boundingBox.height / 2,
      };
  
  return {
    boundingBox,
    polygon,
    centroid,
  };
}

// ============================================
// NORMALIZATION HELPERS
// ============================================

/**
 * Normalize room type string to RoomType enum
 */
function normalizeRoomType(typeStr?: string): RoomType {
  if (!typeStr) return RoomType.UNCLASSIFIED;
  
  const normalized = typeStr.toUpperCase().replace(/[^A-Z_]/g, '');
  
  // Check direct match
  if (Object.values(RoomType).includes(normalized as RoomType)) {
    return normalized as RoomType;
  }
  
  // Handle common variations
  const mappings: Record<string, RoomType> = {
    // Living room variations
    'LIVINGROOM': RoomType.LIVING_ROOM,
    'LIVING': RoomType.LIVING_ROOM,
    'LR': RoomType.LIVING_ROOM,
    'LOUNGE': RoomType.LIVING_ROOM,
    'SITTINGROOM': RoomType.LIVING_ROOM,
    'DRAWINGROOM': RoomType.LIVING_ROOM,
    
    // Bedroom variations
    'MASTERBED': RoomType.BEDROOM,
    'MASTERBEDROOM': RoomType.BEDROOM,
    'BED': RoomType.BEDROOM,
    'BR': RoomType.BEDROOM,
    'GUESTROOM': RoomType.BEDROOM,
    'GUESTBEDROOM': RoomType.BEDROOM,
    
    // Bathroom/toilet variations
    'BATH': RoomType.BATHROOM,
    'BA': RoomType.BATHROOM,
    'WC': RoomType.TOILET,
    'RESTROOM': RoomType.TOILET,
    'LAVATORY': RoomType.TOILET,
    'POWDERROOM': RoomType.TOILET,
    
    // Storage variations
    'CLOSET': RoomType.STORE,
    'STORAGE': RoomType.STORE,
    'STOREROOM': RoomType.STORE,
    'PANTRY': RoomType.STORE,
    
    // Passage/corridor variations
    'HALL': RoomType.PASSAGE,
    'HALLWAY': RoomType.PASSAGE,
    'CORRIDOR': RoomType.PASSAGE,
    'PASSAGEWAY': RoomType.PASSAGE,
    
    // Entry/foyer variations
    'ENTRY': RoomType.FOYER,
    'ENTRANCE': RoomType.FOYER,
    'ENTRANCEHALL': RoomType.FOYER,
    'VESTIBULE': RoomType.FOYER,
    
    // Prayer room variations
    'PRAYER': RoomType.PUJA,
    'POOJA': RoomType.PUJA,
    'POOJAROOM': RoomType.PUJA,
    'PUJAROOM': RoomType.PUJA,
    'MANDIR': RoomType.PUJA,
    
    // Study/office variations
    'WORKROOM': RoomType.STUDY,
    'OFFICE': RoomType.STUDY,
    'HOMEOFFICE': RoomType.STUDY,
    'LIBRARY': RoomType.STUDY,
    'DEN': RoomType.STUDY,
    
    // Utility variations
    'LAUNDRY': RoomType.UTILITY,
    'LAUNDRYROOM': RoomType.UTILITY,
    'WASHROOM': RoomType.UTILITY,
    'SERVICEAREA': RoomType.UTILITY,
    
    // OUTDOOR / SEMI-OUTDOOR SPACES - Map to BALCONY or TERRACE
    'DECK': RoomType.BALCONY,
    'PATIO': RoomType.BALCONY,
    'VERANDA': RoomType.BALCONY,
    'VERANDAH': RoomType.BALCONY,
    'PORCH': RoomType.BALCONY,
    'SUNROOM': RoomType.BALCONY,
    'LANAI': RoomType.BALCONY,
    'LOGGIA': RoomType.BALCONY,
    'OUTDOOR': RoomType.TERRACE,
    'ROOFTOP': RoomType.TERRACE,
    'ROOF': RoomType.TERRACE,
    'GARDEN': RoomType.TERRACE,
    'YARD': RoomType.TERRACE,
    'COURTYARD': RoomType.TERRACE,
    'SITOUT': RoomType.BALCONY,
    
    // Servant/maid room variations
    'SERVANT': RoomType.SERVANT_ROOM,
    'MAID': RoomType.SERVANT_ROOM,
    'MAIDROOM': RoomType.SERVANT_ROOM,
    'SERVANTQUARTER': RoomType.SERVANT_ROOM,
    'HELPERSROOM': RoomType.SERVANT_ROOM,
    
    // Dressing room variations
    'DRESSING': RoomType.DRESS,
    'DRESSINGROOM': RoomType.DRESS,
    'WALKIN': RoomType.DRESS,
    'WALKINCLOSET': RoomType.DRESS,
    'WARDROBE': RoomType.DRESS,
    'WARDROBEROOM': RoomType.DRESS,
    
    // Dining variations
    'DININGROOM': RoomType.DINING,
    'DININGAREA': RoomType.DINING,
    'EATINKITCHEN': RoomType.DINING,
    'BREAKFASTNOOK': RoomType.DINING,
    
    // Kitchen variations
    'KITCHENETTE': RoomType.KITCHEN,
    'MODULARKITCHEN': RoomType.KITCHEN,
    
    // Garage variations
    'CARPORT': RoomType.GARAGE,
    'PARKING': RoomType.GARAGE,
    
    // Staircase variations
    'STAIRS': RoomType.STAIRCASE,
    'STAIRWAY': RoomType.STAIRCASE,
    'STAIRWELL': RoomType.STAIRCASE,
  };
  
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Log unmapped types for debugging
  logger.debug('Unknown room type, defaulting to UNCLASSIFIED', { typeStr, normalized });
  
  return RoomType.UNCLASSIFIED;
}

/**
 * Normalize symbol strings to FloorPlanSymbol enum
 */
function normalizeSymbols(symbols?: string[]): FloorPlanSymbol[] {
  if (!symbols || !Array.isArray(symbols)) return [];
  
  return symbols.map(s => {
    const normalized = s.toUpperCase().replace(/[^A-Z_]/g, '');
    
    if (Object.values(FloorPlanSymbol).includes(normalized as FloorPlanSymbol)) {
      return normalized as FloorPlanSymbol;
    }
    
    // Handle common variations
    const mappings: Record<string, FloorPlanSymbol> = {
      'DOUBLEBED': FloorPlanSymbol.BED,
      'SINGLEBED': FloorPlanSymbol.BED,
      'KINGBED': FloorPlanSymbol.BED,
      'COUCH': FloorPlanSymbol.SOFA,
      'DININGTABLE': FloorPlanSymbol.DINING_TABLE,
      'TABLE': FloorPlanSymbol.DINING_TABLE,
      'WASHBASIN': FloorPlanSymbol.SINK,
      'BASIN': FloorPlanSymbol.SINK,
      'WC': FloorPlanSymbol.TOILET_SEAT,
      'TOILET': FloorPlanSymbol.TOILET_SEAT,
      'TUB': FloorPlanSymbol.BATHTUB,
      'COUNTER': FloorPlanSymbol.KITCHEN_COUNTER,
      'CABINET': FloorPlanSymbol.KITCHEN_COUNTER,
      'OVEN': FloorPlanSymbol.STOVE,
      'COOKTOP': FloorPlanSymbol.STOVE,
      'FRIDGE': FloorPlanSymbol.REFRIGERATOR,
      'CLOSET': FloorPlanSymbol.WARDROBE,
      'CUPBOARD': FloorPlanSymbol.WARDROBE,
      'DOORSWING': FloorPlanSymbol.DOOR_ARC,
      'STAIRCASE': FloorPlanSymbol.STAIRS,
      'LIFT': FloorPlanSymbol.ELEVATOR,
      'AIRCONDITIONER': FloorPlanSymbol.AC_UNIT,
      'WASHER': FloorPlanSymbol.WASHING_MACHINE,
    };
    
    return mappings[normalized] || FloorPlanSymbol.UNKNOWN;
  }).filter(s => s !== FloorPlanSymbol.UNKNOWN);
}

/**
 * Normalize confidence score to 0-1 range
 */
function normalizeConfidence(confidence?: number): number {
  if (typeof confidence !== 'number') return 0.5;
  if (confidence > 1) return confidence / 100; // Assume percentage
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Normalize area unit
 */
function normalizeAreaUnit(unit?: string | null): 'sqft' | 'sqm' | null {
  if (!unit) return null;
  const normalized = unit.toLowerCase();
  if (normalized.includes('ft') || normalized.includes('feet')) return 'sqft';
  if (normalized.includes('m') || normalized.includes('meter')) return 'sqm';
  return null;
}

/**
 * Normalize detection source
 */
function normalizeDetectionSource(source?: string): 'label' | 'symbol' | 'inference' | 'boundary' {
  if (!source) return 'inference';
  const normalized = source.toLowerCase();
  if (normalized === 'label') return 'label';
  if (normalized === 'symbol') return 'symbol';
  if (normalized === 'boundary') return 'boundary';
  return 'inference';
}

/**
 * Generate fallback reasoning when none provided
 */
function generateFallbackReasoning(
  type: RoomType,
  symbols: FloorPlanSymbol[],
  textDetected?: string[]
): string {
  const parts: string[] = [];
  
  parts.push(`Classified as ${type}`);
  
  if (textDetected?.length) {
    parts.push(`text labels found: "${textDetected.join('", "')}"`);
  }
  
  if (symbols.length) {
    parts.push(`symbols detected: ${symbols.join(', ')}`);
  }
  
  if (type === RoomType.UNCLASSIFIED) {
    parts.push('unable to determine room type with confidence');
  }
  
  return parts.join('; ') + '.';
}

// ============================================
// CIRCULATION PROCESSING
// ============================================

/**
 * Process circulation data
 */
function processCirculation(
  raw: RawCirculationData,
  roomIdMap: Map<string, string>
): CirculationPath {
  const id = raw.id || `circ_${uuidv4().substring(0, 8)}`;
  
  // Normalize type
  let type: CirculationType;
  const typeStr = (raw.type || '').toUpperCase();
  if (typeStr === 'CORRIDOR') type = CirculationType.CORRIDOR;
  else if (typeStr === 'LOBBY') type = CirculationType.LOBBY;
  else if (typeStr === 'STAIRWELL') type = CirculationType.STAIRWELL;
  else type = CirculationType.PASSAGE;
  
  // Map connected room IDs
  const connects = (raw.connects || []).map(c => roomIdMap.get(c) || c);
  
  return {
    id,
    type,
    connects,
    geometry: raw.geometry ? { boundingBox: raw.geometry.boundingBox! } : undefined,
  };
}

// ============================================
// ADJACENCY INFERENCE
// ============================================

/**
 * Update room adjacency from explicit adjacency graph
 */
function updateAdjacencyFromGraph(
  rooms: DetectedRoom[],
  graph: Array<{ roomA: string; roomB: string; connectionType: string }>,
  roomIdMap: Map<string, string>
): void {
  const roomById = new Map(rooms.map(r => [r.tempId, r]));
  
  for (const edge of graph) {
    const idA = roomIdMap.get(edge.roomA) || edge.roomA;
    const idB = roomIdMap.get(edge.roomB) || edge.roomB;
    
    const roomA = roomById.get(idA);
    const roomB = roomById.get(idB);
    
    if (roomA && roomB) {
      if (!roomA.adjacentRooms.includes(idB)) {
        roomA.adjacentRooms.push(idB);
      }
      if (!roomB.adjacentRooms.includes(idA)) {
        roomB.adjacentRooms.push(idA);
      }
    }
  }
}

/**
 * Infer additional adjacency relationships from geometry
 * Two rooms are adjacent if their bounding boxes are close or overlapping
 */
function inferAdjacencyFromGeometry(rooms: DetectedRoom[]): void {
  const ADJACENCY_THRESHOLD = 50; // Pixels
  
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const roomA = rooms[i];
      const roomB = rooms[j];
      
      // Skip if already adjacent
      if (roomA.adjacentRooms.includes(roomB.tempId)) continue;
      
      // Check if bounding boxes are close
      const boxA = roomA.geometry.boundingBox;
      const boxB = roomB.geometry.boundingBox;
      
      const distance = getBoxDistance(boxA, boxB);
      
      if (distance < ADJACENCY_THRESHOLD) {
        roomA.adjacentRooms.push(roomB.tempId);
        roomB.adjacentRooms.push(roomA.tempId);
      }
    }
  }
}

/**
 * Calculate minimum distance between two bounding boxes
 */
function getBoxDistance(a: BoundingBox, b: BoundingBox): number {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;
  
  // Check if boxes overlap
  if (a.x < bRight && aRight > b.x && a.y < bBottom && aBottom > b.y) {
    return 0;
  }
  
  // Calculate horizontal and vertical distances
  let dx = 0;
  let dy = 0;
  
  if (aRight < b.x) {
    dx = b.x - aRight;
  } else if (bRight < a.x) {
    dx = a.x - bRight;
  }
  
  if (aBottom < b.y) {
    dy = b.y - aBottom;
  } else if (bBottom < a.y) {
    dy = a.y - bBottom;
  }
  
  return Math.sqrt(dx * dx + dy * dy);
}

// ============================================
// GRAPH VALIDATION
// ============================================

/**
 * Validate room graph integrity
 */
export function validateRoomGraph(rooms: DetectedRoom[]): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = [];
  const roomIds = new Set(rooms.map(r => r.tempId));
  
  // Check for orphan adjacency references
  for (const room of rooms) {
    for (const adjId of room.adjacentRooms) {
      if (!roomIds.has(adjId)) {
        warnings.push({
          severity: 'warning',
          message: `Room ${room.tempId} references non-existent adjacent room ${adjId}`,
          affectedRooms: [room.tempId],
        });
      }
    }
  }
  
  // Check for isolated rooms (no connections in a multi-room floor plan)
  if (rooms.length > 3) {
    const isolatedRooms = rooms.filter(r => r.adjacentRooms.length === 0);
    if (isolatedRooms.length > 0) {
      warnings.push({
        severity: 'info',
        message: `${isolatedRooms.length} room(s) have no detected adjacency - may be isolated or need manual review`,
        affectedRooms: isolatedRooms.map(r => r.tempId),
      });
    }
  }
  
  // Check for duplicate room detections (overlapping bounding boxes)
  const overlaps = findOverlappingRooms(rooms);
  if (overlaps.length > 0) {
    warnings.push({
      severity: 'warning',
      message: `${overlaps.length} potential duplicate room detection(s) found`,
      affectedRooms: overlaps.flat(),
    });
  }
  
  return warnings;
}

/**
 * Find rooms with significantly overlapping bounding boxes
 */
function findOverlappingRooms(rooms: DetectedRoom[]): string[][] {
  const overlaps: string[][] = [];
  const OVERLAP_THRESHOLD = 0.7; // 70% overlap indicates duplicate
  
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const overlap = calculateOverlap(
        rooms[i].geometry.boundingBox,
        rooms[j].geometry.boundingBox
      );
      
      if (overlap > OVERLAP_THRESHOLD) {
        overlaps.push([rooms[i].tempId, rooms[j].tempId]);
      }
    }
  }
  
  return overlaps;
}

/**
 * Calculate overlap ratio between two bounding boxes
 */
function calculateOverlap(a: BoundingBox, b: BoundingBox): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  
  const overlapArea = xOverlap * yOverlap;
  const minArea = Math.min(a.width * a.height, b.width * b.height);
  
  return minArea > 0 ? overlapArea / minArea : 0;
}

