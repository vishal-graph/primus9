/**
 * TatvaOps Vision - Moodboard Prompt Builder
 * 
 * Builds the detailed collage prompt for Gemini image generation.
 * 
 * CRITICAL: This is the exact prompt logic from moodboard-main.
 * DO NOT modify unless absolutely necessary for async execution.
 * The quality of generated moodboards depends on this prompt structure.
 * 
 * Source: moodboard-main/app/api/moodboard/route.ts lines 55-107
 */

import { DesignIntent, RegenerationOverrides } from '../types';
import { createHash } from 'crypto';
import { getRoomContext } from '../common/roomContext';

// ===========================================
// Prompt Building
// ===========================================

/**
 * Merge design intent with regeneration overrides.
 * 
 * PRESERVED BEHAVIOR: Non-null override values replace original values.
 * This is critical for consistent regeneration across the platform.
 * 
 * FROM: moodboard-main regeneration handling
 */
export function applyRegenerationOverrides(
  intent: DesignIntent,
  overrides?: RegenerationOverrides
): DesignIntent {
  if (!overrides) {
    return intent;
  }

  return {
    roomType: intent.roomType,
    aestheticStyle: overrides.style ?? intent.aestheticStyle,
    themeMood: overrides.mood ?? intent.themeMood,
    colorPalette: overrides.colorPalette ?? intent.colorPalette,
    materialPreferences: overrides.materials ?? intent.materialPreferences,
    texturePreferences: overrides.textures ?? intent.texturePreferences,
    furniturePreferences: overrides.furniture ?? intent.furniturePreferences,
    decorPreferences: overrides.decor ?? intent.decorPreferences,
    lightingPreferences: overrides.lighting ?? intent.lightingPreferences,
    notes: overrides.notes ?? intent.notes,
    budget: overrides.budget ?? intent.budget,
    maintenanceTolerance: overrides.maintenanceTolerance ?? intent.maintenanceTolerance,
    executionPriority: overrides.executionPriority ?? intent.executionPriority,
  };
}

/**
 * Design priority line by budget: must-haves first for Economy, balance for Standard, aesthetics lead for Premium.
 */
function getDesignPriorityLine(budget?: string): string {
  const b = (budget || '').toLowerCase();
  if (b === 'economy') {
    return 'Design priority: Must-haves first (functionality, durability, easy maintenance, essential elements); aesthetics within these constraints.';
  }
  if (b === 'standard') {
    return 'Design priority: Balance must-haves and aesthetics.';
  }
  if (b === 'premium') {
    return 'Design priority: Aesthetics and premium materials can lead; include statement pieces and refined finishes.';
  }
  return '';
}

/**
 * Build the moodboard generation prompt.
 * 
 * CRITICAL: This is the EXACT prompt from moodboard-main.
 * The prompt structure, wording, and ordering are intentional.
 * Any changes may affect moodboard quality.
 * 
 * PRESERVED FROM: moodboard-main/app/api/moodboard/route.ts lines 55-107
 * 
 * @param intent - Design parameters (optionally with overrides applied)
 * @param options.catalogSection - Optional Supabase catalog block (injected after intent, before layout).
 * @returns The complete prompt string
 */
