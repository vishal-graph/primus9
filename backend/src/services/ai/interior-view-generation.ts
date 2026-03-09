import { BaseAIService } from './base';

/**
 * Interior View Generation Service
 * Generates 3D interior view prompts and specifications
 * 
 * TODO: Integrate with 3D rendering API
 * TODO: Add camera angle calculations
 * TODO: Support panoramic views
 */

export interface InteriorViewInput {
  roomType: string;
  roomName: string;
  style: string;
  colorPalette: string[];
  furniture: Array<{
    item: string;
    position: string;
  }>;
  viewAngle: number; // 0-360 degrees
  ambience: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
}

export interface InteriorViewOutput {
  imagePrompt: string;
  cameraSettings: {
    angle: number;
    height: string;
    focalLength: string;
  };
  lightingSettings: {
    natural: string;
    artificial: string[];
    ambience: string;
  };
  renderNotes: string;
}

export class InteriorViewGenerationService extends BaseAIService<InteriorViewInput, InteriorViewOutput> {
  constructor() {
    super('interior-view-generation', {
      model: 'gemini-pro',
      temperature: 0.6,
    });
  }

  protected getPromptVersion(): string {
    return 'v1.0.0';
  }

  protected buildPrompt(input: InteriorViewInput): string {
    return `Create a 3D interior view specification for:

Room: ${input.roomName} (${input.roomType})
Style: ${input.style}
Color Palette: ${input.colorPalette.join(', ')}
View Angle: ${input.viewAngle}° from entrance
Time of Day: ${input.ambience}

Furniture Layout:
${input.furniture.map(f => `- ${f.item}: ${f.position}`).join('\n')}

Generate:
1. A highly detailed image prompt for 3D rendering
2. Camera settings for the view
3. Lighting configuration
4. Additional render notes

Respond in JSON format:
{
  "imagePrompt": "Photorealistic 3D render of a ${input.style} ${input.roomType}...",
  "cameraSettings": {
    "angle": ${input.viewAngle},
    "height": "Eye level (5.5 feet)",
    "focalLength": "35mm"
  },
  "lightingSettings": {
    "natural": "Morning sunlight from east-facing windows",
    "artificial": ["Recessed ceiling lights", "Table lamp"],
    "ambience": "Warm and inviting"
  },
  "renderNotes": "Additional notes..."
}`;
  }

  protected parseResponse(response: string): InteriorViewOutput {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse interior view generation response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  }
}

export const interiorViewGenerationService = new InteriorViewGenerationService();

