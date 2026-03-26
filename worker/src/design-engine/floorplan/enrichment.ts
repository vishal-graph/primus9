/**
 * Floor Plan Spatial Enrichment Engine
 *
 * Runs as a second-pass AFTER room detection.
 * Takes the already-detected rooms + original image and enriches each room
 * with precise dimensions, adjacency, openings, zoning, and property-level data.
 *
 * Model: gemini-2.5-flash (v1beta)
 */

import { DetectedRoom, FloorPlanAnalysisResult, ImageMetadata, RoomType } from './types';
import { logger } from '../../lib/logger';

// ============================================
// TYPES
// ============================================

export interface EnrichedRoom {
  id: string;
  name: string;
  dimensions: {
    length_ft: number | null;
    width_ft: number | null;
  };
  area_sqft: number | null;
  wall_thickness_ft: number | null;
  openings: {
    doors: number;
    windows: number;
  };
  position: string;
  adjacent_to: string[];
  confidence: number;
  source: 'explicit' | 'inferred' | 'estimated';
}

export interface PropertyInfo {
  shape: string;
  dimensions: {
    length_ft: number | null;
    width_ft: number | null;
  };
  total_area_sqft: number | null;
  confidence: number;
  source: string;
}

export interface SpatialEnrichment {
  property: PropertyInfo;
  rooms: EnrichedRoom[];
  setbacks: {
    front: string;
    rear: string;
    left: string;
    right: string;
    confidence: number;
  };
  circulation: {
    passages: Array<{
      width_ft: string;
      connects: string[];
    }>;
  };
  spatial_relationships: {
    entry_flow: string[];
    zoning: {
      public: string[];
      private: string[];
      utility: string[];
    };
  };
  validation: {
    issues: string[];
    missing_data: string[];
  };
  status: 'success' | 'low_confidence';
}

// ============================================
// ADJACENCY POST-PROCESSING
// ============================================

const MAX_ADJACENT = 8;

function humanizeRoomType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Best display label for a detected room (plan text > name > type). */
function pickDetectedRoomLabel(r: DetectedRoom): string {
  const texts = r.textDetected || [];
  const fromText = texts.find(
    (t) =>
      typeof t === 'string' &&
      /^[A-Za-z]/.test(t) &&
      t.length < 48 &&
      !/^\d+[''-]/.test(t) &&
      !/\d+\s*[xX×]\s*\d+/.test(t)
  );
  if (fromText) return fromText.trim();
  if (r.name && r.name.trim()) return r.name.trim();
  return humanizeRoomType(String(r.type || RoomType.UNCLASSIFIED));
}

/**
 * Fix over-inclusive adjacency and replace internal ids with readable labels.
 */
export function normalizeEnrichmentAdjacency(
  enrichment: SpatialEnrichment,
  rooms: DetectedRoom[]
): void {
  if (!enrichment?.rooms?.length || !rooms.length) return;

  const labelByTempId = new Map<string, string>();
  for (const r of rooms) {
    labelByTempId.set(r.tempId, pickDetectedRoomLabel(r));
  }

  const idPattern = /^room_\d+$/i;
  const circulationPattern = /^circulation_\d+$/i;

  for (const er of enrichment.rooms) {
    const selfId = er.id;
    const selfLabelNorm = (labelByTempId.get(selfId) || er.name || '').toLowerCase();
    const raw = Array.isArray(er.adjacent_to) ? er.adjacent_to : [];
    const seen = new Set<string>();
    const out: string[] = [];

    for (const entry of raw) {
      const s = String(entry).trim();
      if (!s) continue;

      let label = s;
      if (labelByTempId.has(s)) {
        label = labelByTempId.get(s)!;
      } else if (idPattern.test(s) || circulationPattern.test(s)) {
        const resolved = labelByTempId.get(s);
        if (resolved) label = resolved;
        else {
          const byTemp = rooms.find((r) => r.tempId === s);
          if (byTemp) label = pickDetectedRoomLabel(byTemp);
        }
      } else {
        const lower = s.toLowerCase();
        for (const r of rooms) {
          const L = pickDetectedRoomLabel(r);
          if (
            r.tempId === s ||
            (r.name && r.name.toLowerCase() === lower) ||
            L.toLowerCase() === lower
          ) {
            label = L;
            break;
          }
        }
      }

      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      if (selfLabelNorm && key === selfLabelNorm) continue;
      seen.add(key);
      out.push(label);
      if (out.length >= MAX_ADJACENT) break;
    }

    er.adjacent_to = out;
  }
}

