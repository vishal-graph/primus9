/**
 * TatvaOps Vision - Intent Form Options
 * 
 * Controlled vocabulary for all intent form dropdowns
 * These options ensure consistent AI prompt generation
 */

// ============================================
// A. OVERALL STYLE DIRECTION
// ============================================

/** Interior style direction: 4 regional/cultural categories for prompt creation */
export const INTERIOR_STYLES = [
  {
    value: 'indian-traditional',
    label: 'Indian',
    description: 'Kerala, Jammu, Rajasthani, Indian contemporary, Indian modern, etc.',
  },
  {
    value: 'western',
    label: 'Western',
    description: 'US, Latin & European',
  },
  {
    value: 'middle-eastern',
    label: 'Middle Eastern',
    description: 'Turkey, Morocco, Monaco, Dubai, Qatar, etc.',
  },
  {
    value: 'eastern',
    label: 'Eastern',
    description: 'Japanese, Chinese, etc.',
  },
];

export const MOOD_OPTIONS = [
  { value: 'calm-serene', label: 'Calm & Serene' },
  { value: 'warm-cozy', label: 'Warm & Cozy' },
  { value: 'bright-airy', label: 'Bright & Airy' },
  { value: 'elegant-sophisticated', label: 'Elegant & Sophisticated' },
  { value: 'bold-dramatic', label: 'Bold & Dramatic' },
  { value: 'playful-vibrant', label: 'Playful & Vibrant' },
  { value: 'earthy-natural', label: 'Earthy & Natural' },
  { value: 'sleek-modern', label: 'Sleek & Modern' },
  { value: 'romantic-soft', label: 'Romantic & Soft' },
  { value: 'energetic-dynamic', label: 'Energetic & Dynamic' },
];

/** Sub-categories under each of the 4 interior styles (replaces Cultural Influence) */
export const INTERIOR_STYLE_SUBCATEGORIES: Record<string, Array<{ value: string; label: string }>> = {
  'indian-traditional': [
    { value: 'kerala', label: 'Kerala' },
    { value: 'goan', label: 'Goan' },
    { value: 'rajasthani', label: 'Rajasthani' },
    { value: 'indian-contemporary', label: 'Indian Contemporary' },
    { value: 'indian-modern', label: 'Indian Modern' },
    { value: 'jammu', label: 'Jammu / North Indian' },
    { value: 'bengali', label: 'Bengali' },
    { value: 'gujarati', label: 'Gujarati' },
    { value: 'south-indian', label: 'South Indian (generic)' },
  ],
  western: [
    { value: 'us', label: 'US' },
    { value: 'latin-american', label: 'Latin American' },
    { value: 'european', label: 'European' },
    { value: 'scandinavian', label: 'Scandinavian' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'french', label: 'French' },
    { value: 'italian', label: 'Italian' },
  ],
  'middle-eastern': [
    { value: 'turkish', label: 'Turkish' },
    { value: 'moroccan', label: 'Moroccan' },
    { value: 'arabian', label: 'Arabian (Dubai, Qatar)' },
    { value: 'monaco', label: 'Monaco' },
  ],
  eastern: [
    { value: 'japanese', label: 'Japanese' },
    { value: 'chinese', label: 'Chinese' },
    { value: 'zen', label: 'Zen / Minimal Eastern' },
  ],
};

// ============================================
// B. COLOR & MATERIAL PREFERENCES
// ============================================

export const COLOR_PALETTES = [
  { value: 'neutral-whites', label: 'Neutral Whites & Creams' },
  { value: 'warm-earth-tones', label: 'Warm Earth Tones' },
  { value: 'cool-grays', label: 'Cool Grays' },
  { value: 'soft-pastels', label: 'Soft Pastels' },
  { value: 'bold-jewel-tones', label: 'Bold Jewel Tones' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'navy-gold', label: 'Navy & Gold' },
  { value: 'green-natural', label: 'Green & Natural' },
  { value: 'terracotta-rust', label: 'Terracotta & Rust' },
  { value: 'blush-rose', label: 'Blush & Rose' },
  { value: 'black-white', label: 'Black & White' },
  { value: 'ocean-blues', label: 'Ocean Blues' },
  { value: 'forest-green', label: 'Forest Green' },
  { value: 'sunshine-yellow', label: 'Sunshine Yellow Accents' },
];

