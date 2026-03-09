/**
 * TatvaOps Vision - Isometric Style Mapper
 * 
 * STAGE 2: Extract and map styles from room moodboards.
 * 
 * ============================================================
 * ❗ MOODBOARDS CONTROL FINISHES ONLY ❗
 * ❗ NO STRUCTURAL CHANGES ALLOWED ❗
 * ============================================================
 * 
 * This module:
 * - Extracts style attributes from moodboard images
 * - Maps styles to room functions
 * - Ensures furniture fits room bounds
 * - Creates a coherent floor-wide style map
 */

import { createHash } from 'crypto';
import {
  RoomGeometry,
  RoomStyle,
  FloorStyleMap,
  StyleMappingResult,
  FloorGeometry,
} from './types';
import { logger } from '../../lib/logger';
import { getGeminiClient } from '../common/gemini-client';

// ===========================================
// Main Style Mapping Function
// ===========================================

/**
 * Extract styles from moodboards and create floor-wide style map.
 * 
 * ============================================================
 * ❗ STYLES AFFECT APPEARANCE ONLY ❗
 * ❗ FURNITURE MUST FIT ROOM BOUNDS ❗
 * ============================================================
 */
export async function mapFloorStyles(
  floorGeometry: FloorGeometry,
  moodboardUrls: Record<string, string>
): Promise<StyleMappingResult> {
  logger.info('Mapping floor styles from moodboards', {
    floor: floorGeometry.floor,
    roomCount: floorGeometry.rooms.length,
    moodboardCount: Object.keys(moodboardUrls).length,
  });

  const roomStyles: Record<string, RoomStyle> = {};
  const failedRooms: string[] = [];

  // Extract style for each room
  for (const room of floorGeometry.rooms) {
    const moodboardUrl = moodboardUrls[room.roomId];

    if (!moodboardUrl) {
      logger.warn('No moodboard for room, using defaults', {
        roomId: room.roomId,
        roomName: room.roomName,
      });
      roomStyles[room.roomId] = getDefaultStyle(room);
      failedRooms.push(room.roomId);
      continue;
    }

    try {
      const style = await extractStyleFromMoodboard(moodboardUrl, room);
      roomStyles[room.roomId] = style;
      
      logger.debug('Style extracted for room', {
        roomId: room.roomId,
        primaryColor: style.colors.primary,
        furnitureStyle: style.furnitureStyle,
      });
    } catch (error) {
      logger.warn('Failed to extract style from moodboard, using defaults', {
        roomId: room.roomId,
        error: String(error),
      });
      roomStyles[room.roomId] = getDefaultStyle(room);
      failedRooms.push(room.roomId);
    }
  }

  // Generate style hash
  const styleHash = generateStyleHash(roomStyles);

  // Generate coherence notes
  const coherenceNotes = generateCoherenceNotes(roomStyles);

  logger.info('Floor style mapping complete', {
    totalRooms: floorGeometry.rooms.length,
    successfulExtractions: floorGeometry.rooms.length - failedRooms.length,
    failedRooms: failedRooms.length,
    styleHash,
  });

  return {
    success: failedRooms.length < floorGeometry.rooms.length, // At least some succeeded
    styleMap: {
      roomStyles,
      coherenceNotes,
      styleHash,
    },
    failedRooms,
  };
}

// ===========================================
// Style Extraction from Moodboard
// ===========================================

/**
 * Extract style attributes from a moodboard image using Gemini Vision
 */
