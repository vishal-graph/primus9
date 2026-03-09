import { BaseAIService, GenerationResult } from './base';

/**
 * Floor Plan Analysis Service
 * Analyzes uploaded floor plans to detect rooms and dimensions
 * 
 * TODO: Fine-tune prompt for accuracy
 * TODO: Add support for multiple floor plan formats
 * TODO: Implement confidence scoring
 */

export interface FloorPlanInput {
  imageBase64: string;
  mimeType: string;
}

export interface DetectedRoom {
  name: string;
  type: string;
  geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export interface FloorPlanOutput {
  rooms: DetectedRoom[];
  totalArea: number;
  dimensions: {
    width: number;
    height: number;
    unit: string;
  };
}

export class FloorPlanAnalysisService extends BaseAIService<FloorPlanInput, FloorPlanOutput> {
  constructor() {
    super('floor-plan-analysis', {
      temperature: 0.3, // Lower temperature for more consistent detection
    });
  }

  protected getPromptVersion(): string {
    return 'v1.0.0';
  }

  protected buildPrompt(input: FloorPlanInput) {
    return [
      {
        text: `Analyze this floor plan image and identify all rooms.

For each room, provide:
1. Room name (e.g., "Master Bedroom", "Kitchen")
2. Room type (one of: LIVING_ROOM, BEDROOM, KITCHEN, BATHROOM, DINING, OFFICE, BALCONY, HALLWAY, STORAGE, OTHER)
3. Approximate position and size relative to the image (x, y, width, height as percentages 0-100)
4. Confidence score (0-1)

Also estimate:
- Total floor area (in square feet)
- Overall dimensions (width x height)

Respond in JSON format:
{
  "rooms": [
    {
      "name": "Room Name",
      "type": "ROOM_TYPE",
      "geometry": { "x": 0, "y": 0, "width": 50, "height": 50 },
      "confidence": 0.95
    }
  ],
  "totalArea": 1200,
  "dimensions": { "width": 40, "height": 30, "unit": "feet" }
}`,
      },
      {
        inlineData: {
          mimeType: input.mimeType,
          data: input.imageBase64,
        },
      },
    ];
  }

  protected parseResponse(response: string): FloorPlanOutput {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse floor plan analysis response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    // Validate and normalize
    return {
      rooms: (parsed.rooms || []).map((room: DetectedRoom) => ({
        name: room.name || 'Unknown Room',
        type: room.type || 'OTHER',
        geometry: {
          x: Math.max(0, Math.min(100, room.geometry?.x || 0)),
          y: Math.max(0, Math.min(100, room.geometry?.y || 0)),
          width: Math.max(1, Math.min(100, room.geometry?.width || 10)),
          height: Math.max(1, Math.min(100, room.geometry?.height || 10)),
        },
        confidence: Math.max(0, Math.min(1, room.confidence || 0.5)),
      })),
      totalArea: parsed.totalArea || 0,
      dimensions: {
        width: parsed.dimensions?.width || 0,
        height: parsed.dimensions?.height || 0,
        unit: parsed.dimensions?.unit || 'feet',
      },
    };
  }
}

// Singleton instance
export const floorPlanAnalysisService = new FloorPlanAnalysisService();

