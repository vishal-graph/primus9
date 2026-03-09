/**
 * Floor Plan Analysis - Gemini Prompt System
 * 
 * Multi-pass prompt strategy for comprehensive room detection
 * 
 * CORE PRINCIPLE: NEVER MISS A ROOM
 * - Explicitly instruct to include all spaces
 * - UNCLASSIFIED is always acceptable
 * - Force step-by-step reasoning
 * - Include self-check for uncertain areas
 * 
 * Passes:
 * A - Spatial Segmentation (detect all enclosed spaces)
 * B - Text & Symbol Extraction
 * C - Reasoning & Classification
 */

import { RoomType, FloorPlanSymbol } from './types';
import { logger } from '../../lib/logger';

// ============================================
// PROMPT TEMPLATES
// ============================================

/**
 * System instruction that applies to all prompts
 */
export const SYSTEM_INSTRUCTION = `You are an expert architectural floor plan analyzer with decades of experience reading residential and commercial floor plans. Your PRIMARY objective is to NEVER MISS ANY ROOM OR SPACE.

CRITICAL RULES:
1. COMPLETENESS OVER CONFIDENCE: It is better to include a space you're unsure about than to miss one
2. If you see any enclosed or semi-enclosed area, INCLUDE IT
3. If you cannot determine a room's type, classify it as "UNCLASSIFIED" - NEVER skip it
4. Every detected space must have a reasoning explanation
5. Your output must be valid JSON only - no markdown, no explanations outside JSON

You will analyze floor plans that may be:
- Architectural drawings (clean, labeled)
- CAD exports (precise but complex)
- Scanned plans (may have noise)
- Hand-drawn sketches (informal)
- Photographs of plans (perspective distortion)

Regardless of quality, identify EVERY space.`;

/**
 * Pass A: Spatial Segmentation
 * Detect all enclosed and open spaces
 */
export const PROMPT_SPATIAL_SEGMENTATION = `Analyze this floor plan image and identify ALL spaces. This is a COMPREHENSIVE detection task.

INSTRUCTIONS:
1. Scan the ENTIRE image systematically (top-left to bottom-right)
2. Identify EVERY enclosed space (completely surrounded by walls)
3. Identify EVERY semi-enclosed space (partial walls, open to other areas)
4. Identify circulation areas (passages, corridors, lobbies)
5. DO NOT skip small spaces - closets, stores, shafts are important
6. If you see a potential space but are unsure, INCLUDE IT with low confidence

WHAT TO LOOK FOR:
- Wall lines (thick black lines)
- Door openings (arcs, gaps in walls)
- Window symbols
- Partition walls
- Any bounded area

OUTPUT FORMAT (JSON only, no markdown):
{
  "totalSpacesDetected": <number>,
  "enclosedSpaces": [
    {
      "id": "space_1",
      "boundingBox": { "x": <0-100%>, "y": <0-100%>, "width": <0-100%>, "height": <0-100%> },
      "isFullyEnclosed": true,
      "wallBoundaries": "complete|partial|open",
      "hasEntryPoint": true,
      "estimatedAreaPercent": <0-100>
    }
  ],
  "openSpaces": [
    {
      "id": "open_1",
      "boundingBox": { "x": <0-100%>, "y": <0-100%>, "width": <0-100%>, "height": <0-100%> },
      "openTo": ["space_1", "space_2"],
      "description": "Open kitchen area"
    }
  ],
  "circulationAreas": [
    {
      "id": "circ_1",
      "type": "PASSAGE|CORRIDOR|LOBBY",
      "boundingBox": { "x": <0-100%>, "y": <0-100%>, "width": <0-100%>, "height": <0-100%> },
      "connectsSpaces": ["space_1", "space_2"]
    }
  ],
  "uncertainAreas": [
    {
      "boundingBox": { "x": <0-100%>, "y": <0-100%>, "width": <0-100%>, "height": <0-100%> },
      "reason": "Unclear if this is a separate room or part of adjacent space"
    }
  ],
  "selfCheck": {
    "coveredEntireImage": true,
    "possibleMissedAreas": [],
    "confidenceLevel": "high|medium|low"
  }
}

SELF-CHECK: After completing analysis, review the image edges and corners. List any areas that might contain rooms but you're uncertain about.`;