export const ACCENT_COLORS = [
  { value: 'gold', label: 'Gold/Brass' },
  { value: 'silver', label: 'Silver/Chrome' },
  { value: 'copper', label: 'Copper/Rose Gold' },
  { value: 'black', label: 'Matte Black' },
  { value: 'navy', label: 'Navy Blue' },
  { value: 'emerald', label: 'Emerald Green' },
  { value: 'burgundy', label: 'Burgundy' },
  { value: 'mustard', label: 'Mustard Yellow' },
  { value: 'coral', label: 'Coral' },
  { value: 'teal', label: 'Teal' },
  { value: 'terracotta', label: 'Terracotta' },
  { value: 'olive', label: 'Olive' },
  { value: 'no-accent', label: 'Minimal/No Accents' },
];

export const MATERIALS = [
  { value: 'wood-natural', label: 'Natural Wood' },
  { value: 'wood-engineered', label: 'Engineered Wood' },
  { value: 'marble', label: 'Marble' },
  { value: 'granite', label: 'Granite' },
  { value: 'quartz', label: 'Quartz' },
  { value: 'ceramic', label: 'Ceramic Tiles' },
  { value: 'porcelain', label: 'Porcelain' },
  { value: 'glass', label: 'Glass' },
  { value: 'metal', label: 'Metal/Steel' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'brick', label: 'Exposed Brick' },
  { value: 'leather', label: 'Leather' },
  { value: 'velvet', label: 'Velvet' },
  { value: 'linen', label: 'Linen' },
  { value: 'cotton', label: 'Cotton' },
  { value: 'jute', label: 'Jute/Natural Fiber' },
  { value: 'bamboo', label: 'Bamboo' },
  { value: 'rattan', label: 'Rattan/Cane' },
];

export const TEXTURES = [
  { value: 'smooth-polished', label: 'Smooth & Polished' },
  { value: 'matte', label: 'Matte Finish' },
  { value: 'textured-rough', label: 'Textured & Rough' },
  { value: 'soft-plush', label: 'Soft & Plush' },
  { value: 'woven', label: 'Woven & Knitted' },
  { value: 'layered', label: 'Layered Textures' },
  { value: 'mixed', label: 'Mixed Textures' },
  { value: 'natural-grain', label: 'Natural Grain' },
  { value: 'glossy', label: 'Glossy/Shiny' },
];

// ============================================
// C. FURNITURE & LAYOUT PREFERENCES
// ============================================

export const FURNITURE_STYLES = [
  { value: 'modern-minimal', label: 'Modern Minimal' },
  { value: 'contemporary', label: 'Contemporary' },
  { value: 'classic-traditional', label: 'Classic Traditional' },
  { value: 'mid-century', label: 'Mid-Century' },
  { value: 'scandinavian', label: 'Scandinavian' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'rustic', label: 'Rustic/Farmhouse' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'art-deco', label: 'Art Deco' },
  { value: 'transitional', label: 'Transitional' },
  { value: 'indian-ethnic', label: 'Indian/Ethnic' },
  { value: 'luxury', label: 'Luxury/High-End' },
];

export const LAYOUT_PREFERENCES = [
  { value: 'open', label: 'Open & Flowing' },
  { value: 'enclosed', label: 'Defined & Enclosed' },
  { value: 'mixed', label: 'Mixed/Flexible' },
];

export const STORAGE_PREFERENCES = [
  { value: 'low', label: 'Minimal (Less furniture)' },
  { value: 'medium', label: 'Moderate (Balanced)' },
  { value: 'high', label: 'Maximum (Lots of storage)' },
];

