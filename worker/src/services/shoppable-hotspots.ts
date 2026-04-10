/**
 * Infer normalized hotspot positions (0–100%) on a bird-view image for catalog-matched products.
 */

import { getGeminiClient } from '../design-engine/common/gemini-client';
import { logger } from '../lib/logger';

export interface CatalogMatchForHotspot {
  table: string;
  id: string | number;
  label: string;
}

export interface ShoppableHotspot {
  /** 0–100 from left */
  x: number;
  /** 0–100 from top */
  y: number;
  catalogTable: string;
  catalogId: string | number;
  label?: string;
}

function extractJsonArray(text: string): unknown[] | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const slice = fence ? fence[1].trim() : trimmed;
  const start = slice.indexOf('[');
  const end = slice.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(slice.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function clampPct(n: unknown): number | null {
  const x = typeof n === 'number' ? n : typeof n === 'string' ? parseFloat(n) : NaN;
  if (!Number.isFinite(x)) return null;
  return Math.max(0, Math.min(100, x));
}

/**
 * Uses Gemini vision to place hotspot centers for visible catalog items.
 */
export async function inferShoppableHotspots(params: {
  imageBase64: string;
  mimeType: string;
  matches: CatalogMatchForHotspot[];
}): Promise<ShoppableHotspot[]> {
  const { imageBase64, mimeType, matches } = params;
  if (matches.length === 0) return [];

  const lines = matches.map(
    (m, i) =>
      `${i + 1}. catalogTable=${m.table} catalogId=${m.id} label=${JSON.stringify(m.label)}`
  );

  const prompt = `You are annotating an interior design render (one room photograph).

These products from our catalog may appear in the image:
${lines.join('\n')}

Task: For each product that is CLEARLY VISIBLE in the image, output one object with:
- catalogTable (exact string from list)
- catalogId (exact id from list, number or string as given)
- x: horizontal position of the CENTER of that product as a percentage from the LEFT edge (0-100)
- y: vertical position of the CENTER as a percentage from the TOP edge (0-100)

Rules:
- Use the image's visible frame; percentages are relative to the full image width/height.
- Skip products not visible or only barely visible.
- Do not invent catalogTable/catalogId not in the list.
- Maximum ${Math.min(15, matches.length)} entries.

Return ONLY a JSON array, no markdown, no commentary. Example shape:
[{"catalogTable":"sofa_products","catalogId":1,"x":45,"y":62}]`;

  try {
    const gemini = getGeminiClient();
    const raw = await gemini.analyzeContent(
      [
        { text: prompt },
        { inlineData: { mimeType, data: imageBase64 } },
      ],
      {
        timeoutMs: 90_000,
        temperature: 0.2,
        maxOutputTokens: 2048,
        minTextLength: 2,
      }
    );

    const arr = extractJsonArray(raw);
    if (!arr) {
      logger.warn('Shoppable hotspots: failed to parse JSON from model');
      return [];
    }

    const allowed = new Map(
      matches.map((m) => [`${m.table}:${String(m.id)}`, m])
    );

    const out: ShoppableHotspot[] = [];
    for (const row of arr) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const table = typeof r.catalogTable === 'string' ? r.catalogTable : '';
      const idRaw = r.catalogId;
      const id =
        typeof idRaw === 'number' || typeof idRaw === 'string' ? idRaw : null;
      if (!table || id === null) continue;
      const key = `${table}:${String(id)}`;
      if (!allowed.has(key)) continue;
      const x = clampPct(r.x);
      const y = clampPct(r.y);
      if (x === null || y === null) continue;
      const src = allowed.get(key)!;
      out.push({
        x,
        y,
        catalogTable: table,
        catalogId: id,
        label: src.label,
      });
    }

    logger.info({ count: out.length }, 'Shoppable hotspots inferred');
    return out;
  } catch (e) {
    logger.warn({ err: String(e) }, 'Shoppable hotspots inference skipped');
    return [];
  }
}