/**
 * Pass B: Text and Symbol Extraction
 * Extract all text labels and symbols for room identification
 */
export const PROMPT_TEXT_SYMBOL_EXTRACTION = `Analyze this floor plan image and extract ALL text labels and symbols.

INSTRUCTIONS:
1. Find and read ALL text in the image
2. Identify ALL furniture and fixture symbols
3. Detect dimension annotations if present
4. Note the location of each element (approximate % from top-left)

TEXT TO LOOK FOR:
- Room names (BEDROOM, KITCHEN, etc.)
- Area measurements (12'x14', 3.5m x 4m)
- Room numbers (Room 1, R1)
- Abbreviations (BR, LR, K, BA, WC)
- Directional labels (NORTH, N↑)

SYMBOLS TO DETECT:
- Bed symbols → BED
- Sofa/couch → SOFA
- Dining table → DINING_TABLE
- Sink (kitchen/bathroom) → SINK
- Toilet/WC → TOILET_SEAT
- Bathtub → BATHTUB
- Shower → SHOWER
- Kitchen counter/cabinets → KITCHEN_COUNTER
- Stove/cooktop → STOVE
- Refrigerator → REFRIGERATOR
- Wardrobe/closet → WARDROBE
- Door arcs → DOOR_ARC
- Windows → WINDOW
- Stairs → STAIRS
- AC unit → AC_UNIT

OUTPUT FORMAT (JSON only, no markdown):
{
  "textLabels": [
    {
      "text": "MASTER BEDROOM",
      "normalizedText": "MASTER BEDROOM",
      "location": { "x": <0-100%>, "y": <0-100%>, "width": <0-100%>, "height": <0-100%> },
      "confidence": 0.95,
      "type": "room_name|dimension|label|other"
    }
  ],
  "symbols": [
    {
      "type": "BED",
      "location": { "x": <0-100%>, "y": <0-100%>, "width": <0-100%>, "height": <0-100%> },
      "confidence": 0.9,
      "size": "single|double|king|unknown"
    }
  ],
  "dimensions": [
    {
      "value": "12'-0\\"",
      "numericValue": 12,
      "unit": "feet|meters|inches",
      "location": { "x": <0-100%>, "y": <0-100%>, "width": <0-100%>, "height": <0-100%> },
      "associatedWith": "wall|room"
    }
  ],
  "scaleIndicator": {
    "found": true,
    "value": "1:100",
    "location": { "x": <0-100%>, "y": <0-100%> }
  },
  "northIndicator": {
    "found": true,
    "direction": "up|down|left|right"
  }
}`;

/**
 * Pass C: Room Reasoning and Classification
 * Final classification with reasoning
 */
