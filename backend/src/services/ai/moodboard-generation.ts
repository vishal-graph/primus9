import { BaseAIService } from './base';

/**
 * Moodboard Generation Service
 * Generates design moodboards based on room and style preferences
 * 
 * TODO: Integrate with image generation API
 * TODO: Add style transfer capabilities
 * TODO: Implement multi-image moodboard layouts
 */

export interface MoodboardInput {
  roomType: string;
  roomName: string;
  style: string;
  colorScheme: string[];
  budget: 'LOW' | 'MEDIUM' | 'HIGH' | 'LUXURY';
  preferences: string[];
}

export interface MoodboardOutput {
  imagePrompt: string;
  colorPalette: string[];
  suggestedStyles: string[];
  furnitureSuggestions: Array<{
    item: string;
    style: string;
    estimatedCost: string;
  }>;
  designNotes: string;
}

export class MoodboardGenerationService extends BaseAIService<MoodboardInput, MoodboardOutput> {
  constructor() {
    super('moodboard-generation', {
      temperature: 0.8, // Higher creativity for design suggestions
    });
  }

  protected getPromptVersion(): string {
    return 'v1.0.0';
  }

  protected buildPrompt(input: MoodboardInput): string {
    return `Create a moodboard concept for the following room:

Room: ${input.roomName} (${input.roomType})
Style: ${input.style}
Color Preferences: ${input.colorScheme.join(', ')}
Budget: ${input.budget}
Additional Preferences: ${input.preferences.join(', ')}

Generate:
1. A detailed image prompt for a moodboard image (for image generation AI)
2. A refined color palette (6 hex colors)
3. 3-5 complementary style suggestions
4. Key furniture/decor suggestions with estimated costs for the budget level
5. Design notes and recommendations

Respond in JSON format:
{
  "imagePrompt": "A detailed prompt for image generation...",
  "colorPalette": ["#FFFFFF", "#000000", ...],
  "suggestedStyles": ["Style 1", "Style 2", ...],
  "furnitureSuggestions": [
    { "item": "Sofa", "style": "Mid-century modern", "estimatedCost": "₹50,000-80,000" }
  ],
  "designNotes": "Additional recommendations..."
}`;
  }

  protected parseResponse(response: string): MoodboardOutput {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse moodboard generation response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    return {
      imagePrompt: parsed.imagePrompt || '',
      colorPalette: (parsed.colorPalette || []).slice(0, 6),
      suggestedStyles: parsed.suggestedStyles || [],
      furnitureSuggestions: parsed.furnitureSuggestions || [],
      designNotes: parsed.designNotes || '',
    };
  }
}

export const moodboardGenerationService = new MoodboardGenerationService();

