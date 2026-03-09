import { BaseAIService } from './base';

/**
 * Component Injection Service
 * Generates specifications for updating individual components in a scene
 * 
 * TODO: Integrate with image editing API
 * TODO: Add mask generation for component replacement
 * TODO: Support multiple component updates
 */

export interface ComponentInput {
  roomType: string;
  currentImageDescription: string;
  component: {
    type: string;
    currentStyle: string;
    newStyle: string;
    size: string;
    material: string;
  };
  position: {
    x: number;
    y: number;
  };
  surroundingElements: string[];
}

export interface ComponentOutput {
  imagePrompt: string;
  inpaintingMask: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styleNotes: string;
  compatibilityScore: number;
  alternatives: Array<{
    style: string;
    reason: string;
  }>;
}

export class ComponentInjectionService extends BaseAIService<ComponentInput, ComponentOutput> {
  constructor() {
    super('component-injection', {
      model: 'gemini-pro',
      temperature: 0.5,
    });
  }

  protected getPromptVersion(): string {
    return 'v1.0.0';
  }

  protected buildPrompt(input: ComponentInput): string {
    return `Generate a component replacement specification:

Room Type: ${input.roomType}
Current Scene: ${input.currentImageDescription}

Component to Replace:
- Type: ${input.component.type}
- Current Style: ${input.component.currentStyle}
- New Style: ${input.component.newStyle}
- Size: ${input.component.size}
- Material: ${input.component.material}

Position: (${input.position.x}%, ${input.position.y}%)
Surrounding Elements: ${input.surroundingElements.join(', ')}

Generate:
1. A detailed prompt for the new component
2. Estimated mask area for replacement
3. Style compatibility notes
4. Alternative suggestions if the style doesn't fit

Respond in JSON format:
{
  "imagePrompt": "Detailed prompt for the new component...",
  "inpaintingMask": { "x": 20, "y": 30, "width": 25, "height": 20 },
  "styleNotes": "How well the new component fits...",
  "compatibilityScore": 0.85,
  "alternatives": [
    { "style": "Alternative style", "reason": "Why it might work better" }
  ]
}`;
  }

  protected parseResponse(response: string): ComponentOutput {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse component injection response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  }
}

export const componentInjectionService = new ComponentInjectionService();