export const PROMPT_ROOM_CLASSIFICATION = `You are performing the FINAL classification of rooms in this floor plan. You have already detected spaces, text, and symbols. Now classify each room.

DETECTED SPACES (from previous analysis):
{spatialData}

DETECTED TEXT AND SYMBOLS (from previous analysis):
{textSymbolData}

INSTRUCTIONS:
1. For EACH detected space, determine the room type
2. Use text labels as primary classification source
3. Use symbols for inference when labels are missing
4. Use adjacency and room size for further inference
5. If you CANNOT determine type with confidence, use "UNCLASSIFIED" - NEVER skip a room

ROOM TYPES (use exactly these values):
${Object.values(RoomType).map(t => `- ${t}`).join('\n')}

CLASSIFICATION LOGIC:
1. If labeled "BEDROOM" or "BR" → BEDROOM
2. If contains BED symbol → likely BEDROOM
3. If labeled "KITCHEN" or "K" → KITCHEN
4. If contains STOVE/SINK symbols → likely KITCHEN
5. If labeled "BATHROOM" or "BATH" → BATHROOM
6. If contains BATHTUB/SHOWER → BATHROOM
7. If labeled "WC" or "TOILET" or contains only TOILET_SEAT → TOILET
8. If labeled "LIVING" or "LR" → LIVING_ROOM
9. If contains SOFA near entry → likely LIVING_ROOM
10. If labeled "DINING" or contains DINING_TABLE → DINING
11. If labeled "BALCONY" or open to exterior → BALCONY
12. If labeled "STORE" or small enclosed space → STORE
13. If labeled "UTILITY" or contains WASHING_MACHINE → UTILITY
14. If narrow connecting space → PASSAGE
15. If stairs symbol present → STAIRCASE
16. If entry area with multiple doors → LOBBY/FOYER
17. If uncertain → UNCLASSIFIED

OUTPUT FORMAT (JSON only, no markdown):
{
  "rooms": [
    {
      "tempId": "room_1",
      "spaceId": "space_1",
      "name": "MASTER BEDROOM",
      "type": "BEDROOM",
      "confidenceScore": 0.95,
      "geometry": {
        "boundingBox": { "x": 10, "y": 20, "width": 25, "height": 30 },
        "polygon": [
          { "x": 10, "y": 20 },
          { "x": 35, "y": 20 },
          { "x": 35, "y": 50 },
          { "x": 10, "y": 50 }
        ],
        "centroid": { "x": 22.5, "y": 35 }
      },
      "areaEstimate": 180,
      "areaUnit": "sqft",
      "symbolsDetected": ["BED", "WARDROBE", "AC_UNIT"],
      "textDetected": ["MASTER BEDROOM", "12'-0\\" x 15'-0\\""],
      "reasoning": "Classified as BEDROOM because: (1) Label 'MASTER BEDROOM' found, (2) Contains bed symbol, (3) Has attached bathroom access, (4) Size appropriate for master bedroom",
      "adjacentRooms": ["room_2", "room_5"],
      "detectionSource": "label"
    }
  ],
  "circulation": [
    {
      "id": "circ_1",
      "type": "PASSAGE",
      "connects": ["room_1", "room_3", "room_4"],
      "geometry": {
        "boundingBox": { "x": 40, "y": 30, "width": 10, "height": 40 }
      }
    }
  ],
  "adjacencyGraph": [
    { "roomA": "room_1", "roomB": "room_2", "connectionType": "door" },
    { "roomA": "room_1", "roomB": "room_5", "connectionType": "adjacent_wall" }
  ],
  "warnings": [
    {
      "severity": "warning",
      "message": "Possible balcony not clearly visible on right edge",
      "location": { "x": 90, "y": 40, "width": 10, "height": 20 }
    }
  ],
  "finalSelfCheck": {
    "totalRoomsClassified": 8,
    "unclassifiedCount": 1,
    "highConfidenceCount": 6,
    "lowConfidenceCount": 2,
    "possibleMissedRooms": "None - all detected spaces have been classified"
  }
}

CRITICAL: Every space from the spatial analysis MUST appear in the rooms array. If you cannot classify it, use "UNCLASSIFIED".`;

/**
 * Single comprehensive prompt for simpler floor plans
 * Use when multi-pass is overkill
 */
export const PROMPT_COMPREHENSIVE_SINGLE_PASS = `Analyze this floor plan image completely and identify ALL rooms and spaces.

${SYSTEM_INSTRUCTION}

ANALYSIS STEPS (perform in order):

STEP 1 - SCAN ENTIRE IMAGE:
- Look at every corner and edge
- Identify all wall lines
- Find all enclosed spaces
- Note any open or semi-enclosed areas

STEP 2 - EXTRACT TEXT:
- Read all room labels
- Note any dimensions
- Identify abbreviations (BR=Bedroom, K=Kitchen, etc.)

STEP 3 - IDENTIFY SYMBOLS:
- Beds, sofas, tables
- Sinks, toilets, bathtubs
- Kitchen appliances
- Doors, windows, stairs

STEP 4 - CLASSIFY EACH SPACE:
- Use labels first
- Use symbols for inference
- Use size and adjacency
- If uncertain, use UNCLASSIFIED

ROOM TYPES:
${Object.values(RoomType).map(t => `- ${t}`).join('\n')}

OUTPUT (JSON only, no markdown fences):
{
  "imageMetadata": {
    "width": <detected or from input>,
    "height": <detected or from input>,
    "scale": "<scale if found>",
    "planType": "architectural|hand_drawn|cad|scan|photo"
  },
  "rooms": [
    {
      "tempId": "room_1",
      "name": "<label text or null>",
      "type": "<ROOM_TYPE>",
      "confidenceScore": <0.0-1.0>,
      "geometry": {
        "boundingBox": { "x": <%>, "y": <%>, "width": <%>, "height": <%> }
      },
      "areaEstimate": <number or null>,
      "areaUnit": "sqft|sqm|null",
      "symbolsDetected": ["SYMBOL_TYPE"],
      "textDetected": ["text found"],
      "reasoning": "<detailed explanation of classification>",
      "adjacentRooms": ["room_ids"],
      "detectionSource": "label|symbol|inference|boundary"
    }
  ],
  "circulation": [
    {
      "id": "passage_1",
      "type": "PASSAGE|CORRIDOR|LOBBY",
      "connects": ["room_1", "room_2"]
    }
  ],
  "warnings": [
    {
      "severity": "info|warning|critical",
      "message": "<description of issue>"
    }
  ],
  "selfCheck": {
    "totalRooms": <count>,
    "unclassifiedRooms": <count>,
    "possibleMissedAreas": "<description or 'None'>"
  }
}

FINAL CHECK: Before outputting, verify:
1. Have I included EVERY enclosed space?
2. Have I checked all edges and corners?
3. Is every space classified (even if UNCLASSIFIED)?
4. Does every room have reasoning?`;