export function buildMoodboardPrompt(
  intent: DesignIntent,
  options?: { catalogSection?: string }
): string {
  const catalogTrimmed = options?.catalogSection?.trim();
  const catalogPrefix = catalogTrimmed ? ['', catalogTrimmed, ''] : [];

  // PRESERVED: Exact prompt structure from moodboard-main
  // Lines 56-105 from moodboard-main/app/api/moodboard/route.ts
  const promptLines = [
    'Create a high-resolution interior design moodboard in a dense collage style with overlapping images, torn paper edges, pinned swatches, taped corners, textured backgrounds, and no empty space. Use the following extracted design inputs:',
    'CRITICAL: Generate exclusively within an authentic, practical Indian residential context. Adhere STRICTLY to the following demographic and architectural rules:',
    '1. MATERIALS & FINISHES: Use practical Indian surfaces like vitrified tiles, Kota stone, marble, terrazzo, or teak/sheesham wood. Avoid wall-to-wall carpeting, distressed rustic farmhouse wood, or faux-brick walls.',
    '2. TROPICAL CLIMATE: Ensure spaces look adapted for Indian climates (e.g., cross-ventilation, ceiling fans, or sheer curtains). **If windows are shown**, they must include practical elements like security grills. Avoid fireplaces, heavy velvet drapes, or thick woolen rugs.',
    '3. DEMOGRAPHIC USAGE: If Hall/Living, emphasize communal seating (diwans, large sofas), prominent TV units, and integrated Pooja/Mandir spaces. If Kitchen, ensure heavy-duty wet areas, deep sinks, and extensive closed lofts for spices. If Bathroom, mandate wet/dry separation (slope/glass), health faucets (bidet sprays), and anti-skid tiles. If Balcony, include drying racks or jhoolas (swings).',
    '4. AESTHETICS: Avoid Euro-American centric decor. Lean into Indian crafts, handwoven textiles (Ikat, block prints), jali partition screens, brass accents, and terracotta decor where appropriate.',
    '5. INDIAN HOME USAGE: Reflect how Indian homes are used: multi-use spaces, TV as focal point in living areas, Pooja/Mandir integration, kitchen as high-use zone with storage for Indian cooking, balcony/utility for drying clothes, and multi-generational use where relevant.',
    '6. MAINTENANCE: Use materials and finishes that are easy to maintain in Indian conditions (dust, humidity, frequent cleaning). Avoid high-maintenance or delicate options; prefer wipeable, durable surfaces that Indian homeowners can maintain easily.',
    getRoomContext(intent),
    '',
    // Design parameters
    `Room Type: ${intent.roomType}`,
    `Aesthetic Style: ${intent.aestheticStyle}`,
    `Theme / Mood: ${intent.themeMood}`,
    `Color Palette: ${intent.colorPalette}`,
    `Materials: ${intent.materialPreferences}`,
    `Textures: ${intent.texturePreferences}`,
    `Furniture: ${intent.furniturePreferences}`,
    `Decor: ${intent.decorPreferences}`,
    `Lighting: ${intent.lightingPreferences}`,
    intent.notes ? `Notes: ${intent.notes}` : '',
    getDesignPriorityLine(intent.budget),
    'APPLY EVERYTHING: The Indian context, budget priority, and usage/maintenance rules above are mandatory and set the overall priority—but do NOT neglect or overlook any design component. You MUST fully apply ALL of the following from the user intent: furniture, lighting, materials, color palette, textures, decor, and theme/mood. Every component listed in this prompt must be reflected in the moodboard; the top rules are the framework, and all other parameters are required.',
    '',
    ...catalogPrefix,
    // Layout instructions
    'Arrange fabric swatches, material tiles, inspiration photos, lighting samples, sketches, and palette strips in a cohesive, magazine-style moodboard layout. Use soft shadows and overlapping composition to match high-end interior design collage boards.',
    '',
    // Density instructions
    'Create a tightly packed, high-resolution interior design moodboard with NO empty space and a fully overlapping collage layout.',
    'Ensure every element—photos, material samples, fabric swatches, color palette strips, lighting references, decor items, sketches, and annotations—is arranged closely together with natural overlap.',
    'Use tape pieces, pins, torn-paper edges, soft shadows, and layered textures to achieve an authentic designer collage aesthetic.',
    'Avoid placing objects separately or floating; instead, make items touch, overlap, or cluster organically. Fill the entire canvas so there are ZERO blank gaps or unused areas.',
    'The background should be warm, soft, textured paper.',
    '',
    // Style and typography instructions
    'Use: torn paper edges, taped corners, fabric swatches, material tiles, color palette strips, clear and sharp labels, small caption tags near key items, soft shadows, aesthetic layering, and editorial layout styling. All text and labels must be high-resolution, **very sharp and readable**, with solid high-contrast fonts (no cursive scribbles, no faux handwriting, no blur). Make all text at least medium size so it is legible even when the image is scaled down. Do NOT display objects isolated on white; always embed them into a collage composition. Avoid large empty spaces; fill the canvas with a balanced, natural collage.',
    '',
    // Room type enforcement
    intent.roomType
      ? `Room type for this moodboard: "${intent.roomType}". Only show this room type. For example, if the room type is "Balcony / Outdoor", the entire moodboard must clearly depict balcony / outdoor scenes and elements. Do NOT show unrelated interior room types like living rooms, dining rooms, or bedrooms.`
      : '',
    // Style heading
    intent.aestheticStyle
      ? `Moodboard Style (heading text on the moodboard): "${intent.aestheticStyle}". Place this style name as a clear, elegant heading on the moodboard (similar to a magazine title), e.g. top-left or top-center, integrated with the collage design.`
      : '',
    '',
    // Required elements
    'Include:',
    '- Color palette section',
    '- Fabric swatches section',
    '- 2–4 room inspiration photos',
    '- Material tiles (stone, wood, metal)',
    '- Key furniture elements',
    '- Lighting samples',
    '- Sketch / line drawing element',
    '- Labels or annotations for each key element (colors, fabrics, materials, furniture, lighting) using neat, consistent, high-contrast typography (simple sans-serif or minimal serif), not decorative cursive. Text must be **pin-sharp**, not fuzzy or pixelated.',
    '- 2–4 short summary text blocks placed inside the collage (for example, describing the overall mood, key design goals, or styling notes). These summaries should be only 1–2 short lines each, with bold, clean, easy-to-read type. Do NOT render these summaries as illegible or warped text.',
    '- Natural overlapping composition',
    '',
    // Background
    'Background: soft beige, warm off-white, textured paper.',
    '',
    // Final aesthetic guidance
    'Overall aesthetic: polished, warm, curated, magazine-layout, interior-designer style.',
    '',
    // Restrictions
    'Do NOT add any logos, brand marks, or watermarks inside the generated image. Focus purely on the interior design collage.',
    'Match the density, compactness, and overlapping style of high-end interior designer moodboards. Make the whole composition visually rich, full, cohesive, and intentionally layered.',
  ];

  // PRESERVED: Filter empty lines and join
  // FROM: moodboard-main/app/api/moodboard/route.ts lines 106-107
  return promptLines.filter((line) => line !== '').join('\n');
}

