/**
 * TatvaOps Vision - Intent Graph to IntentPayload Mapper
 * 
 * Maps Intent Graph (from Sense Layer) to IntentPayload format
 * that the existing moodboard intentMapper can consume.
 * 
 * This bridges AI-inferred intent to the existing moodboard generation system.
 */

import { InferredIntent } from './responseParser';
import { IntentPayload } from '../moodboard/intentMapper';
import { logger } from '../../lib/logger';

/**
 * Map Intent Graph to IntentPayload format
 * 
 * Transforms Sense Layer output (AI-inferred) → UI form format (IntentPayload)
 * which then gets mapped to DesignIntent by the existing intentMapper.
 * 
 * Flow:
 * Sense AI → InferredIntent → IntentPayload → DesignIntent → Moodboard
 */
export function mapIntentGraphToIntentPayload(
  inferred: InferredIntent
): IntentPayload {
  logger.debug('Mapping Intent Graph to IntentPayload', {
    spaceType: inferred.spaceType,
    confidence: inferred.confidence,
  });

  // Map style signals to interior styles
  const interiorStyles = inferInteriorStyles(inferred);

  // Map warmth and mood
  const mood = inferMood(inferred);

  // Map color palette
  const primaryColorPalette = inferPrimaryColorPalette(inferred);
  const secondaryAccents = inferSecondaryAccents(inferred);

  // Map materials
  const preferredMaterials = inferred.componentPreferences.materials;

  // Map textures
  const textures = inferTextures(inferred);

  // Map furniture
  const furnitureStyle = inferFurnitureStyle(inferred);

  // Map lighting
  const artificialLightingStyle = inferLightingStyle(inferred);
  const lightTemperature = inferLightTemperature(inferred);

  // Map lifestyle signals
  const lifestyle = inferred.lifestyleSignals || {};

  const intentPayload: IntentPayload = {
    interiorStyles,
    mood,
    primaryColorPalette,
    secondaryAccents,
    preferredMaterials,
    textures,
    furnitureStyle,
    artificialLightingStyle,
    lightTemperature,
    // Lifestyle signals
    hasKids: lifestyle.hasKids || false,
    hasPets: lifestyle.hasPets || false,
    workFromHome: lifestyle.workFromHome || false,
    hasElders: lifestyle.hasElders || false,
    entertainmentFocus: lifestyle.entertainmentFocus || 'medium',
    // Default values for optional fields
    comfortVsAesthetics: 50, // Balanced
    layoutPreference: 'mixed',
    storagePreference: 'medium',
    budgetRange: 'moderate',
    maintenanceTolerance: 'medium',
  };

  logger.debug('Intent Graph mapped successfully', {
    interiorStyles: intentPayload.interiorStyles,
    mood: intentPayload.mood,
  });

  return intentPayload;
}

// ============================================
// MAPPING HELPERS
// ============================================

/**
 * Infer interior styles from style signals
 */
function inferInteriorStyles(inferred: InferredIntent): string[] {
  const styles: string[] = [];

  const { era, visualDensity } = inferred.styleSignals;

  // Map era to style keywords
  if (era) {
    const eraMap: Record<string, string> = {
      contemporary: 'contemporary',
      modern: 'modern',
      traditional: 'traditional',
      'mid-century': 'mid-century',
      industrial: 'industrial',
      scandinavian: 'scandinavian',
      minimalist: 'minimalist',
      bohemian: 'bohemian',
      rustic: 'rustic',
    };

    const mappedStyle = eraMap[era.toLowerCase()];
    if (mappedStyle) {
      styles.push(mappedStyle);
    }
  }

  // Add style based on visual density
  if (visualDensity === 'sparse') {
    if (!styles.includes('minimalist')) {
      styles.push('minimalist');
    }
  } else if (visualDensity === 'dense') {
    if (!styles.includes('maximalist')) {
      styles.push('eclectic');
    }
  }

  // Default if no styles inferred
  if (styles.length === 0) {
    styles.push('contemporary');
  }

  return styles;
}

/**
 * Infer mood from style signals
 */
function inferMood(inferred: InferredIntent): string {
  const { warmth, visualDensity } = inferred.styleSignals;

  // Map warmth + density to mood
  if (warmth === 'high') {
    return visualDensity === 'sparse' ? 'warm-cozy' : 'warm-cozy';
  } else if (warmth === 'low') {
    return visualDensity === 'sparse' ? 'sleek-modern' : 'elegant-sophisticated';
  } else {
    // Medium warmth
    return visualDensity === 'dense' ? 'playful-vibrant' : 'calm-serene';
  }
}

