/**
 * TatvaOps Vision - Isometric Prompt Builder
 * 
 * STAGE 3: Build the global isometric generation prompt.
 * 
 * ============================================================
 * ❗ EVERY PROMPT MUST INCLUDE GEOMETRY CONSTRAINTS ❗
 * ❗ NO STRUCTURAL MODIFICATIONS ALLOWED ❗
 * ============================================================
 * 
 * This module composes the final prompt for Gemini image generation,
 * combining geometry description, room styles, and strict prohibitions.
 */

import { createHash } from 'crypto';
import {
  FloorGeometry,
  FloorStyleMap,
  IsometricPrompt,
  MAX_DEVIATION,
} from './types';
import { buildGeometryDescription } from './geometryValidator';
import { buildStyleDescription } from './styleMapper';
import { logger } from '../../lib/logger';

// ===========================================
// Main Prompt Builder
// ===========================================

/**
 * Build the complete isometric generation prompt.
 * 
 * ============================================================
 * ❗ DO NOT MODIFY THESE CONSTRAINTS ❗
 * These are critical for architectural accuracy.
 * ============================================================
 */
export function buildIsometricPrompt(
  geometry: FloorGeometry,
  styleMap: FloorStyleMap
): IsometricPrompt {
  logger.info('Building isometric generation prompt', {
    floor: geometry.floor,
    roomCount: geometry.rooms.length,
  });

  // Build sections
  const geometrySection = buildGeometryDescription(geometry);
  const styleSection = buildStyleDescription(styleMap);
  const prohibitions = buildProhibitionsList();

  // Compose final prompt
  const prompt = composePrompt(geometry, geometrySection, styleSection, prohibitions);

  // Generate prompt hash
  const promptHash = generatePromptHash(prompt);

  logger.info('Isometric prompt built', {
    promptLength: prompt.length,
    promptHash,
  });

  return {
    prompt,
    geometrySection,
    styleSection,
    prohibitions,
    promptHash,
  };
}

// ===========================================
// Prompt Composition
// ===========================================

/**
 * Compose the final generation prompt
 */