// ============================================
// D. LIGHTING PREFERENCES
// ============================================

export const LIGHTING_STYLES = [
  { value: 'ambient', label: 'Ambient/Diffused' },
  { value: 'task', label: 'Task-Focused' },
  { value: 'accent', label: 'Accent Lighting' },
  { value: 'layered', label: 'Layered (Multiple sources)' },
  { value: 'statement', label: 'Statement Fixtures' },
  { value: 'recessed', label: 'Recessed/Hidden' },
  { value: 'natural-focus', label: 'Natural Light Focus' },
  { value: 'dramatic', label: 'Dramatic/Spotlights' },
  { value: 'smart', label: 'Smart/Adjustable' },
];

export const LIGHT_TEMPERATURE = [
  { value: 'warm', label: 'Warm (2700K-3000K)' },
  { value: 'neutral', label: 'Neutral (3500K-4000K)' },
  { value: 'cool', label: 'Cool (4500K-5500K)' },
];

// ============================================
// E. LIFESTYLE & USAGE
// ============================================

export const HOUSEHOLD_TYPES = [
  { value: 'family', label: 'Family with children' },
  { value: 'couple', label: 'Couple' },
  { value: 'bachelor', label: 'Single/Bachelor' },
  { value: 'shared', label: 'Shared/Roommates' },
];

export const ENTERTAINMENT_FOCUS = [
  { value: 'low', label: 'Private/Minimal guests' },
  { value: 'medium', label: 'Occasional entertaining' },
  { value: 'high', label: 'Frequent entertaining' },
];

// ============================================
// F. BUDGET & PRACTICAL CONSTRAINTS
// ============================================

/** Budget tiers only; auto-set from floor plan BHK (≤2 → budget, 3 → moderate, 4+ → luxury) */
export const BUDGET_RANGES = [
  { value: 'budget', label: 'Budget-Friendly (Under ₹5L)' },
  { value: 'moderate', label: 'Moderate (₹5L – ₹15L)' },
  { value: 'luxury', label: 'Luxury (₹15L+)' },
];

export const EXECUTION_PRIORITIES = [
  { value: 'design', label: 'Design Quality First' },
  { value: 'cost', label: 'Cost Optimization First' },
  { value: 'speed', label: 'Speed/Timeline First' },
];

export const MAINTENANCE_TOLERANCE = [
  { value: 'low', label: 'Low (Easy to maintain)' },
  { value: 'medium', label: 'Medium (Some upkeep okay)' },
  { value: 'high', label: 'High (Can invest in maintenance)' },
];

// ============================================
// ROOM-SPECIFIC DEFAULTS
// ============================================

export const ROOM_TYPE_DEFAULTS: Record<string, Partial<{
  mood: string;
  lightingStyle: string;
  storagePreference: string;
}>> = {
  LIVING_ROOM: {
    mood: 'warm-cozy',
    lightingStyle: 'layered',
    storagePreference: 'medium',
  },
  BEDROOM: {
    mood: 'calm-serene',
    lightingStyle: 'ambient',
    storagePreference: 'high',
  },
  KITCHEN: {
    mood: 'bright-airy',
    lightingStyle: 'task',
    storagePreference: 'high',
  },
  BATHROOM: {
    mood: 'calm-serene',
    lightingStyle: 'ambient',
    storagePreference: 'medium',
  },
  DINING: {
    mood: 'elegant-sophisticated',
    lightingStyle: 'statement',
    storagePreference: 'low',
  },
  STUDY: {
    mood: 'calm-serene',
    lightingStyle: 'task',
    storagePreference: 'high',
  },
  BALCONY: {
    mood: 'earthy-natural',
    lightingStyle: 'ambient',
    storagePreference: 'low',
  },
};

// ============================================
// HELPER FUNCTION
// ============================================

export function getOptionLabel(
  options: Array<{ value: string; label: string }>,
  value: string
): string {
  return options.find((opt) => opt.value === value)?.label || value;
}

