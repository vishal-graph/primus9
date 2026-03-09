/**
 * TatvaOps Vision - Elevation Prompt Builder
 * 
 * PASS 3: ELEVATION COMPOSITION PROMPT
 * 
 * Builds the final prompt for wall elevation image generation.
 * Combines geometry constraints with style instructions.
 * 
 * ============================================================
 * ❗ GEOMETRY CONSTRAINTS ARE ABSOLUTE ❗
 * Every prompt MUST include strict geometry enforcement.
 * Deviation beyond 5% is UNACCEPTABLE.
 * ============================================================
 * 
 * PROMPT MUST INCLUDE:
 * - "Strictly follow provided wall dimensions"
 * - "2D architectural elevation, not perspective"
 * - "No hallucinated geometry"
 * - "Accuracy prioritized over aesthetics"
 * - "Deviation beyond 5% is unacceptable"
 */

import {
  WallGeometry,
  WallDirection,
  ElevationStyle,
  RoomElevationGeometry,
} from './types';
import { buildGeometryConstraintString } from './geometryValidator';
import { buildStyleInstructionString } from './styleExtractor';
import { logger } from '../../lib/logger';

// ============================================
// CONSTANTS
// ============================================

/**
 * Mandatory constraint phrases that MUST appear in every prompt.
 * These enforce architectural accuracy.
 */
const MANDATORY_CONSTRAINTS = [
  'Strictly follow provided wall dimensions',
  '2D architectural elevation, not perspective view',
  'No hallucinated geometry - only draw specified elements',
  'Accuracy prioritized over aesthetics',
  'Geometric deviation beyond 5% is unacceptable',
  'Orthographic projection only - no vanishing points',
  'Technical precision is required',
];

/**
 * Prohibited elements that must be explicitly excluded.
 */
const PROHIBITED_ELEMENTS = [
  'Do not add additional doors or windows beyond what is specified',
  'Do not add structural elements not in the geometry',
  'Do not create perspective depth or 3D effects',
  'Do not add floating objects or unrealistic elements',
  'Do not include people or animals',
  'Do not add shadows that distort wall proportions',
];

// ============================================
// MAIN PROMPT BUILDER
// ============================================

/**
 * Build the complete elevation generation prompt.
 * 
 * ============================================================
 * ❗ DO NOT MODIFY GEOMETRY IN THIS PROMPT ❗
 * Geometry comes directly from floor plan analysis.
 * Only style from moodboard is variable.
 * ============================================================
 */
export function buildElevationPrompt(
  wall: WallGeometry,
  style: ElevationStyle,
  roomGeometry: RoomElevationGeometry
): string {
  logger.info('Building elevation prompt', {
    roomId: roomGeometry.roomId,
    wallDirection: wall.direction,
  });

  const prompt = [
    // === SECTION 1: TASK DEFINITION ===
    buildTaskSection(wall.direction, roomGeometry.roomName, roomGeometry.roomType),
    
    // === SECTION 2: MANDATORY CONSTRAINTS (NON-NEGOTIABLE) ===
    buildConstraintsSection(),
    
    // === SECTION 3: GEOMETRY SPECIFICATION (FROM FLOOR PLAN) ===
    buildGeometrySection(wall, roomGeometry),
    
    // === SECTION 4: STYLE GUIDELINES (FROM MOODBOARD) ===
    buildStyleSection(style, wall.direction, roomGeometry.roomName),
    
    // === SECTION 5: OUTPUT REQUIREMENTS ===
    buildOutputSection(),
    
    // === SECTION 6: PROHIBITED ELEMENTS ===
    buildProhibitedSection(),
    
    // === SECTION 7: FINAL INSTRUCTION ===
    buildFinalSection(),
  ].join('\n\n');

  logger.debug('Elevation prompt built', {
    promptLength: prompt.length,
    wallDirection: wall.direction,
  });

  return prompt;
}

// ============================================
// SECTION BUILDERS
// ============================================

/**
 * Section 1: Task Definition
 */
function buildTaskSection(
  direction: WallDirection,
  roomName: string,
  roomType: string
): string {
  return `=== TASK: 2D ARCHITECTURAL WALL ELEVATION ===

Generate a professional 2D architectural wall elevation for the ${direction} wall of ${roomName} (${roomType.replace('_', ' ')}).

This is a TECHNICAL ARCHITECTURAL DRAWING, not an artistic render.
Think: AutoCAD / ArchiCAD / professional interior elevation sheets — but visually enhanced.`;
}

/**
 * Section 2: Mandatory Constraints
 */
function buildConstraintsSection(): string {
  const constraints = [
    '=== MANDATORY CONSTRAINTS (NON-NEGOTIABLE) ===',
    '',
    ...MANDATORY_CONSTRAINTS.map((c, i) => `${i + 1}. ${c}`),
    '',
    'These constraints are ABSOLUTE. Any violation makes the output unusable.',
  ];
  
  return constraints.join('\n');
}