// ============================================
// PROMPT BUILDERS
// ============================================

/**
 * Build the classification prompt with injected context
 */
export function buildClassificationPrompt(
  spatialData: object,
  textSymbolData: object
): string {
  return PROMPT_ROOM_CLASSIFICATION
    .replace('{spatialData}', JSON.stringify(spatialData, null, 2))
    .replace('{textSymbolData}', JSON.stringify(textSymbolData, null, 2));
}

/**
 * Build prompt with user hints
 */
export function buildPromptWithHints(
  basePrompt: string,
  hints?: {
    expectedRoomCount?: number;
    knownRoomNames?: string[];
    planType?: string;
  }
): string {
  if (!hints) return basePrompt;
  
  let hintsSection = '\n\nUSER-PROVIDED HINTS:\n';
  
  if (hints.expectedRoomCount) {
    hintsSection += `- Expected approximately ${hints.expectedRoomCount} rooms\n`;
  }
  
  if (hints.knownRoomNames?.length) {
    hintsSection += `- Known room names: ${hints.knownRoomNames.join(', ')}\n`;
  }
  
  if (hints.planType) {
    hintsSection += `- Plan type: ${hints.planType}\n`;
  }
  
  hintsSection += '\nUse these hints to improve accuracy, but still detect ALL spaces even if not mentioned.\n';
  
  return basePrompt + hintsSection;
}

// ============================================
// RESPONSE PARSING
// ============================================

/**
 * Clean and parse Gemini response
 * Handles markdown fences, extra text, etc.
 */
export function parseGeminiResponse<T>(response: string): T {
  // Remove markdown code fences if present
  let cleaned = response.trim();
  
  // Remove ```json or ``` fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  
  // Remove any text before the first {
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }
  
  // Remove any text after the last }
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }
  
  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    logger.error('Failed to parse Gemini response JSON (attempt 1)', { error: error instanceof Error ? error.message : String(error), cleanedResponse: cleaned });
    // Try to fix common JSON issues
    cleaned = cleaned
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/'/g, '"')       // Replace single quotes
      .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
    
    try {
      return JSON.parse(cleaned) as T;
    } catch (retryError) {
      logger.error('Failed to parse Gemini response JSON (attempt 2, after fixes)', { error: retryError instanceof Error ? retryError.message : String(retryError), cleanedResponse: cleaned });
      throw retryError; // Re-throw if still failing
    }
  }
}

/**
 * Validate that response contains required fields
 */
export function validateRoomResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  
  const obj = response as Record<string, unknown>;
  
  // Must have rooms array
  if (!Array.isArray(obj.rooms)) return false;
  
  // Each room must have required fields
  for (const room of obj.rooms) {
    if (typeof room !== 'object' || room === null) return false;
    const r = room as Record<string, unknown>;
    
    if (!r.tempId || !r.type || typeof r.confidenceScore !== 'number') {
      return false;
    }
    
    if (!r.reasoning || typeof r.reasoning !== 'string') {
      return false;
    }
  }
  
  return true;
}