async function extractStyleFromMoodboard(
  moodboardUrl: string,
  room: RoomGeometry
): Promise<RoomStyle> {
  logger.info('Extracting style from moodboard', {
    roomId: room.roomId,
    roomType: room.roomType,
  });

  const prompt = `Analyze this interior design moodboard for a ${room.roomType.toLowerCase().replace('_', ' ')} named "${room.roomName}".

Extract ALL visible design elements with DETAILED descriptions:

1. COLOR PALETTE:
   - Primary color (dominant wall/large surface color with specific shade)
   - Secondary color (furniture/accents with specific shade)
   - Accent color (decorative elements with specific shade)

2. MATERIALS & TEXTURES:
   - Wall finish (specific paint color name, wallpaper pattern, paneling type, texture)
   - Flooring type (specific hardwood species, tile pattern, carpet texture, etc.)
   - Ceiling treatment (if visible: paint, beams, molding, etc.)
   - Textures visible: fabric textures, wood grain patterns, tile patterns, etc.

3. FURNITURE & DECORATIVE ELEMENTS:
   - List ALL visible furniture pieces (sofa, bed, table, chairs, etc.) with style descriptions
   - Furniture materials (wood type, fabric type, metal finishes)
   - Decorative elements (artwork, plants, rugs, lighting fixtures, etc.)
   - Furniture arrangement and layout style

4. FURNITURE STYLE:
   - Overall style (modern, traditional, minimalist, bohemian, etc.)
   - Specific furniture characteristics (upholstered, wooden, metal, etc.)

5. LIGHTING MOOD:
   - warm, neutral, or cool
   - Lighting fixtures visible (pendant lights, table lamps, etc.)

6. TEXTURES & PATTERNS:
   - Fabric textures (smooth, textured, plush, etc.)
   - Wood grain patterns
   - Tile patterns
   - Any visible patterns or textures

Respond in this exact JSON format:
{
  "colors": {
    "primary": "specific color description with shade",
    "secondary": "specific color description with shade",
    "accent": "specific color description with shade"
  },
  "materials": {
    "walls": "detailed finish description including texture/pattern",
    "flooring": "detailed flooring type including texture/pattern",
    "ceiling": "treatment description or null"
  },
  "furniture": {
    "pieces": ["list of all visible furniture pieces with descriptions"],
    "materials": "furniture materials description",
    "arrangement": "furniture arrangement style"
  },
  "decorativeElements": ["list of decorative items like artwork, plants, rugs, etc."],
  "textures": {
    "fabrics": "fabric texture descriptions",
    "wood": "wood grain/pattern descriptions",
    "tiles": "tile pattern descriptions",
    "other": "other visible textures"
  },
  "furnitureStyle": "detailed style name",
  "lightingMood": "warm|neutral|cool",
  "lightingFixtures": ["list of visible lighting fixtures"],
  "styleNotes": "comprehensive overall style summary including all key elements"
}`;

  try {
    // Fetch moodboard image
    logger.info('Fetching moodboard image', {
      roomId: room.roomId,
      roomType: room.roomType,
      moodboardUrl: moodboardUrl, // Full URL for debugging
    });
    
    let imageResponse;
    try {
      imageResponse = await fetch(moodboardUrl, {
        headers: {
          'Accept': 'image/*',
        },
      });
    } catch (fetchError) {
      logger.error('Network error fetching moodboard', {
        roomId: room.roomId,
        moodboardUrl,
        error: String(fetchError),
      });
      throw new Error(`Network error fetching moodboard: ${String(fetchError)}`);
    }
    
    if (!imageResponse.ok) {
      logger.error('Moodboard fetch failed with status', {
        roomId: room.roomId,
        moodboardUrl,
        status: imageResponse.status,
        statusText: imageResponse.statusText,
      });
      throw new Error(`Failed to fetch moodboard: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';
    
    logger.debug('Moodboard image fetched', {
      roomId: room.roomId,
      mimeType,
      imageSize: imageBuffer.byteLength,
      base64Length: base64Image.length,
    });

    // Build parts for Gemini Vision API
    const geminiClient = getGeminiClient();
    const parts = [
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      { text: prompt },
    ];

    const response = await geminiClient.analyzeContent(parts, {
      timeoutMs: 60000,
    });
    
    logger.debug('Gemini style extraction response', {
      roomId: room.roomId,
      responseLength: response.length,
      responsePreview: response.substring(0, 500),
    });
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('No JSON found in Gemini response', {
        roomId: room.roomId,
        fullResponse: response.substring(0, 1000),
      });
      throw new Error(`No JSON found in response. Response preview: ${response.substring(0, 200)}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error('Failed to parse JSON from Gemini response', {
        roomId: room.roomId,
        jsonMatch: jsonMatch[0].substring(0, 500),
        error: String(parseError),
      });
      throw new Error(`JSON parse error: ${String(parseError)}`);
    }

    return {
      roomId: room.roomId,
      roomType: room.roomType,
      colors: {
        primary: parsed.colors?.primary || 'neutral white',
        secondary: parsed.colors?.secondary || 'light gray',
        accent: parsed.colors?.accent || 'warm wood',
      },
      materials: {
        walls: parsed.materials?.walls || 'white paint',
        flooring: parsed.materials?.flooring || 'hardwood',
        ceiling: parsed.materials?.ceiling || undefined,
      },
      furniture: parsed.furniture ? {
        pieces: Array.isArray(parsed.furniture.pieces) ? parsed.furniture.pieces : undefined,
        materials: parsed.furniture.materials || undefined,
        arrangement: parsed.furniture.arrangement || undefined,
      } : undefined,
      decorativeElements: Array.isArray(parsed.decorativeElements) ? parsed.decorativeElements : undefined,
      textures: parsed.textures ? {
        fabrics: parsed.textures.fabrics || undefined,
        wood: parsed.textures.wood || undefined,
        tiles: parsed.textures.tiles || undefined,
        other: parsed.textures.other || undefined,
      } : undefined,
      lightingFixtures: Array.isArray(parsed.lightingFixtures) ? parsed.lightingFixtures : undefined,
      furnitureStyle: parsed.furnitureStyle || 'modern',
      lightingMood: validateLightingMood(parsed.lightingMood),
      styleNotes: parsed.styleNotes || undefined,
    };
  } catch (error) {
    logger.error('Failed to parse moodboard style', {
      roomId: room.roomId,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Validate and normalize lighting mood
 */
function validateLightingMood(mood: string): 'warm' | 'neutral' | 'cool' {
  const normalized = mood?.toLowerCase();
  if (normalized === 'warm' || normalized === 'neutral' || normalized === 'cool') {
    return normalized;
  }
  return 'neutral';
}

// ===========================================
// Default Styles
// ===========================================

/**
 * Get default style for a room based on type
 */
export function getDefaultStyle(room: RoomGeometry): RoomStyle {
  const defaults: Record<string, Partial<RoomStyle>> = {
    LIVING_ROOM: {
      colors: { primary: 'warm beige', secondary: 'cream', accent: 'terracotta' },
      materials: { walls: 'warm white paint', flooring: 'hardwood' },
      furnitureStyle: 'contemporary',
      lightingMood: 'warm',
    },
    BEDROOM: {
      colors: { primary: 'soft gray', secondary: 'white', accent: 'dusty blue' },
      materials: { walls: 'matte finish paint', flooring: 'carpet or hardwood' },
      furnitureStyle: 'modern minimalist',
      lightingMood: 'warm',
    },
    KITCHEN: {
      colors: { primary: 'white', secondary: 'natural wood', accent: 'brass' },
      materials: { walls: 'white subway tile backsplash', flooring: 'tile' },
      furnitureStyle: 'modern functional',
      lightingMood: 'neutral',
    },
    BATHROOM: {
      colors: { primary: 'white', secondary: 'gray', accent: 'chrome' },
      materials: { walls: 'ceramic tile', flooring: 'porcelain tile' },
      furnitureStyle: 'contemporary',
      lightingMood: 'cool',
    },
    DINING: {
      colors: { primary: 'warm white', secondary: 'wood tone', accent: 'green plants' },
      materials: { walls: 'paint with wainscoting', flooring: 'hardwood' },
      furnitureStyle: 'transitional',
      lightingMood: 'warm',
    },
    OFFICE: {
      colors: { primary: 'light gray', secondary: 'white', accent: 'navy' },
      materials: { walls: 'matte paint', flooring: 'hardwood or carpet' },
      furnitureStyle: 'modern professional',
      lightingMood: 'neutral',
    },
  };

  const defaultForType = defaults[room.roomType] || {};

  return {
    roomId: room.roomId,
    roomType: room.roomType,
    colors: defaultForType.colors || {
      primary: 'neutral white',
      secondary: 'light gray',
      accent: 'warm wood',
    },
    materials: defaultForType.materials || {
      walls: 'white paint',
      flooring: 'hardwood',
    },
    furnitureStyle: defaultForType.furnitureStyle || 'modern',
    lightingMood: defaultForType.lightingMood || 'neutral',
  };
}

// ===========================================
// Style Hash Generation
// ===========================================

/**
 * Generate hash of all room styles for change detection
 */
function generateStyleHash(roomStyles: Record<string, RoomStyle>): string {
  const sortedStyles = Object.entries(roomStyles)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, style]) => ({
      id,
      colors: style.colors,
      materials: style.materials,
      furniture: style.furnitureStyle,
    }));

  const hash = createHash('sha256');
  hash.update(JSON.stringify(sortedStyles));
  return hash.digest('hex').substring(0, 16);
}

// ===========================================
// Coherence Notes
// ===========================================

/**
 * Generate notes about style coherence across rooms
 */
function generateCoherenceNotes(roomStyles: Record<string, RoomStyle>): string {
  const styles = Object.values(roomStyles);
  
  // Find dominant colors
  const primaryColors = styles.map(s => s.colors.primary);
  const uniqueColors = [...new Set(primaryColors)];

  // Find dominant furniture style
  const furnitureStyles = styles.map(s => s.furnitureStyle);
  const styleCounts: Record<string, number> = {};
  furnitureStyles.forEach(s => {
    styleCounts[s] = (styleCounts[s] || 0) + 1;
  });
  const dominantStyle = Object.entries(styleCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'mixed';

  return `Floor style: ${dominantStyle} overall. ${uniqueColors.length} unique primary colors used. Maintain visual flow between adjacent rooms.`;
}

// ===========================================
// Style Description Builder
// ===========================================

/**
 * Build text description of room styles for AI prompt
 * 
 * ============================================================
 * ❗ FURNITURE MUST FIT ROOM BOUNDS ❗
 * ❗ NO OVERSIZED ELEMENTS ❗
 * ============================================================
 */
export function buildStyleDescription(styleMap: FloorStyleMap): string {
  const lines: string[] = [];

  lines.push('Room-by-Room Styling (DECORATIVE ONLY - NO STRUCTURAL CHANGES):');
  lines.push('');

  for (const [roomId, style] of Object.entries(styleMap.roomStyles)) {
    lines.push(`${style.roomType} (${roomId}):`);
    lines.push(`  - Wall treatment: ${style.materials.walls}`);
    if (style.materials.ceiling) {
      lines.push(`  - Ceiling: ${style.materials.ceiling}`);
    }
    lines.push(`  - Flooring: ${style.materials.flooring}`);
    lines.push(`  - Color palette: ${style.colors.primary} (primary), ${style.colors.secondary} (secondary), ${style.colors.accent} (accent)`);
    
    // Furniture details
    if (style.furniture) {
      if (style.furniture.pieces && style.furniture.pieces.length > 0) {
        lines.push(`  - Furniture pieces: ${style.furniture.pieces.join(', ')}`);
      }
      if (style.furniture.materials) {
        lines.push(`  - Furniture materials: ${style.furniture.materials}`);
      }
      if (style.furniture.arrangement) {
        lines.push(`  - Furniture arrangement: ${style.furniture.arrangement}`);
      }
    }
    lines.push(`  - Furniture style: ${style.furnitureStyle}`);
    
    // Decorative elements
    if (style.decorativeElements && style.decorativeElements.length > 0) {
      lines.push(`  - Decorative elements: ${style.decorativeElements.join(', ')}`);
    }
    
    // Textures
    if (style.textures) {
      const textureParts: string[] = [];
      if (style.textures.fabrics) textureParts.push(`fabrics: ${style.textures.fabrics}`);
      if (style.textures.wood) textureParts.push(`wood: ${style.textures.wood}`);
      if (style.textures.tiles) textureParts.push(`tiles: ${style.textures.tiles}`);
      if (style.textures.other) textureParts.push(`other: ${style.textures.other}`);
      if (textureParts.length > 0) {
        lines.push(`  - Textures: ${textureParts.join('; ')}`);
      }
    }
    
    // Lighting
    lines.push(`  - Lighting mood: ${style.lightingMood}`);
    if (style.lightingFixtures && style.lightingFixtures.length > 0) {
      lines.push(`  - Lighting fixtures: ${style.lightingFixtures.join(', ')}`);
    }
    
    if (style.styleNotes) {
      lines.push(`  - Style notes: ${style.styleNotes}`);
    }
    lines.push('  - ⚠️ Furniture must fit within room bounds');
    lines.push('');
  }

  if (styleMap.coherenceNotes) {
    lines.push(`Global coherence: ${styleMap.coherenceNotes}`);
  }

  return lines.join('\n');
}