/**
 * Section 3: Geometry Specification
 * 
 * ============================================================
 * ❗ DO NOT MODIFY - Direct from floor plan ❗
 * ============================================================
 */
function buildGeometrySection(
  wall: WallGeometry,
  roomGeometry: RoomElevationGeometry
): string {
  const geometryString = buildGeometryConstraintString(wall, roomGeometry.roomName);
  
  const section = [
    '=== GEOMETRY SPECIFICATION (SOURCE OF TRUTH) ===',
    '',
    '⚠️ THE FOLLOWING GEOMETRY IS FROM FLOOR PLAN ANALYSIS AND MUST BE FOLLOWED EXACTLY:',
    '',
    geometryString,
    '',
    'Room Dimensions Reference:',
    `- Room Length: ${roomGeometry.dimensions.length.toFixed(2)} ${roomGeometry.dimensions.unit}`,
    `- Room Width: ${roomGeometry.dimensions.width.toFixed(2)} ${roomGeometry.dimensions.unit}`,
    `- Ceiling Height: ${roomGeometry.dimensions.ceilingHeight.toFixed(2)} ${roomGeometry.dimensions.unit}`,
    '',
    '⚠️ DO NOT ADD, REMOVE, OR MODIFY ANY GEOMETRIC ELEMENTS.',
  ];
  
  return section.join('\n');
}

/**
 * Section 4: Style Guidelines
 */
function buildStyleSection(
  style: ElevationStyle,
  direction: WallDirection,
  roomName: string
): string {
  const styleString = buildStyleInstructionString(style, direction, roomName);
  
  const section = [
    '=== STYLE GUIDELINES (FROM MOODBOARD) ===',
    '',
    'Apply these visual styles to the EXISTING geometry only:',
    '',
    styleString,
    '',
    'NOTE: Style affects FINISHES ONLY. Style cannot add or remove structural elements.',
  ];
  
  return section.join('\n');
}

/**
 * Section 5: Output Requirements
 */
function buildOutputSection(): string {
  return `=== OUTPUT REQUIREMENTS ===

Visual Standard:
- Pure 2D orthographic elevation (flat, no perspective)
- Clean, crisp lines with sharp edges
- Professional architectural presentation quality
- High resolution, suitable for 4K display

Composition:
- Wall spans the full image width
- Ceiling at top, floor at bottom
- Proper scaling (wall proportions accurate)
- Neutral, even lighting (no dramatic shadows)
- Light neutral / white background

Must Show:
- Wall width accurately scaled
- Ceiling height accurately scaled  
- All doors/windows exactly as specified
- Any built-in elements positioned correctly
- Appropriate finishes and materials

Do NOT Show:
- Perspective distortion
- Camera angles
- Artistic depth tricks
- 3D rendering effects
- Vanishing points`;
}

/**
 * Section 6: Prohibited Elements
 */
function buildProhibitedSection(): string {
  const section = [
    '=== PROHIBITED ELEMENTS ===',
    '',
    ...PROHIBITED_ELEMENTS.map((p, i) => `❌ ${i + 1}. ${p}`),
    '',
    'Any of the above will make the output UNUSABLE.',
  ];
  
  return section.join('\n');
}

/**
 * Section 7: Final Instruction
 */
function buildFinalSection(): string {
  return `=== FINAL INSTRUCTION ===

Generate a SINGLE 2D architectural wall elevation image that:

1. EXACTLY matches the specified geometry (≤5% deviation)
2. Applies the style guidelines to existing surfaces only
3. Looks like a professional architectural elevation drawing
4. Is technically accurate and measurable
5. Has clean, sharp, professional presentation

Remember: This is an ARCHITECTURAL TOOL output, not an artistic interpretation.
Floor plan geometry is LAW. Accuracy over aesthetics.

Generate the elevation now.`;
}

// ============================================
// PROMPT VALIDATION
// ============================================

/**
 * Validate that a prompt contains all mandatory constraints.
 * Used for quality assurance.
 */
export function validatePrompt(prompt: string): {
  isValid: boolean;
  missingConstraints: string[];
} {
  const missingConstraints: string[] = [];
  
  for (const constraint of MANDATORY_CONSTRAINTS) {
    // Check for key phrases from each constraint
    const keyPhrase = constraint.split(' ').slice(0, 3).join(' ').toLowerCase();
    if (!prompt.toLowerCase().includes(keyPhrase)) {
      missingConstraints.push(constraint);
    }
  }
  
  return {
    isValid: missingConstraints.length === 0,
    missingConstraints,
  };
}

// ============================================
// PROMPT HASH FOR CACHING
// ============================================

/**
 * Generate a hash of geometry + style for prompt caching.
 * Same inputs = same prompt = can potentially skip regeneration.
 */
export function generatePromptHash(
  geometryHash: string,
  styleHash: string,
  direction: WallDirection
): string {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(`${geometryHash}:${styleHash}:${direction}`)
    .digest('hex')
    .substring(0, 16);
}


