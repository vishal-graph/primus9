/**
 * TatvaOps Vision - Intent to DesignIntent Mapper
 * 
 * Maps the new structured IntentPayload from the UI forms
 * to the existing DesignIntent format expected by moodboard generation.
 * 
 * ============================================================
 * ❗ DO NOT MODIFY THE DESIGN INTENT FORMAT OR PROMPT LOGIC ❗
 * ============================================================
 * 
 * This is MAPPING ONLY. The actual moodboard generation logic
 * in buildPrompt.ts and generateMoodboard.ts must remain unchanged.
 * 
 * The mapping is explicit and deterministic - no AI inference here.
 */

import { DesignIntent } from '../types';
import { logger } from '../../lib/logger';

// ===========================================
// TYPES - Intent from UI Forms
// ===========================================

/**
 * Intent payload from the new UI forms.
 * This comes from either:
 * - GlobalIntentForm (single theme for entire house)
 * - RoomIntentForm (room-wise themes)
 */
export interface IntentPayload {
  // A. Overall Style Direction
  interiorStyles?: string[];        // multi-select
  mood?: string;                    // dropdown
  culturalInfluence?: string;       // optional dropdown
  inspirationSources?: string[];    // AI-suggested tags

  // B. Color & Material Preferences
  primaryColorPalette?: string;     // dropdown
  secondaryAccents?: string;        // dropdown
  preferredMaterials?: string[];    // multi-select
  textures?: string;                // dropdown

  // C. Furniture & Layout Preferences
  furnitureStyle?: string;          // dropdown
  comfortVsAesthetics?: number;     // slider 0-100
  layoutPreference?: 'open' | 'enclosed' | 'mixed';
  storagePreference?: 'low' | 'medium' | 'high';

  // D. Lighting Preferences
  naturalLightImportance?: number;  // slider 0-100
  artificialLightingStyle?: string; // dropdown
  lightTemperature?: 'warm' | 'neutral' | 'cool';

  // E. Lifestyle & Usage
  householdType?: 'family' | 'couple' | 'bachelor' | 'shared';
  hasKids?: boolean;
  hasElders?: boolean;
  hasPets?: boolean;
  workFromHome?: boolean;
  entertainmentFocus?: 'low' | 'medium' | 'high';

  // F. Budget & Practical Constraints
  budgetRange?: string;             // dropdown
  executionPriority?: 'design' | 'cost' | 'speed';
  maintenanceTolerance?: 'low' | 'medium' | 'high';

  // G. AI Assist Inputs (Optional)
  referenceImageUrls?: string[];
  pinterestLinks?: string[];
  instagramLinks?: string[];
}

/**
 * Room context for single-theme → room mapping.
 */
export interface RoomContext {
  roomId: string;
  roomName: string;
  roomType: string;
  areaEstimate?: number;
  adjacentRooms?: string[];
}

// ===========================================
// MAPPING FUNCTIONS
// ===========================================

/**
 * Map IntentPayload to DesignIntent.
 * 
 * This is the CORE MAPPING function that transforms UI form data
 * into the format expected by buildMoodboardPrompt().
 * 
 * RULES:
 * - Explicit mapping only, no inference
 * - Safe defaults for missing fields
 * - Deterministic output
 * - Preserves semantic meaning
 * 
 * @param intentPayload - UI form data
 * @param roomContext - Room metadata (type, name, etc.)
 * @returns DesignIntent for moodboard generation
 */
