/**
 * TatvaOps Vision - Gemini Response Parser
 * 
 * Parses and validates responses from Gemini API.
 * Handles markdown fence stripping and JSON extraction.
 * 
 * PRESERVED FROM: moodboard-main/app/api/analyze-image/route.ts lines 164-191
 * PRESERVED FROM: moodboard-main/app/api/summary/route.ts lines 202-238
 */

import { DesignIntent, DesignEngineError, DesignEngineErrorCode } from '../types';
import { logger } from '../../lib/logger';

// ===========================================
// Response Parsing
// ===========================================

/**
 * Remove markdown code fences from Gemini response.
 * 
 * PRESERVED FROM: moodboard-main/app/api/analyze-image/route.ts lines 164-177
 * PRESERVED FROM: moodboard-main/app/api/summary/route.ts lines 202-224
 * 
 * The model sometimes wraps JSON in ```json ... ``` blocks.
 * This function extracts the raw JSON content.
 */
export function stripMarkdownFences(text: string): string {
  let jsonText = text.trim();

  // Check if wrapped in markdown code blocks
  if (!jsonText.startsWith('```')) {
    return jsonText;
  }

  // Method 1: Find start and end indices
  const lines = jsonText.split('\n');
  const startIndex = lines.findIndex((line) => line.trim().startsWith('```'));
  const endIndex = lines.findIndex(
    (line, idx) => idx > startIndex && line.trim().endsWith('```')
  );

  if (startIndex !== -1 && endIndex !== -1) {
    return lines.slice(startIndex + 1, endIndex).join('\n').trim();
  }

  // Method 2: Regex extraction (fallback from summary/route.ts)
  const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }

  // Method 3: Simple removal of opening/closing fences
  return jsonText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * Parse design intent from Gemini analysis response.
 * 
 * PRESERVED FROM: moodboard-main/app/api/analyze-image/route.ts lines 179-205
 */
export function parseDesignIntentResponse(rawText: string): DesignIntent {
  const jsonText = stripMarkdownFences(rawText);

  let parsed: Partial<DesignIntent>;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    logger.error('Failed to parse design intent JSON', { jsonText, error: err });
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_RESPONSE_FORMAT,
      'AI model returned an unexpected format. Could not parse JSON response.',
      true,
      502,
      { rawText: jsonText.substring(0, 500) }
    );
  }

  // PRESERVED: Ensure all fields are strings with fallback to empty string
  // FROM: moodboard-main/app/api/analyze-image/route.ts lines 194-205
  return {
    roomType: parsed.roomType || '',
    aestheticStyle: parsed.aestheticStyle || '',
    themeMood: parsed.themeMood || '',
    colorPalette: parsed.colorPalette || '',
    materialPreferences: parsed.materialPreferences || '',
    texturePreferences: parsed.texturePreferences || '',
    furniturePreferences: parsed.furniturePreferences || '',
    decorPreferences: parsed.decorPreferences || '',
    lightingPreferences: parsed.lightingPreferences || '',
    notes: parsed.notes || '',
  };
}

/**
 * Parse summary analysis response.
 * Returns both summary and design intent.
 * 
 * PRESERVED FROM: moodboard-main/app/api/summary/route.ts lines 226-260
 */
export function parseSummaryAnalysisResponse(
  rawText: string,
  fallbackHints?: {
    roomType?: string;
    style?: string;
    colorPalette?: string;
    materials?: string;
    textures?: string;
    mood?: string;
    furniture?: string;
    decor?: string;
    lighting?: string;
  }
): { summary: string; designIntent: DesignIntent } {
  const jsonText = stripMarkdownFences(rawText);

  let parsed: {
    summary?: string;
    roomType?: string;
    aestheticStyle?: string;
    themeMood?: string;
    colorPalette?: string;
    materialPreferences?: string;
    texturePreferences?: string;
    furniturePreferences?: string;
    decorPreferences?: string;
    lightingPreferences?: string;
    notes?: string;
  };

  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    logger.error('Failed to parse summary analysis JSON', { jsonText, error: err });
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_RESPONSE_FORMAT,
      'AI model returned an unexpected format. Could not parse JSON response.',
      true,
      502,
      { rawText: jsonText.substring(0, 500) }
    );
  }

  // PRESERVED: Fallback helper function
  // FROM: moodboard-main/app/api/summary/route.ts lines 240-241
  const fallback = (value?: string, fallbackValue?: string) =>
    (value && String(value).trim()) || fallbackValue || '';

  const summary = fallback(parsed.summary, fallbackHints?.mood);

  const designIntent: DesignIntent = {
    roomType: fallback(parsed.roomType, fallbackHints?.roomType),
    aestheticStyle: fallback(parsed.aestheticStyle, fallbackHints?.style),
    themeMood: fallback(parsed.themeMood, fallbackHints?.mood),
    colorPalette: fallback(parsed.colorPalette, fallbackHints?.colorPalette),
    materialPreferences: fallback(parsed.materialPreferences, fallbackHints?.materials),
    texturePreferences: fallback(parsed.texturePreferences, fallbackHints?.textures),
    furniturePreferences: fallback(parsed.furniturePreferences, fallbackHints?.furniture),
    decorPreferences: fallback(parsed.decorPreferences, fallbackHints?.decor),
    lightingPreferences: fallback(parsed.lightingPreferences, fallbackHints?.lighting),
    notes: parsed.notes || '',
  };

  return { summary, designIntent };
}

/**
 * Validate that design intent has minimum required fields.
 */
export function validateDesignIntent(intent: DesignIntent): void {
  // At minimum, we need either roomType or aestheticStyle
  if (!intent.roomType && !intent.aestheticStyle) {
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_INPUT,
      'Design intent must have at least roomType or aestheticStyle',
      false,
      400
    );
  }
}