/**
 * Generate a hash of the prompt for deduplication and debugging.
 * 
 * @param prompt - The prompt string
 * @returns SHA-256 hash of the prompt
 */
export function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').substring(0, 16);
}

// ===========================================
// Image Analysis Prompt
// ===========================================

/**
 * Build the image analysis prompt.
 * 
 * PRESERVED FROM: moodboard-main/app/api/analyze-image/route.ts lines 57-72
 */
export function buildImageAnalysisPrompt(): string {
  return `You are an expert interior designer and visual interpreter. Analyze the user's uploaded reference image in extreme detail. Extract room type, interior style, mood, color palette, materials, textures, furniture elements, decor items, and lighting style. Then output ONLY the following JSON:

{
  "roomType": "",
  "aestheticStyle": "",
  "themeMood": "",
  "colorPalette": "",
  "materialPreferences": "",
  "texturePreferences": "",
  "furniturePreferences": "",
  "decorPreferences": "",
  "lightingPreferences": "",
  "notes": ""
}

Ensure the response always contains valid JSON. Do not add explanations or comments. Only output the JSON object itself.`;
}

/**
 * Build the summary analysis prompt with user context.
 * 
 * PRESERVED FROM: moodboard-main/app/api/summary/route.ts lines 51-99
 */
export function buildSummaryAnalysisPrompt(userHints?: {
  roomType?: string;
  style?: string;
  colorPalette?: string;
  materials?: string;
  textures?: string;
  mood?: string;
  furniture?: string;
  decor?: string;
  lighting?: string;
  technology?: string;
  budget?: string;
  renovationScope?: string;
  timeframe?: string;
  imageLinks?: string;
}): string {
  const schemaPrompt = `You are an expert interior designer and visual interpreter. Analyze the user's uploaded reference image in extreme detail. You will also receive optional user-provided text fields (room type, style, etc.). Your job is to combine the IMAGE and TEXT and convert everything into structured form data.

Extract the following attributes from the image (using the user text only as a hint, but never contradicting what you clearly see):

- Room type (bathroom, living room, bedroom, dining room, office, kitchen, etc.)
- Aesthetic style (modern, contemporary, Scandinavian, minimalist, luxury, industrial, boho, coastal, farmhouse, transitional, etc.)
- Theme or mood (cozy, airy, dramatic, calm, warm, bold, elegant, natural, etc.)
- Color palette (list the main colors seen)
- Material preferences (wood type, metals, stones, tiles, upholstery, fabrics)
- Texture preferences (matte, glossy, rough, linen, velvet, boucle, etc.)
- Furniture preferences (sofa style, chair type, tables, cabinets, bathtub style, etc.)
- Decor preferences (plants, mirrors, lamps, vases, art, accessories)
- Lighting style (pendant, wall sconce, natural light, warm lighting, etc.)
- Additional notes (special features, patterns, layout hints)

Return ONLY a single JSON object with this exact shape and property names:
{
  "summary": "Short 1-2 sentence description of the overall design and feeling of the space.",
  "roomType": "string",
  "aestheticStyle": "string",
  "themeMood": "string",
  "colorPalette": "string",
  "materialPreferences": "string",
  "texturePreferences": "string",
  "furniturePreferences": "string",
  "decorPreferences": "string",
  "lightingPreferences": "string",
  "notes": "any extra observations, constraints, or suggestions from the image and text"
}

Do not add explanations or comments. Only output the JSON object itself.`;

  if (!userHints) {
    return schemaPrompt;
  }

  const userContext = [
    'User-provided fields (these are hints, may be refined by image analysis):',
    `Room type: ${userHints.roomType ?? ''}`,
    `Style: ${userHints.style ?? ''}`,
    `Color palette: ${userHints.colorPalette ?? ''}`,
    `Materials: ${userHints.materials ?? ''}`,
    `Textures: ${userHints.textures ?? ''}`,
    `Mood: ${userHints.mood ?? ''}`,
    `Furniture needs: ${userHints.furniture ?? ''}`,
    `Decor: ${userHints.decor ?? ''}`,
    `Lighting: ${userHints.lighting ?? ''}`,
    `Tech/Smart features: ${userHints.technology ?? ''}`,
    `Budget: ${userHints.budget ?? ''}`,
    `Scope: ${userHints.renovationScope ?? ''}`,
    `Timeframe: ${userHints.timeframe ?? ''}`,
    `Extra notes/Links: ${userHints.imageLinks ?? ''}`,
  ].join('\n');

  return `${schemaPrompt}\n\n${userContext}`;
}