export function mapIntentToDesignIntent(
  intentPayload: IntentPayload,
  roomContext: RoomContext
): DesignIntent {
  // === AESTHETIC STYLE ===
  // Combine interior styles with cultural influence
  const aestheticStyle = buildAestheticStyle(intentPayload);

  // === MOOD ===
  // Map dropdown value to descriptive mood
  const themeMood = mapMood(intentPayload.mood, intentPayload);

  // === COLOR PALETTE ===
  // Combine primary palette with accents
  const colorPalette = buildColorPalette(intentPayload);

  // === MATERIALS ===
  const materialPreferences = buildMaterialPreferences(intentPayload);

  // === TEXTURES ===
  const texturePreferences = mapTextures(intentPayload.textures);

  // === FURNITURE ===
  const furniturePreferences = buildFurniturePreferences(intentPayload, roomContext);

  // === DECOR ===
  const decorPreferences = buildDecorPreferences(intentPayload, roomContext);

  // === LIGHTING ===
  const lightingPreferences = buildLightingPreferences(intentPayload);

  // === NOTES ===
  // Additional context from lifestyle/constraints
  const notes = buildNotes(intentPayload, roomContext);

  const designIntent: DesignIntent = {
    roomType: formatRoomType(roomContext.roomType),
    aestheticStyle,
    themeMood,
    colorPalette,
    materialPreferences,
    texturePreferences,
    furniturePreferences,
    decorPreferences,
    lightingPreferences,
    notes,
  };

  logger.debug('Mapped intent to design intent', {
    roomId: roomContext.roomId,
    roomType: designIntent.roomType,
    aestheticStyle: designIntent.aestheticStyle,
  });

  return designIntent;
}

// ===========================================
// FIELD MAPPING HELPERS
// ===========================================

/**
 * Build aesthetic style string from interior styles + cultural influence.
 */
