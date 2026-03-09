/**
 * TatvaOps Vision - Elevation Style Extractor
 * 
 * PASS 2: STYLE MAPPING (MOODBOARD → WALL)
 * 
 * Extracts visual style attributes from moodboard for wall elevations.
 * Style is applied ONLY to surfaces that exist in the geometry.
 * 
 * ============================================================
 * ❗ MOODBOARD INFORMS FINISHES, NOT STRUCTURE ❗
 * - Style affects colors, materials, finishes
 * - Style NEVER affects wall count, dimensions, or openings
 * - If moodboard extraction fails, use sensible defaults
 * ============================================================
 */

import crypto from 'crypto';
import { ElevationStyle, RoomElevationGeometry, ElevationGenerationError, ElevationErrorCode } from './types';
import { getGeminiClient } from '../common/gemini-client';
import { logger } from '../../lib/logger';

// ============================================
// DEFAULT STYLES BY ROOM TYPE
// ============================================

/**
 * Default style fallbacks by room type.
 * Used when moodboard extraction fails or is unavailable.
 */
const DEFAULT_STYLES: Record<string, Partial<ElevationStyle>> = {
  LIVING_ROOM: {
    wallFinish: 'Smooth matte paint',
    wallTreatment: 'Accent wall with subtle texture',
    colorPalette: ['Warm white', 'Soft grey', 'Natural wood tones'],
    materials: ['Paint', 'Wood paneling', 'Natural stone accents'],
    lightingStyle: 'Recessed ceiling lights with wall sconces',
    decorStyle: 'Contemporary with natural elements',
    flooringHint: 'Hardwood or large format tiles',
    ceilingTreatment: 'Flat white ceiling with cove lighting',
    aesthetic: 'Modern contemporary',
  },
  BEDROOM: {
    wallFinish: 'Soft matte paint',
    wallTreatment: 'Headboard wall with fabric panels or wallpaper',
    colorPalette: ['Warm neutrals', 'Soft pastels', 'Muted tones'],
    materials: ['Paint', 'Fabric panels', 'Wood'],
    lightingStyle: 'Ambient lighting with bedside pendants',
    decorStyle: 'Calm and restful',
    flooringHint: 'Carpet or warm wood flooring',
    ceilingTreatment: 'Flat ceiling with integrated lighting',
    aesthetic: 'Serene modern',
  },
  KITCHEN: {
    wallFinish: 'Semi-gloss paint or tiles',
    wallTreatment: 'Backsplash with countertop coordination',
    colorPalette: ['Clean white', 'Warm wood', 'Metallic accents'],
    materials: ['Tiles', 'Glass', 'Stainless steel', 'Quartz'],
    lightingStyle: 'Task lighting under cabinets, pendant over island',
    decorStyle: 'Functional with design focus',
    flooringHint: 'Porcelain tiles or vinyl',
    ceilingTreatment: 'False ceiling with recessed lights',
    aesthetic: 'Modern functional',
  },
  BATHROOM: {
    wallFinish: 'Tiles or waterproof paint',
    wallTreatment: 'Full height tiles with accent band',
    colorPalette: ['White', 'Soft grey', 'Natural stone tones'],
    materials: ['Ceramic tiles', 'Glass', 'Chrome fixtures'],
    lightingStyle: 'Mirror lighting with ambient ceiling',
    decorStyle: 'Clean spa-like',
    flooringHint: 'Non-slip tiles',
    ceilingTreatment: 'Moisture-resistant flat ceiling',
    aesthetic: 'Clean contemporary',
  },
  DINING: {
    wallFinish: 'Elegant paint finish',
    wallTreatment: 'Feature wall with art or mirror',
    colorPalette: ['Rich neutrals', 'Deep accents', 'Metallic touches'],
    materials: ['Paint', 'Wallpaper', 'Wood molding'],
    lightingStyle: 'Statement chandelier or pendant',
    decorStyle: 'Elegant and inviting',
    flooringHint: 'Hardwood or polished tiles',
    ceilingTreatment: 'Decorative ceiling with central fixture',
    aesthetic: 'Sophisticated modern',
  },
  DEFAULT: {
    wallFinish: 'Clean matte paint',
    wallTreatment: 'Simple painted walls',
    colorPalette: ['Neutral white', 'Soft grey', 'Beige'],
    materials: ['Paint'],
    lightingStyle: 'General ambient lighting',
    decorStyle: 'Clean and minimal',
    flooringHint: 'Neutral flooring',
    ceilingTreatment: 'Flat white ceiling',
    aesthetic: 'Clean minimal',
  },
};

