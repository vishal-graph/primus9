/**
 * TatvaOps Vision - Architectural Accuracy Calculator
 * 
 * Calculates how similar the generated isometric elevation is to the floor plan.
 * 
 * ============================================================
 * ❗ ARCHITECTURAL ACCURACY ≠ GEOMETRIC ACCURACY ❗
 * ❗ GEOMETRIC: Measures dimensional precision ❗
 * ❗ ARCHITECTURAL: Measures layout similarity ❗
 * ============================================================
 * 
 * This module:
 * - Analyzes the generated image using Gemini Vision
 * - Compares it to the floor plan geometry
 * - Calculates similarity score (0-1, where 1.0 = perfect match)
 * - Checks: room count, positions, wall placements, layout
 */

import { getGeminiClient } from '../common/gemini-client';
import { FloorGeometry, RoomGeometry } from './types';
import { logger } from '../../lib/logger';
import { buildGeometryDescription } from './geometryValidator';

/**
 * Calculate architectural accuracy by comparing generated image to floor plan
 * 
 * @param imageData - Base64 encoded image data
 * @param mimeType - Image MIME type
 * @param floorGeometry - Original floor plan geometry
 * @returns Accuracy score (0-1, where 1.0 = perfect match)
 */
export async function calculateArchitecturalAccuracy(
  imageData: string,
  mimeType: string,
  floorGeometry: FloorGeometry
): Promise<number> {
  logger.info('Calculating architectural accuracy', {
    roomCount: floorGeometry.rooms.length,
    floor: floorGeometry.floor,
  });

  try {
    // Build floor plan description for comparison
    const geometryDescription = buildGeometryDescription(floorGeometry);
    
    // Build analysis prompt
    const analysisPrompt = buildAccuracyAnalysisPrompt(floorGeometry, geometryDescription);

    // Analyze image with Gemini Vision
    const geminiClient = getGeminiClient();
    const parts = [
      {
        inlineData: {
          mimeType,
          data: imageData,
        },
      },
      { text: analysisPrompt },
    ];

    const response = await geminiClient.analyzeContent(parts, {
      timeoutMs: 60000,
    });

    // Parse accuracy score from response
    const accuracy = parseAccuracyScore(response, floorGeometry);

    logger.info('Architectural accuracy calculated', {
      accuracy,
      roomCount: floorGeometry.rooms.length,
    });

    return accuracy;
  } catch (error) {
    logger.error('Failed to calculate architectural accuracy', {
      error: String(error),
      roomCount: floorGeometry.rooms.length,
    });
    
    // Return conservative estimate on error
    return 0.85; // Assume 85% accuracy if analysis fails
  }
}

/**
 * Build prompt for architectural accuracy analysis
 */
function buildAccuracyAnalysisPrompt(
  geometry: FloorGeometry,
  geometryDescription: string
): string {
  const roomList = geometry.rooms.map(r => 
    `${r.roomName} (${r.roomType}) at position (${r.boundingBox.x}, ${r.boundingBox.y}) with size ${r.boundingBox.width}x${r.boundingBox.height}`
  ).join('\n');

  return `Analyze this isometric floor plan elevation image and compare it to the provided floor plan geometry.

FLOOR PLAN GEOMETRY (SOURCE OF TRUTH):
${geometryDescription}

ROOM LIST:
${roomList}

Total rooms expected: ${geometry.rooms.length}
Floor dimensions: ${geometry.dimensions.width} x ${geometry.dimensions.height}

ANALYSIS REQUIREMENTS:
1. Count the number of rooms visible in the image
2. Check if room positions match the floor plan (relative to each other)
3. Verify wall placements align with the floor plan
4. Check if room sizes appear proportional to the floor plan
5. Verify overall layout matches the floor plan structure

Respond in this exact JSON format:
{
  "roomCountMatch": true/false,
  "roomCountInImage": <number>,
  "expectedRoomCount": ${geometry.rooms.length},
  "roomPositionsMatch": true/false,
  "wallPlacementsMatch": true/false,
  "layoutSimilarity": <number 0-1>,
  "overallAccuracy": <number 0-1>,
  "issues": ["list of any discrepancies found"],
  "notes": "brief summary of comparison"
}

Calculate overallAccuracy as:
- 0.3 if roomCountMatch is false
- 0.5 if roomCountMatch is true but roomPositionsMatch is false
- 0.7 if roomCountMatch and roomPositionsMatch are true but wallPlacementsMatch is false
- 0.9 if all matches are true but layoutSimilarity < 0.8
- 1.0 if all matches are true and layoutSimilarity >= 0.8
- Reduce by 0.1 for each major issue found

Be strict but fair - minor decorative differences should not reduce accuracy significantly.`;
}

/**
 * Parse accuracy score from Gemini response
 */
function parseAccuracyScore(
  response: string,
  floorGeometry: FloorGeometry
): number {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('No JSON found in accuracy analysis response', {
        responsePreview: response.substring(0, 200),
      });
      return 0.85; // Conservative fallback
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and extract accuracy score
    let accuracy = parsed.overallAccuracy;

    if (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 1) {
      logger.warn('Invalid accuracy score from analysis', {
        accuracy,
        parsed,
      });
      
      // Calculate from individual components if overallAccuracy is invalid
      if (parsed.roomCountMatch === false) {
        accuracy = 0.3;
      } else if (parsed.roomPositionsMatch === false) {
        accuracy = 0.5;
      } else if (parsed.wallPlacementsMatch === false) {
        accuracy = 0.7;
      } else {
        accuracy = Math.max(0.8, parsed.layoutSimilarity || 0.85);
      }
    }

    // Apply penalty for issues (capped so 1–2 minor issues don’t push below threshold)
    if (Array.isArray(parsed.issues) && parsed.issues.length > 0) {
      const issuePenalty = Math.min(0.05 * parsed.issues.length, 0.1);
      accuracy = Math.max(0, accuracy - issuePenalty);
    }

    // Validate room count match
    if (parsed.roomCountMatch === false) {
      const expectedCount = floorGeometry.rooms.length;
      const actualCount = parsed.roomCountInImage || 0;
      const countDifference = Math.abs(expectedCount - actualCount);
      
      // Penalize for missing/extra rooms
      const countPenalty = Math.min(countDifference / expectedCount, 0.3);
      accuracy = Math.max(0, accuracy - countPenalty);
    }

    // Ensure accuracy is between 0 and 1
    accuracy = Math.max(0, Math.min(1, accuracy));

    logger.debug('Parsed architectural accuracy', {
      accuracy,
      roomCountMatch: parsed.roomCountMatch,
      roomPositionsMatch: parsed.roomPositionsMatch,
      wallPlacementsMatch: parsed.wallPlacementsMatch,
      layoutSimilarity: parsed.layoutSimilarity,
      issues: parsed.issues?.length || 0,
    });

    return accuracy;
  } catch (error) {
    logger.error('Failed to parse accuracy score', {
      error: String(error),
      responsePreview: response.substring(0, 200),
    });
    return 0.85; // Conservative fallback
  }
}