/** Map graph adjacency tempIds to readable labels for DB/UI (caps count). */
export function mapAdjacentIdsToLabels(adjIds: string[], allRooms: DetectedRoom[]): string[] {
  if (!adjIds?.length || !allRooms.length) return [];
  const labelByTempId = new Map<string, string>();
  for (const r of allRooms) {
    labelByTempId.set(r.tempId, pickDetectedRoomLabel(r));
  }
  const seen = new Set<string>();
  const out: string[] = [];

  for (const id of adjIds) {
    const s = String(id).trim();
    if (!s) continue;
    let label = labelByTempId.get(s);
    if (!label) {
      const match = allRooms.find((r) => r.tempId === s);
      label = match ? pickDetectedRoomLabel(match) : undefined;
    }
    if (!label) label = s;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= MAX_ADJACENT) break;
  }
  return out;
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildEnrichmentPrompt(
  rooms: DetectedRoom[],
  imageMetadata: ImageMetadata
): string {
  const detectedRooms = rooms.map((r, i) => ({
    id: r.tempId || `room_${i + 1}`,
    name: r.name || `Room ${i + 1}`,
    type: r.type,
    ai_score: `${Math.round(r.confidenceScore * 100)}%`,
    bounding_box: `x:${r.geometry.boundingBox.x}, y:${r.geometry.boundingBox.y}, w:${r.geometry.boundingBox.width}, h:${r.geometry.boundingBox.height}`,
  }));

  return `You are an advanced architectural intelligence system.

You are given:
1. A floor plan image
2. A list of already detected rooms with labels, AI scores, and bounding regions

Your job is to ENRICH this existing data by extracting precise spatial, dimensional, and structural intelligence WITHOUT altering the existing detected room labels.

## CORE RULES
- DO NOT re-detect or rename rooms
- ONLY enhance the given rooms with additional data
- DO NOT hallucinate dimensions — infer only when necessary
- ALWAYS attach confidence and source for every inferred value
- Standardize all measurements in FEET (ft)

## INPUT
Image dimensions: ${imageMetadata.width}x${imageMetadata.height}px
Orientation: ${imageMetadata.orientation || 'unknown'}

detected_rooms:
${JSON.stringify(detectedRooms, null, 2)}

## TASKS
1. PROPERTY-LEVEL: Detect outer boundary, total area, layout shape
2. ROOM ENRICHMENT: For each room extract dimensions (length/width in ft), area, wall thickness, openings (doors/windows count), spatial position, adjacency (see ADJACENCY RULES below)
3. DIMENSION INFERENCE: Use visible numbers as scale. If not visible, use heuristics (Bedroom 10-14ft, Kitchen 7-10ft, Toilet 4-8ft, Living 12-20ft). Mark source as "estimated"
4. SETBACKS: Front/rear/left/right margins. Return "not_visible" if unclear
5. CIRCULATION: Passage widths and connections
6. SPATIAL RELATIONSHIPS: Entry flow path, zoning (public/private/utility)
7. VALIDATION: Check for area mismatches, missing dimensions, impossible layouts

## ADJACENCY RULES (CRITICAL)
- "adjacent_to" means the room **directly shares a wall, door, or opening** with another listed space on the plan — NOT "on the same floor" and NOT every other room.
- Typical residential rooms have **0–6** true wall-adjacent neighbors. **Never list more than 8.** If unsure, list fewer.
- Use **human-readable labels only**: the \`name\` from detected_rooms, or a clear plan label (e.g. "Kitchen", "Foyer", "Bedroom 1"). **Do NOT** output internal ids like \`room_2\`, \`circulation_1\`, or raw UUIDs.
- Do **not** list a room as adjacent to itself.
- Spaces only reachable through a long corridor are **not** adjacent unless they share a wall with that corridor segment you are naming.

## OUTPUT (STRICT JSON only, no markdown)
{
  "property": {
    "shape": "<rectangular|L-shape|irregular>",
    "dimensions": { "length_ft": <number|null>, "width_ft": <number|null> },
    "total_area_sqft": <number|null>,
    "confidence": <0-100>,
    "source": "<explicit|inferred|estimated>"
  },
  "rooms": [
    {
      "id": "<matching id from input>",
      "name": "<matching name from input>",
      "dimensions": { "length_ft": <number|null>, "width_ft": <number|null> },
      "area_sqft": <number|null>,
      "wall_thickness_ft": <number|null>,
      "openings": { "doors": <number>, "windows": <number> },
      "position": "<e.g. north-east corner>",
      "adjacent_to": ["<neighbor labels only, max 8, wall/door adjacent>"],
      "confidence": <0-100>,
      "source": "<explicit|inferred|estimated>"
    }
  ],
  "setbacks": {
    "front": "<ft value or not_visible>",
    "rear": "<ft value or not_visible>",
    "left": "<ft value or not_visible>",
    "right": "<ft value or not_visible>",
    "confidence": <0-100>
  },
  "circulation": {
    "passages": [
      { "width_ft": "<value>", "connects": ["<room1>", "<room2>"] }
    ]
  },
  "spatial_relationships": {
    "entry_flow": ["Entrance", "Foyer", "Living", "..."],
    "zoning": {
      "public": ["Living Room", "Dining"],
      "private": ["Bedroom 1", "Bedroom 2"],
      "utility": ["Kitchen", "Toilet"]
    }
  },
  "validation": {
    "issues": [],
    "missing_data": []
  },
  "status": "success"
}

IMPORTANT: Return ONLY the JSON object. No markdown code fences, no explanations.`;
}

