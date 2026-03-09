import { BaseAIService } from './base';

/**
 * Elevation Generation Service
 * Generates wall elevation designs for rooms
 * 
 * TODO: Integrate with image generation API
 * TODO: Add furniture placement logic
 * TODO: Support custom wall dimensions
 */

export interface ElevationInput {
  roomType: string;
  roomName: string;
  wall: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
  moodboardStyle: string;
  colorPalette: string[];
  dimensions: {
    width: number;
    height: number;
    unit: string;
  };
  features?: string[]; // e.g., ["window", "door"]
}

export interface ElevationOutput {
  imagePrompt: string;
  layoutSuggestions: Array<{
    element: string;
    position: string;
    notes: string;
  }>;
  materialRecommendations: Array<{
    material: string;
    application: string;
    cost: string;
  }>;
  lightingNotes: string;
}

export class ElevationGenerationService extends BaseAIService<ElevationInput, ElevationOutput> {
  constructor() {
    super('elevation-generation', {
      model: 'gemini-pro',
      temperature: 0.7,
    });
  }

  protected getPromptVersion(): string {
    return 'v1.0.0';
  }

  protected buildPrompt(input: ElevationInput): string {
    return `Design a wall elevation for the following specifications:

Room: ${input.roomName} (${input.roomType})
Wall: ${input.wall} wall
Dimensions: ${input.dimensions.width} x ${input.dimensions.height} ${input.dimensions.unit}
Style Reference: ${input.moodboardStyle}
Color Palette: ${input.colorPalette.join(', ')}
Wall Features: ${input.features?.join(', ') || 'None specified'}

Generate:
1. A detailed image prompt for an elevation view (for image generation AI)
2. Layout suggestions for furniture and decor placement
3. Material recommendations with cost estimates
4. Lighting recommendations

Respond in JSON format:
{
  "imagePrompt": "Detailed prompt for elevation image...",
  "layoutSuggestions": [
    { "element": "TV Unit", "position": "Center of wall", "notes": "Wall-mounted at eye level" }
  ],
  "materialRecommendations": [
    { "material": "Italian marble", "application": "Accent panel behind TV", "cost": "₹500-800/sq.ft" }
  ],
  "lightingNotes": "Recommendations for lighting..."
}`;
  }

  protected parseResponse(response: string): ElevationOutput {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse elevation generation response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    return {
      imagePrompt: parsed.imagePrompt || '',
      layoutSuggestions: parsed.layoutSuggestions || [],
      materialRecommendations: parsed.materialRecommendations || [],
      lightingNotes: parsed.lightingNotes || '',
    };
  }
}

export const elevationGenerationService = new ElevationGenerationService();