function buildAestheticStyle(intent: IntentPayload): string {
  const parts: string[] = [];

  // Primary styles
  if (intent.interiorStyles && intent.interiorStyles.length > 0) {
    // Convert kebab-case to Title Case
    const formattedStyles = intent.interiorStyles
      .map(s => s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
      .join(', ');
    parts.push(formattedStyles);
  }

  // Cultural influence
  if (intent.culturalInfluence && intent.culturalInfluence !== 'none') {
    const formattedCulture = intent.culturalInfluence
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    parts.push(`with ${formattedCulture} influences`);
  }

  // Fallback
  if (parts.length === 0) {
    return 'Contemporary, Clean-lined';
  }

  return parts.join(' ');
}

/**
 * Map mood dropdown value to descriptive mood string.
 */
function mapMood(mood: string | undefined, intent: IntentPayload): string {
  const moodMap: Record<string, string> = {
    'calm-serene': 'Calm, Serene, Tranquil',
    'warm-cozy': 'Warm, Cozy, Inviting',
    'bright-airy': 'Bright, Airy, Open',
    'elegant-sophisticated': 'Elegant, Sophisticated, Refined',
    'bold-dramatic': 'Bold, Dramatic, Statement-making',
    'playful-vibrant': 'Playful, Vibrant, Energetic',
    'earthy-natural': 'Earthy, Natural, Organic',
    'sleek-modern': 'Sleek, Modern, Streamlined',
    'romantic-soft': 'Romantic, Soft, Delicate',
    'energetic-dynamic': 'Energetic, Dynamic, Lively',
  };

  let baseMood = moodMap[mood || ''] || 'Balanced, Harmonious';

  // Enrich with comfort preference
  if (intent.comfortVsAesthetics !== undefined) {
    if (intent.comfortVsAesthetics < 30) {
      baseMood += ', prioritizing comfort';
    } else if (intent.comfortVsAesthetics > 70) {
      baseMood += ', prioritizing aesthetics';
    }
  }

  return baseMood;
}

/**
 * Build color palette description.
 */
function buildColorPalette(intent: IntentPayload): string {
  const parts: string[] = [];

  // Primary palette
  const paletteMap: Record<string, string> = {
    'neutral-whites': 'Neutral whites, creams, soft ivory',
    'warm-earth-tones': 'Warm earth tones, terracotta, sienna, ochre',
    'cool-grays': 'Cool grays, charcoal, slate, silver',
    'soft-pastels': 'Soft pastels, blush pink, powder blue, mint',
    'bold-jewel-tones': 'Bold jewel tones, emerald, sapphire, ruby',
    'monochrome': 'Monochrome, black and white with gray gradients',
    'navy-gold': 'Navy and gold, deep blue with golden accents',
    'green-natural': 'Green and natural, sage, olive, forest green',
    'terracotta-rust': 'Terracotta and rust, warm burnt orange tones',
    'blush-rose': 'Blush and rose, soft pink, dusty rose',
    'black-white': 'Black and white, high contrast',
    'ocean-blues': 'Ocean blues, aqua, teal, deep sea',
    'forest-green': 'Forest green, deep green, hunter green',
    'sunshine-yellow': 'Sunshine yellow accents, warm golden yellow',
  };

  if (intent.primaryColorPalette) {
    parts.push(paletteMap[intent.primaryColorPalette] || intent.primaryColorPalette);
  }

  // Accent colors
  const accentMap: Record<string, string> = {
    'gold': 'gold and brass accents',
    'silver': 'silver and chrome accents',
    'copper': 'copper and rose gold accents',
    'black': 'matte black accents',
    'navy': 'navy blue accents',
    'emerald': 'emerald green accents',
    'burgundy': 'burgundy accents',
    'mustard': 'mustard yellow accents',
    'coral': 'coral accents',
    'teal': 'teal accents',
    'terracotta': 'terracotta accents',
    'olive': 'olive accents',
    'no-accent': '',
  };

  if (intent.secondaryAccents && intent.secondaryAccents !== 'no-accent') {
    const accentText = accentMap[intent.secondaryAccents];
    if (accentText) {
      parts.push(`with ${accentText}`);
    }
  }

  // Fallback
  if (parts.length === 0) {
    return 'Balanced neutral palette with subtle accents';
  }

  return parts.join(' ');
}

/**
 * Build material preferences string.
 */
function buildMaterialPreferences(intent: IntentPayload): string {
  const materialMap: Record<string, string> = {
    'wood-natural': 'natural wood',
    'wood-engineered': 'engineered wood',
    'marble': 'marble',
    'granite': 'granite',
    'quartz': 'quartz',
    'ceramic': 'ceramic tiles',
    'porcelain': 'porcelain',
    'glass': 'glass',
    'metal': 'metal and steel',
    'concrete': 'concrete',
    'brick': 'exposed brick',
    'leather': 'leather',
    'velvet': 'velvet',
    'linen': 'linen',
    'cotton': 'cotton',
    'jute': 'jute and natural fibers',
    'bamboo': 'bamboo',
    'rattan': 'rattan and cane',
  };

  if (intent.preferredMaterials && intent.preferredMaterials.length > 0) {
    const formattedMaterials = intent.preferredMaterials
      .map(m => materialMap[m] || m)
      .join(', ');
    return formattedMaterials;
  }

  return 'Mixed materials, natural and refined';
}

/**
 * Map texture dropdown value.
 */
function mapTextures(texture: string | undefined): string {
  const textureMap: Record<string, string> = {
    'smooth-polished': 'Smooth and polished surfaces',
    'matte': 'Matte finishes, non-reflective',
    'textured-rough': 'Textured and rough surfaces, tactile',
    'soft-plush': 'Soft and plush fabrics',
    'woven': 'Woven and knitted textures',
    'layered': 'Layered textures, depth and dimension',
    'mixed': 'Mixed textures, variety of surfaces',
    'natural-grain': 'Natural grain, wood and stone patterns',
    'glossy': 'Glossy and shiny finishes',
  };

  return textureMap[texture || ''] || 'Balanced mix of smooth and textured surfaces';
}

/**
 * Build furniture preferences with room context.
 */
function buildFurniturePreferences(intent: IntentPayload, roomContext: RoomContext): string {
  const styleMap: Record<string, string> = {
    'modern-minimal': 'Clean-lined modern furniture, minimal ornamentation',
    'contemporary': 'Contemporary furniture, current design trends',
    'classic-traditional': 'Classic traditional furniture, timeless elegance',
    'mid-century': 'Mid-century modern furniture, retro-inspired pieces',
    'scandinavian': 'Scandinavian furniture, functional and light',
    'industrial': 'Industrial furniture, raw materials, metal frames',
    'rustic': 'Rustic farmhouse furniture, reclaimed wood',
    'bohemian': 'Bohemian furniture, eclectic mix, global influences',
    'art-deco': 'Art deco furniture, geometric shapes, luxurious',
    'transitional': 'Transitional furniture, blend of traditional and modern',
    'indian-ethnic': 'Indian ethnic furniture, carved wood, rich fabrics',
    'luxury': 'Luxury high-end furniture, premium materials',
  };

  const parts: string[] = [];

  // Base style
  if (intent.furnitureStyle) {
    parts.push(styleMap[intent.furnitureStyle] || intent.furnitureStyle);
  }

  // Storage considerations
  if (intent.storagePreference === 'high') {
    parts.push('with integrated storage solutions');
  } else if (intent.storagePreference === 'low') {
    parts.push('minimal storage, open spaces');
  }

  // Room-specific adjustments
  const roomFurniture = getRoomSpecificFurniture(roomContext.roomType);
  if (roomFurniture) {
    parts.push(roomFurniture);
  }

  // Fallback
  if (parts.length === 0) {
    return 'Functional, comfortable furniture suited to the space';
  }

  return parts.join('. ');
}

/**
 * Get room-specific furniture suggestions.
 */
function getRoomSpecificFurniture(roomType: string): string {
  const suggestions: Record<string, string> = {
    LIVING_ROOM: 'Seating arrangement for conversation and relaxation',
    BEDROOM: 'Comfortable bed, nightstands, wardrobe or closet system',
    KITCHEN: 'Efficient work triangle, adequate counter space, storage cabinets',
    BATHROOM: 'Vanity, fixtures, storage for toiletries',
    DINING: 'Dining table with appropriate seating capacity',
    STUDY: 'Desk, ergonomic chair, bookshelves',
    BALCONY: 'Outdoor-suitable furniture, weather-resistant materials',
  };

  return suggestions[roomType] || '';
}

/**
 * Build decor preferences.
 */
function buildDecorPreferences(intent: IntentPayload, roomContext: RoomContext): string {
  const parts: string[] = [];

  // Base decor based on style
  if (intent.interiorStyles?.includes('minimalist')) {
    parts.push('Minimal decor, carefully curated pieces');
  } else if (intent.interiorStyles?.includes('bohemian')) {
    parts.push('Eclectic decor, plants, textiles, collected items');
  } else if (intent.interiorStyles?.includes('modern')) {
    parts.push('Contemporary art, sculptural pieces');
  } else if (intent.interiorStyles?.includes('traditional')) {
    parts.push('Classic decorative elements, framed artwork, traditional accessories');
  } else {
    parts.push('Balanced decorative elements, personal touches');
  }

  // Lifestyle considerations
  if (intent.hasKids) {
    parts.push('child-friendly, durable items');
  }
  if (intent.hasPets) {
    parts.push('pet-friendly materials');
  }
  if (intent.entertainmentFocus === 'high') {
    parts.push('conversation pieces, statement decor');
  }

  return parts.join(', ');
}

/**
 * Build lighting preferences.
 */
function buildLightingPreferences(intent: IntentPayload): string {
  const parts: string[] = [];

  // Natural light
  if (intent.naturalLightImportance !== undefined) {
    if (intent.naturalLightImportance > 70) {
      parts.push('Maximize natural light, large windows, light-filtering treatments');
    } else if (intent.naturalLightImportance < 30) {
      parts.push('Controlled natural light, privacy considerations');
    }
  }

  // Artificial lighting style
  const lightingMap: Record<string, string> = {
    'ambient': 'Soft ambient lighting, general illumination',
    'task': 'Task-focused lighting, directed light sources',
    'accent': 'Accent lighting, highlighting features and artwork',
    'layered': 'Layered lighting, multiple sources at different heights',
    'statement': 'Statement light fixtures, chandeliers, pendants',
    'recessed': 'Recessed lighting, clean ceiling lines',
    'natural-focus': 'Natural light as primary source, supplemental artificial',
    'dramatic': 'Dramatic lighting, spotlights, high contrast',
    'smart': 'Smart lighting, adjustable color temperature and intensity',
  };

  if (intent.artificialLightingStyle) {
    parts.push(lightingMap[intent.artificialLightingStyle] || intent.artificialLightingStyle);
  }

  // Light temperature
  const tempMap: Record<string, string> = {
    'warm': 'warm white lighting (2700K-3000K)',
    'neutral': 'neutral white lighting (3500K-4000K)',
    'cool': 'cool white lighting (4500K-5500K)',
  };
  
  if (intent.lightTemperature) {
    parts.push(tempMap[intent.lightTemperature] || intent.lightTemperature);
  }

  // Fallback
  if (parts.length === 0) {
    return 'Balanced natural and artificial lighting';
  }

  return parts.join('. ');
}

/**
 * Build notes field with additional context.
 */
function buildNotes(intent: IntentPayload, roomContext: RoomContext): string {
  const notes: string[] = [];

  // Layout preference
  if (intent.layoutPreference === 'open') {
    notes.push('Open floor plan preferred');
  } else if (intent.layoutPreference === 'enclosed') {
    notes.push('Defined, enclosed spaces preferred');
  }

  // Lifestyle notes
  if (intent.workFromHome) {
    notes.push('Work-from-home considerations');
  }
  if (intent.hasElders) {
    notes.push('Accessibility considerations for elderly');
  }

  // Budget context (high level only)
  if (intent.budgetRange === 'budget' || intent.budgetRange === 'moderate') {
    notes.push('Cost-effective solutions preferred');
  } else if (intent.budgetRange === 'luxury' || intent.budgetRange === 'ultra-luxury') {
    notes.push('Premium materials and finishes');
  }

  // Maintenance
  if (intent.maintenanceTolerance === 'low') {
    notes.push('Low-maintenance materials preferred');
  }

  // Room area context
  if (roomContext.areaEstimate) {
    if (roomContext.areaEstimate < 100) {
      notes.push('Compact space, maximize functionality');
    } else if (roomContext.areaEstimate > 300) {
      notes.push('Large space, consider zones and focal points');
    }
  }

  return notes.join('. ');
}

/**
 * Format room type for prompt (convert enum to readable).
 */
function formatRoomType(roomType: string): string {
  const typeMap: Record<string, string> = {
    LIVING_ROOM: 'Living Room',
    BEDROOM: 'Bedroom',
    KITCHEN: 'Kitchen',
    BATHROOM: 'Bathroom',
    TOILET: 'Toilet',
    DINING: 'Dining Room',
    BALCONY: 'Balcony / Outdoor',
    UTILITY: 'Utility Room',
    STORE: 'Storage Room',
    STUDY: 'Study / Home Office',
    PUJA: 'Puja Room',
    PASSAGE: 'Passage / Hallway',
    STAIRCASE: 'Staircase',
    LOBBY: 'Lobby / Entrance',
    FOYER: 'Foyer',
    GARAGE: 'Garage',
    UNCLASSIFIED: 'Room',
  };

  return typeMap[roomType] || roomType.replace(/_/g, ' ');
}

// ===========================================
// VALIDATION
// ===========================================

/**
 * Validate that mapped DesignIntent is complete enough for generation.
 */
export function validateMappedIntent(intent: DesignIntent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!intent.roomType || intent.roomType.trim() === '') {
    errors.push('roomType is required');
  }
  if (!intent.aestheticStyle || intent.aestheticStyle.trim() === '') {
    errors.push('aestheticStyle is required');
  }
  if (!intent.themeMood || intent.themeMood.trim() === '') {
    errors.push('themeMood is required');
  }
  if (!intent.colorPalette || intent.colorPalette.trim() === '') {
    errors.push('colorPalette is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===========================================
// EXPORTS
// ===========================================

// Re-export mapIntentToDesignIntent with alias for backward compatibility
export { mapIntentToDesignIntent as mapIntentToMoodboardInput };
// validateMappedIntent is already exported inline above