// ============================================
// STYLE EXTRACTION FROM MOODBOARD
// ============================================

/**
 * Extract style attributes from a moodboard image.
 * 
 * Uses Gemini Vision to analyze the moodboard and extract:
 * - Color palette
 * - Material preferences
 * - Lighting style
 * - Overall aesthetic
 * 
 * ============================================================
 * ❗ STYLE ONLY - NO GEOMETRY INFORMATION ❗
 * This function extracts finishes, not structure.
 * ============================================================
 */
export async function extractStyleFromMoodboard(
  moodboardUrl: string,
  roomType: string,
  roomName: string
): Promise<ElevationStyle> {
  logger.info('Extracting style from moodboard', {
    roomType,
    roomName,
    moodboardUrl: moodboardUrl.substring(0, 50) + '...',
  });

  try {
    const gemini = getGeminiClient();
    
    // Fetch moodboard image
    const imageResponse = await fetch(moodboardUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch moodboard: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';

    // Build analysis prompt
    const analysisPrompt = buildStyleAnalysisPrompt(roomType, roomName);

    // Analyze with Gemini Vision
    const response = await gemini.analyzeContent([
      { text: analysisPrompt },
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ], {
      timeoutMs: 30000,
    });

    // Parse the response
    const extractedStyle = parseStyleResponse(response, roomType);
    
    // Generate style hash
    extractedStyle.styleHash = generateStyleHash(extractedStyle);

    logger.info('Style extracted from moodboard', {
      roomName,
      aesthetic: extractedStyle.aesthetic,
      colorCount: extractedStyle.colorPalette.length,
    });

    return extractedStyle;

  } catch (error) {
    logger.warn('Failed to extract style from moodboard, using defaults', {
      roomType,
      error: String(error),
    });

    // Return default style for room type
    return getDefaultStyle(roomType);
  }
}

/**
 * Build the prompt for style analysis.
 */
function buildStyleAnalysisPrompt(roomType: string, roomName: string): string {
  return `Analyze this interior design moodboard for a ${roomType.replace('_', ' ').toLowerCase()} (${roomName}).

Extract ONLY the following visual style attributes for use in generating 2D wall elevations:

1. WALL FINISH: What type of wall finish is suggested? (e.g., matte paint, textured paint, wallpaper, wood paneling, tiles)

2. WALL TREATMENT: What wall treatments or features are shown? (e.g., accent walls, wainscoting, molding, feature panels)

3. COLOR PALETTE: List the 3-5 dominant colors shown (use descriptive names like "warm white", "slate grey", "terracotta")

4. MATERIALS: What materials are featured? (e.g., wood, stone, metal, fabric, glass)

5. LIGHTING STYLE: What type of lighting fixtures are shown? (e.g., recessed, pendant, sconces, track lighting)

6. DECOR STYLE: Describe the decorative approach (e.g., minimalist, bohemian, traditional, contemporary)

7. FLOORING HINT: What flooring type is visible or implied? (e.g., hardwood, tiles, carpet)

8. CEILING TREATMENT: What ceiling design is suggested? (e.g., flat, coffered, beamed, cove lighting)

9. OVERALL AESTHETIC: One phrase describing the overall aesthetic (e.g., "Warm Japandi", "Modern Industrial", "Coastal Relaxed")

Respond in this exact JSON format:
{
  "wallFinish": "string",
  "wallTreatment": "string",
  "colorPalette": ["color1", "color2", "color3"],
  "materials": ["material1", "material2"],
  "lightingStyle": "string",
  "decorStyle": "string",
  "flooringHint": "string",
  "ceilingTreatment": "string",
  "aesthetic": "string"
}

IMPORTANT: Extract style attributes ONLY. Do not include any room dimensions, layout, or structural information.`;
}

/**
 * Parse the style response from Gemini.
 */
function parseStyleResponse(response: string, roomType: string): ElevationStyle {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and fill missing fields with defaults
    const defaults = DEFAULT_STYLES[roomType] || DEFAULT_STYLES.DEFAULT;

    return {
      wallFinish: parsed.wallFinish || defaults.wallFinish || 'Matte paint',
      wallTreatment: parsed.wallTreatment || defaults.wallTreatment || 'Simple painted',
      colorPalette: Array.isArray(parsed.colorPalette) && parsed.colorPalette.length > 0
        ? parsed.colorPalette
        : defaults.colorPalette || ['Neutral'],
      materials: Array.isArray(parsed.materials) && parsed.materials.length > 0
        ? parsed.materials
        : defaults.materials || ['Paint'],
      lightingStyle: parsed.lightingStyle || defaults.lightingStyle || 'General lighting',
      decorStyle: parsed.decorStyle || defaults.decorStyle || 'Minimal',
      flooringHint: parsed.flooringHint || defaults.flooringHint || 'Neutral flooring',
      ceilingTreatment: parsed.ceilingTreatment || defaults.ceilingTreatment || 'Flat ceiling',
      aesthetic: parsed.aesthetic || defaults.aesthetic || 'Contemporary',
      styleHash: '', // Will be generated after
    };
  } catch (error) {
    logger.warn('Failed to parse style response, using defaults', {
      roomType,
      error: String(error),
    });
    return getDefaultStyle(roomType);
  }
}