/**
 * Infer primary color palette
 */
function inferPrimaryColorPalette(inferred: InferredIntent): string {
  const { colorPalette } = inferred.styleSignals;

  // Try to match dominant colors to predefined palettes
  const colorsLower = colorPalette.map((c) => c.toLowerCase());

  // Check for neutral whites
  if (colorsLower.some((c) => c.includes('white') || c.includes('cream') || c.includes('ivory'))) {
    return 'neutral-whites';
  }

  // Check for earth tones
  if (colorsLower.some((c) => c.includes('beige') || c.includes('terracotta') || c.includes('wood'))) {
    return 'warm-earth-tones';
  }

  // Check for grays
  if (colorsLower.some((c) => c.includes('gray') || c.includes('grey') || c.includes('charcoal'))) {
    return 'cool-grays';
  }

  // Check for greens
  if (colorsLower.some((c) => c.includes('green') || c.includes('sage') || c.includes('olive'))) {
    return 'green-natural';
  }

  // Check for blues
  if (colorsLower.some((c) => c.includes('blue') || c.includes('navy') || c.includes('teal'))) {
    return 'ocean-blues';
  }

  // Default to neutral
  return 'neutral-whites';
}

/**
 * Infer secondary accents
 */
function inferSecondaryAccents(inferred: InferredIntent): string {
  const { colorPalette } = inferred.styleSignals;

  // Look for accent colors
  const colorsLower = colorPalette.map((c) => c.toLowerCase());

  if (colorsLower.some((c) => c.includes('gold') || c.includes('brass'))) {
    return 'gold';
  }

  if (colorsLower.some((c) => c.includes('black'))) {
    return 'black';
  }

  if (colorsLower.some((c) => c.includes('navy'))) {
    return 'navy';
  }

  if (colorsLower.some((c) => c.includes('emerald') || c.includes('forest'))) {
    return 'emerald';
  }

  // Default to no specific accent
  return 'no-accent';
}

/**
 * Infer textures
 */
function inferTextures(inferred: InferredIntent): string {
  const { visualDensity } = inferred.styleSignals;

  // Map visual density to texture preference
  if (visualDensity === 'sparse') {
    return 'smooth-polished';
  } else if (visualDensity === 'dense') {
    return 'layered';
  } else {
    return 'mixed';
  }
}

/**
 * Infer furniture style
 */
function inferFurnitureStyle(inferred: InferredIntent): string {
  const { furniture } = inferred.componentPreferences;

  // Check furniture keywords
  const furnitureLower = furniture.map((f) => f.toLowerCase());

  if (furnitureLower.some((f) => f.includes('modern') || f.includes('contemporary'))) {
    return 'modern-minimal';
  }

  if (furnitureLower.some((f) => f.includes('traditional') || f.includes('classic'))) {
    return 'classic-traditional';
  }

  if (furnitureLower.some((f) => f.includes('mid-century'))) {
    return 'mid-century';
  }

  if (furnitureLower.some((f) => f.includes('industrial'))) {
    return 'industrial';
  }

  if (furnitureLower.some((f) => f.includes('scandinavian'))) {
    return 'scandinavian';
  }

  // Default
  return 'contemporary';
}

/**
 * Infer lighting style
 */
function inferLightingStyle(inferred: InferredIntent): string {
  const { lighting } = inferred.componentPreferences;

  const lightingLower = lighting.toLowerCase();

  if (lightingLower.includes('indirect')) {
    return 'ambient';
  }

  if (lightingLower.includes('layered')) {
    return 'layered';
  }

  if (lightingLower.includes('statement') || lightingLower.includes('chandelier')) {
    return 'statement';
  }

  if (lightingLower.includes('natural')) {
    return 'natural-focus';
  }

  // Default
  return 'layered';
}

/**
 * Infer light temperature
 */
function inferLightTemperature(inferred: InferredIntent): 'warm' | 'neutral' | 'cool' {
  const { warmth } = inferred.styleSignals;

  if (warmth === 'high') {
    return 'warm';
  } else if (warmth === 'low') {
    return 'cool';
  } else {
    return 'neutral';
  }
}
