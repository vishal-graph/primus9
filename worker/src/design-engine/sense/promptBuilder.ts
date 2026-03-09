/**
 * TatvaOps Vision - Sense Layer Prompt Builder
 * 
 * Constructs Gemini prompts for Intent Graph inference.
 * CRITICAL: Output must be JSON-only, no markdown, no explanations.
 */

import { GeminiPart } from '../types';

interface IntentGraphInput {
  images?: string[];
  floorPlan?: string;
  moodboards?: string[];
  text?: string;
  hints?: {
    spaceType?: string;
    budget?: string;
    priority?: string;
  };
}

/**
 * Build Gemini prompt for Intent Graph inference
 * 
 * This prompt instructs Gemini to analyze user inputs and return
 * structured JSON describing design intent.
 */
export function buildSensePrompt(input: IntentGraphInput): string {
  const parts: string[] = [];

  // System instruction
  parts.push(`You are an expert interior design intent analyzer. Your job is to understand what the user wants from their inputs and output structured design intent.

CRITICAL RULES:
1. Return ONLY valid JSON. No markdown code blocks, no explanations, no commentary.
2. Do NOT generate images. Only analyze and structure intent.
3. Do NOT make up dimensions or measurements. Focus on style, mood, and preferences.
4. Be confident but realistic. If unclear, use "medium" or neutral values.
5. ALWAYS return the exact JSON structure specified below.`);

  // Input analysis section
  parts.push('\n\nINPUT ANALYSIS:');
  
  if (input.images && input.images.length > 0) {
    parts.push(`- ${input.images.length} reference image(s) provided`);
  }
  
  if (input.floorPlan) {
    parts.push(`- Floor plan image provided`);
  }
  
  if (input.moodboards && input.moodboards.length > 0) {
    parts.push(`- ${input.moodboards.length} moodboard image(s) provided`);
  }
  
  if (input.text) {
    parts.push(`- User description: "${input.text}"`);
  }
  
  if (input.hints) {
    if (input.hints.spaceType) {
      parts.push(`- Space type hint: ${input.hints.spaceType}`);
    }
    if (input.hints.budget) {
      parts.push(`- Budget hint: ${input.hints.budget}`);
    }
    if (input.hints.priority) {
      parts.push(`- Priority hint: ${input.hints.priority}`);
    }
  }

  // Inference instructions
  parts.push(`\n\nYOUR TASK:
Analyze the provided inputs and infer the following design intent:

1. **Space Type**: What type of space is this? (living_room, bedroom, kitchen, bathroom, dining, study, office, commercial, outdoor, etc.)

2. **Style Signals**:
   - Warmth: low (cool, clinical), medium (balanced), high (warm, cozy)
   - Color Palette: Array of dominant colors (e.g., ["beige", "wood", "white", "sage-green"])
   - Visual Density: sparse (minimal), medium (balanced), dense (maximalist)
   - Era: contemporary, modern, traditional, mid-century, industrial, etc.

3. **Component Preferences**:
   - Lighting: indirect, direct, layered, natural-focus, statement-fixtures, etc.
   - Furniture: Array of furniture style keywords (e.g., ["modern", "low-profile", "multifunctional"])
   - Materials: Array of material preferences (e.g., ["natural-wood", "marble", "linen", "metal"])

4. **Change Boundaries**:
   - canChange: What elements can be modified (e.g., ["colors", "lighting", "furniture", "soft-furnishings"])
   - mustPreserve: What must remain unchanged (e.g., ["layout", "wall-positions", "structural", "windows"])

5. **Lifestyle Signals** (infer from context):
   - hasKids: boolean (if child-friendly elements detected)
   - hasPets: boolean (if pet-friendly elements detected)
   - entertainmentFocus: low, medium, high
   - workFromHome: boolean
   - hasElders: boolean (if accessibility features detected)

6. **Confidence**: Your confidence score (0.0 to 1.0) based on input clarity

7. **InferredFrom**: Array of input sources used (e.g., ["image-1.jpg", "user-text", "floorplan.png"])`);

  // Output format
  parts.push(`\n\nOUTPUT FORMAT (EXACT JSON):
{
  "spaceType": "living_room",
  "styleSignals": {
    "warmth": "high",
    "colorPalette": ["beige", "wood", "white"],
    "visualDensity": "medium",
    "era": "contemporary"
  },
  "componentPreferences": {
    "lighting": "indirect",
    "furniture": ["modern", "low-profile"],
    "materials": ["natural-wood", "linen"]
  },
  "changeBoundaries": {
    "canChange": ["colors", "lighting", "soft-furnishings"],
    "mustPreserve": ["layout", "wall-positions"]
  },
  "lifestyleSignals": {
    "hasKids": false,
    "hasPets": false,
    "entertainmentFocus": "medium",
    "workFromHome": false
  },
  "confidence": 0.82,
  "inferredFrom": ["image-1.jpg", "user-text"]
}`);

  parts.push('\n\nIMPORTANT: Return ONLY the JSON object above. No markdown, no code blocks, no additional text.');

  return parts.join('\n');
}

/**
 * Build image parts for Gemini multimodal request
 * 
 * Gemini expects images in base64 format with mimeType.
 */
export interface GeminiImagePart {
  inlineData: {
    mimeType: string;
    data: string; // base64
  };
}

/**
 * Build complete Gemini request parts
 */
export function buildGeminiParts(
  input: IntentGraphInput,
  imageParts: GeminiImagePart[]
): GeminiPart[] {
  const parts: GeminiPart[] = [];

  // Add text prompt
  parts.push({ text: buildSensePrompt(input) });

  // Add image parts (if any)
  if (imageParts && imageParts.length > 0) {
    // Convert GeminiImagePart to GeminiPart format
    for (const img of imageParts) {
      parts.push({
        inlineData: {
          mimeType: img.inlineData.mimeType,
          data: img.inlineData.data,
        }
      });
    }
  }

  return parts;
}