// ============================================
// ENRICHMENT FUNCTION
// ============================================

/**
 * Call Gemini 3 Flash Preview to spatially enrich detected rooms.
 * This is a fire-and-forget enhancement — if it fails the pipeline still succeeds.
 */
export async function enrichFloorPlan(
  imageBase64: string,
  imageMimeType: string,
  analysisResult: FloorPlanAnalysisResult
): Promise<SpatialEnrichment | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('No GEMINI_API_KEY set — skipping enrichment');
    return null;
  }

  const model = 'gemini-2.5-flash';
  const apiVersion = 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

  const prompt = buildEnrichmentPrompt(analysisResult.rooms, analysisResult.imageMetadata);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: imageMimeType,
              data: imageBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 min

  try {
    logger.info({
      model,
      roomCount: analysisResult.rooms.length,
      imageSizeKb: Math.round(imageBase64.length * 0.75 / 1024),
      mimeType: imageMimeType,
    }, 'Starting spatial enrichment');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, error: errText }, 'Enrichment API error');
      return null;
    }

    const data: any = await response.json();

    // Check for blocked/filtered responses
    if (data.candidates?.[0]?.finishReason && data.candidates[0].finishReason !== 'STOP') {
      logger.warn({
        finishReason: data.candidates[0].finishReason,
        safetyRatings: data.candidates[0].safetyRatings,
      }, 'Enrichment response filtered');
      return null;
    }

    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      logger.warn({
        candidateCount: data.candidates?.length,
        finishReason: data.candidates?.[0]?.finishReason,
        promptFeedback: data.promptFeedback,
      }, 'Enrichment returned empty response');
      return null;
    }

    // Strip markdown fences if present
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const enrichment: SpatialEnrichment = JSON.parse(jsonStr);
    normalizeEnrichmentAdjacency(enrichment, analysisResult.rooms);
    logger.info({
      roomCount: enrichment.rooms.length,
      propertyArea: enrichment.property.total_area_sqft,
      status: enrichment.status,
    }, 'Spatial enrichment complete');

    return enrichment;
  } catch (err) {
    clearTimeout(timeoutId);
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    const errName = err instanceof Error ? err.name : 'Unknown';
    logger.error({
      errorName: errName,
      errorMessage: errMsg,
      errorStack: errStack,
    }, 'Spatial enrichment failed (non-fatal)');
    return null;
  }
}
