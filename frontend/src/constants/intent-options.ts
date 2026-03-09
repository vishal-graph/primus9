/**
 * TatvaOps Vision - Intent Form Options
 * 
 * Controlled vocabulary for all intent form dropdowns
 * These options ensure consistent AI prompt generation
 */

// ============================================
// A. OVERALL STYLE DIRECTION
// ============================================

export const INTERIOR_STYLES = [
  { value: 'modern', label: 'Modern' },
  { value: 'contemporary', label: 'Contemporary' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'scandinavian', label: 'Scandinavian' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mid-century-modern', label: 'Mid-Century Modern' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'transitional', label: 'Transitional' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'coastal', label: 'Coastal' },
  { value: 'farmhouse', label: 'Farmhouse' },
  { value: 'rustic', label: 'Rustic' },
  { value: 'art-deco', label: 'Art Deco' },
  { value: 'japanese', label: 'Japanese/Zen' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'indian-contemporary', label: 'Indian Contemporary' },
  { value: 'indian-traditional', label: 'Indian Traditional' },
  { value: 'luxury', label: 'Luxury/Glam' },
  { value: 'eclectic', label: 'Eclectic' },
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

export const CULTURAL_INFLUENCES = [
  { value: 'none', label: 'No specific influence' },
  { value: 'indian', label: 'Indian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'moroccan', label: 'Moroccan' },
  { value: 'scandinavian', label: 'Scandinavian' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'african', label: 'African' },
  { value: 'south-american', label: 'South American' },
  { value: 'middle-eastern', label: 'Middle Eastern' },
  { value: 'european-classic', label: 'European Classic' },
  { value: 'american-traditional', label: 'American Traditional' },
];

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

export const BUDGET_RANGES = [
  { value: 'budget', label: 'Budget-Friendly (Under ₹5L)' },
  { value: 'moderate', label: 'Moderate (₹5L - ₹15L)' },
  { value: 'premium', label: 'Premium (₹15L - ₹30L)' },
  { value: 'luxury', label: 'Luxury (₹30L - ₹50L)' },
  { value: 'ultra-luxury', label: 'Ultra Luxury (₹50L+)' },
  { value: 'not-specified', label: 'Prefer not to specify' },
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