function composePrompt(
  geometry: FloorGeometry,
  geometrySection: string,
  styleSection: string,
  prohibitions: string[]
): string {
  const lines: string[] = [];

  // ===========================================
  // HEADER - Critical Instructions
  // ===========================================
  
  lines.push('='.repeat(60));
  lines.push('ISOMETRIC / BIRD\'S-EYE 3D FLOOR PLAN INTERIOR ELEVATION');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push('Generate a photorealistic, high-quality isometric interior elevation showing the ENTIRE floor plan from a bird\'s-eye view with a cutaway (roof removed).');
  lines.push('The output must be a fully rendered image with realistic materials, textures, and furniture - NOT a line drawing or schematic.');
  lines.push('');

  // ===========================================
  // CRITICAL REQUIREMENTS
  // ===========================================

  lines.push('CRITICAL REQUIREMENTS (MANDATORY):');
  lines.push('1. Isometric / axonometric camera angle with slight bird\'s-eye tilt');
  lines.push('2. STRICTLY follow the provided floor plan geometry');
  lines.push('3. Show ALL rooms in ONE coherent image');
  lines.push('4. Accuracy prioritized over aesthetics');
  lines.push(`5. Maximum ${(MAX_DEVIATION * 100).toFixed(0)}% geometric deviation allowed (for décor thickness only)`);
  lines.push('6. Photorealistic material rendering (wood, stone, fabric, glass)');
  lines.push('7. Natural lighting with soft shadows to show depth');
  lines.push('8. White or very light neutral background');
  lines.push('9. 4K resolution minimum (3840x2160)');
  lines.push('10. NO perspective camera effects or depth of field');
  lines.push('11. NO text labels, dimensions, room names, or annotations of any kind');
  lines.push('');

  // ===========================================
  // GEOMETRY SECTION
  // ===========================================
  
  lines.push('-'.repeat(40));
  lines.push('FLOOR PLAN GEOMETRY (SOURCE OF TRUTH)');
  lines.push('-'.repeat(40));
  lines.push('');
  lines.push(geometrySection);
  lines.push('');

  // ===========================================
  // STYLE SECTION
  // ===========================================
  
  lines.push('-'.repeat(40));
  lines.push('ROOM STYLING (DECORATIVE ONLY)');
  lines.push('-'.repeat(40));
  lines.push('');
  lines.push(styleSection);
  lines.push('');

  // ===========================================
  // PROHIBITIONS SECTION
  // ===========================================
  
  lines.push('-'.repeat(40));
  lines.push('ABSOLUTE PROHIBITIONS (DO NOT VIOLATE)');
  lines.push('-'.repeat(40));
  lines.push('');
  for (const prohibition of prohibitions) {
    lines.push(`❌ ${prohibition}`);
  }
  lines.push('');

  // ===========================================
  // QUALITY SPECIFICATIONS
  // ===========================================
  
  lines.push('-'.repeat(40));
  lines.push('OUTPUT QUALITY SPECIFICATIONS');
  lines.push('-'.repeat(40));
  lines.push('');
  lines.push('Visual Style:');
  lines.push('- Real-estate marketing quality');
  lines.push('- Architectural presentation grade');
  lines.push('- NOT gaming/cinematic render');
  lines.push('- NOT artistic interpretation');
  lines.push('');
  lines.push('Technical Requirements:');
  lines.push('- Sharp edges and clean lines');
  lines.push('- Realistic high-quality materials (wood grain, fabric texture, reflections)');
  lines.push('- Consistent scale across all rooms');
  lines.push('- Walls visible up to ceiling height');
  lines.push('- Cutaway view (roof removed)');
  lines.push('- Entire home visible in one frame');
  lines.push('- NO TEXT LABELS');
  lines.push('');

  // ===========================================
  // FINAL INSTRUCTION
  // ===========================================
  
  lines.push('='.repeat(60));
  lines.push('GENERATE THE ISOMETRIC FLOOR PLAN ELEVATION NOW');
  lines.push('Remember: GEOMETRY IS LAW - do not add, remove, or modify any walls, rooms, or openings.');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

// ===========================================
// Prohibitions List
// ===========================================

/**
 * Build the list of absolute prohibitions
 * 
 * ============================================================
 * ❗ DO NOT MODIFY THESE PROHIBITIONS ❗
 * They are critical for maintaining architectural accuracy.
 * ============================================================
 */
function buildProhibitionsList(): string[] {
  return [
    // Structural prohibitions
    'Do NOT add any walls that are not in the floor plan',
    'Do NOT remove any walls from the floor plan',
    'Do NOT change room shapes or sizes',
    'Do NOT merge any rooms together',
    'Do NOT split any room into multiple rooms',
    'Do NOT invent doors or windows not specified',
    'Do NOT close any specified openings',
    
    // Proportion prohibitions
    `Do NOT distort proportions beyond ${(MAX_DEVIATION * 100).toFixed(0)}%`,
    'Do NOT change room positions relative to each other',
    'Do NOT modify wall thickness beyond specified',
    
    // Camera/view prohibitions
    'Do NOT use perspective camera',
    'Do NOT add depth of field blur',
    'Do NOT add dramatic lighting or shadows',
    'Do NOT use wide-angle distortion',
    
    // Style prohibitions
    'Do NOT add furniture that exceeds room bounds',
    'Do NOT obscure room boundaries with décor',
    'Do NOT use cinematic or gaming render style',
    'Do NOT add text, labels, annotations, or dimensions',
    'Do NOT use "blueprint" or "sketch" style',
    
    // Completeness prohibitions
    'Do NOT show only part of the floor plan',
    'Do NOT omit any rooms from the view',
    'Do NOT cut off any room at image edges',
  ];
}

// ===========================================
// Hash Generation
// ===========================================

/**
 * Generate hash of prompt for caching/deduplication
 */
function generatePromptHash(prompt: string): string {
  const hash = createHash('sha256');
  hash.update(prompt);
  return hash.digest('hex').substring(0, 16);
}

// ===========================================
// Prompt Validation
// ===========================================

/**
 * Validate that prompt contains required elements
 */
export function validatePrompt(prompt: IsometricPrompt): boolean {
  const requiredPhrases = [
    'isometric',
    'floor plan',
    'geometry',
    'accuracy',
    'do not add',
    'do not remove',
  ];

  const promptLower = prompt.prompt.toLowerCase();
  
  for (const phrase of requiredPhrases) {
    if (!promptLower.includes(phrase.toLowerCase())) {
      logger.error('Prompt missing required phrase', { phrase });
      return false;
    }
  }

  if (prompt.prohibitions.length < 10) {
    logger.error('Prompt has too few prohibitions', {
      count: prompt.prohibitions.length,
    });
    return false;
  }

  return true;
}

// ===========================================
// Simplified Prompt for Gemini Image
// ===========================================

/**
 * Create a LAYOUT-CONSTRAINED prompt that references the layout image
 * 
 * ============================================================
 * ❗ THIS IS THE PRIMARY PROMPT FOR ACCURATE GENERATION ❗
 * ❗ THE LAYOUT IMAGE IS THE SOURCE OF TRUTH ❗
 * ============================================================
 */
export function buildLayoutConstrainedPrompt(
  geometry: FloorGeometry,
  styleMap: FloorStyleMap,
  strict: boolean = false
): string {
  // Build room style descriptions
  const roomStyleList = geometry.rooms.map(room => {
    const style = styleMap.roomStyles[room.roomId];
    if (!style) {
      return `${room.roomName}: modern minimalist, neutral tones`;
    }
    
    const parts: string[] = [];
    parts.push(`${style.furnitureStyle} style`);
    parts.push(`${style.colors.primary} walls`);
    parts.push(`${style.materials.flooring} flooring`);
    
    if (style.furniture?.pieces && style.furniture.pieces.length > 0) {
      parts.push(`with ${style.furniture.pieces.slice(0, 4).join(', ')}`);
    }
    
    return `${room.roomName}: ${parts.join(', ')}`;
  }).join('\n');

  const strictWarning = strict ? `
⚠️⚠️⚠️ CRITICAL WARNING ⚠️⚠️⚠️
Previous generations did NOT match the layout correctly.
You MUST follow the layout image EXACTLY this time.
ANY deviation from the layout will be rejected.
⚠️⚠️⚠️ CRITICAL WARNING ⚠️⚠️⚠️
` : '';

  return `${strictWarning}
=== LAYOUT-CONSTRAINED ISOMETRIC GENERATION ===

You are provided with reference images. The FIRST image is a PRECISE LAYOUT that you MUST follow EXACTLY.

🔴 MANDATORY: Generate an isometric 3D interior view that MATCHES the layout image EXACTLY:
- Every room MUST be in the EXACT position shown in the layout
- Every room MUST have the EXACT size and shape shown in the layout
- The overall floor plan shape MUST match the layout EXACTLY
- Room adjacencies MUST be preserved EXACTLY as shown

Floor Plan Details:
- Total Rooms: ${geometry.rooms.length}
- Floor Size: ${geometry.dimensions.width} x ${geometry.dimensions.height} units

Room Positions (from layout):
${geometry.rooms.map(r => `• ${r.roomName} at (${r.boundingBox.x}, ${r.boundingBox.y}), size ${r.boundingBox.width}x${r.boundingBox.height}`).join('\n')}

Room Styling (apply to each room):
${roomStyleList}

RENDERING REQUIREMENTS:
1. ✅ MATCH the layout image positions EXACTLY
2. ✅ Isometric/bird's-eye view angle (~30° tilt)
3. ✅ Cutaway view (roof removed, walls visible)
4. ✅ Photorealistic materials and textures
5. ✅ Furniture placed within room boundaries
6. ✅ Soft natural lighting
7. ✅ White/neutral background
8. ✅ 4K resolution

ABSOLUTE PROHIBITIONS:
❌ DO NOT change any room positions from the layout
❌ DO NOT resize or reshape any rooms
❌ DO NOT merge or split rooms
❌ DO NOT rearrange the floor plan
❌ DO NOT add/remove walls
❌ DO NOT use perspective distortion
❌ DO NOT omit any rooms

The generated image MUST be a 3D representation of the EXACT layout shown in the first reference image. The layout is the SOURCE OF TRUTH - do not deviate from it.

Generate the isometric floor elevation now, following the layout image exactly.`;
}

/**
 * Create a simplified prompt suitable for Gemini image generation
 * (Gemini image models have token limits)
 * 
 * ============================================================
 * ❗ CRITICAL: INCLUDES EXACT ROOM POSITIONS FOR ACCURACY ❗
 * ============================================================
 */
export function buildSimplifiedPrompt(
  geometry: FloorGeometry,
  styleMap: FloorStyleMap
): string {
  // Build precise room layout with POSITIONS (critical for accuracy)
  const roomLayoutDescription = geometry.rooms.map(room => {
    const { x, y, width, height } = room.boundingBox;
    const style = styleMap.roomStyles[room.roomId];
    
    const styleParts: string[] = [];
    if (style) {
      styleParts.push(`${style.furnitureStyle} style`);
      styleParts.push(`${style.colors.primary} walls`);
      styleParts.push(`${style.materials.flooring} floor`);
      if (style.furniture?.pieces && style.furniture.pieces.length > 0) {
        styleParts.push(`furniture: ${style.furniture.pieces.slice(0, 3).join(', ')}`);
      }
    } else {
      styleParts.push('modern style, neutral walls, hardwood floor');
    }
    
    return `  • ${room.roomName} (${room.roomType}): position (${x}, ${y}), size ${width}x${height} → ${styleParts.join(', ')}`;
  }).join('\n');

  // Build adjacency map for spatial relationships
  const adjacencyInfo = geometry.rooms
    .filter(r => r.adjacentRooms && r.adjacentRooms.length > 0)
    .map(r => `  • ${r.roomName} connects to: ${r.adjacentRooms!.join(', ')}`)
    .join('\n');

  return `Create a photorealistic isometric/bird's-eye 3D interior floor plan elevation showing a cutaway view (roof removed).

⚠️ CRITICAL: FOLLOW THE EXACT FLOOR PLAN GEOMETRY BELOW ⚠️
The room positions and sizes below are from the ACTUAL floor plan and MUST be followed EXACTLY.

=== FLOOR PLAN GEOMETRY (IMMUTABLE - DO NOT MODIFY) ===
Total Floor Size: ${geometry.dimensions.width} x ${geometry.dimensions.height} units
Wall Thickness: ${geometry.wallThickness} inches
Number of Rooms: ${geometry.rooms.length}

ROOM POSITIONS AND SIZES (X,Y coordinates from top-left):
${roomLayoutDescription}

${adjacencyInfo ? `ROOM ADJACENCIES (rooms that share walls/doorways):\n${adjacencyInfo}\n` : ''}
=== END GEOMETRY ===

RENDERING INSTRUCTIONS:
1. ⚠️ GEOMETRY IS LAW: Render rooms EXACTLY at the positions and sizes specified above
2. Each room MUST be at its correct (x,y) position relative to other rooms
3. Room proportions and relative positions MUST match the floor plan exactly
4. Isometric camera angle (~30° tilt), bird's-eye view
5. Show ALL ${geometry.rooms.length} rooms in ONE coherent image
6. Walls visible up to ceiling height (cutaway/roof removed)
7. Photorealistic materials: wood grain, fabric textures, stone, glass reflections
8. Soft natural lighting with realistic shadows
9. White/neutral background
10. 4K resolution minimum
11. NO perspective distortion
12. NO text labels or annotations

ABSOLUTE PROHIBITIONS:
❌ Do NOT change room positions from the geometry above
❌ Do NOT resize or reshape any room
❌ Do NOT merge or split any rooms
❌ Do NOT add/remove walls or doors not in the floor plan
❌ Do NOT rearrange the room layout
❌ Do NOT use perspective camera
❌ Do NOT omit any rooms

The generated elevation MUST look like a 3D version of the exact floor plan geometry provided. Accuracy is more important than aesthetics.

Generate the isometric floor plan elevation now.`;
}