// ============================================
// DEFAULT STYLE GETTER
// ============================================

/**
 * Get default style for a room type.
 */
export function getDefaultStyle(roomType: string): ElevationStyle {
  const defaults = DEFAULT_STYLES[roomType.toUpperCase()] || DEFAULT_STYLES.DEFAULT;
  
  const style: ElevationStyle = {
    wallFinish: defaults.wallFinish || 'Matte paint',
    wallTreatment: defaults.wallTreatment || 'Simple painted',
    colorPalette: defaults.colorPalette || ['Neutral white'],
    materials: defaults.materials || ['Paint'],
    lightingStyle: defaults.lightingStyle || 'General lighting',
    decorStyle: defaults.decorStyle || 'Minimal',
    flooringHint: defaults.flooringHint || 'Neutral flooring',
    ceilingTreatment: defaults.ceilingTreatment || 'Flat ceiling',
    aesthetic: defaults.aesthetic || 'Contemporary',
    styleHash: '',
  };
  
  style.styleHash = generateStyleHash(style);
  return style;
}

// ============================================
// STYLE HASHING
// ============================================

/**
 * Generate a hash of the style for deduplication.
 */
export function generateStyleHash(style: ElevationStyle): string {
  const hashInput = {
    wallFinish: style.wallFinish,
    wallTreatment: style.wallTreatment,
    colorPalette: style.colorPalette.sort(),
    materials: style.materials.sort(),
    aesthetic: style.aesthetic,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 16);
}

// ============================================
// STYLE APPLICATION STRING BUILDER
// ============================================

/**
 * Build a style instruction string for the prompt.
 * 
 * ============================================================
 * ❗ STYLE ONLY - MUST NOT INCLUDE GEOMETRY ❗
 * This string describes finishes to apply, not structure.
 * ============================================================
 */
export function buildStyleInstructionString(
  style: ElevationStyle,
  wallDirection: string,
  roomName: string
): string {
  const instructions: string[] = [];

  instructions.push(`STYLE GUIDELINES FOR ${wallDirection} WALL OF ${roomName.toUpperCase()}:`);
  instructions.push('');
  instructions.push(`Overall Aesthetic: ${style.aesthetic}`);
  instructions.push(`Wall Finish: ${style.wallFinish}`);
  instructions.push(`Wall Treatment: ${style.wallTreatment}`);
  instructions.push(`Color Palette: ${style.colorPalette.join(', ')}`);
  instructions.push(`Materials: ${style.materials.join(', ')}`);
  instructions.push(`Lighting: ${style.lightingStyle}`);
  instructions.push(`Ceiling: ${style.ceilingTreatment}`);
  instructions.push(`Flooring (visible at bottom): ${style.flooringHint}`);
  instructions.push(`Decorative Approach: ${style.decorStyle}`);

  return instructions.join('\n');
}


