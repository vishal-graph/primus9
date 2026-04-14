/**
 * Link component extraction rows to moodboard-resolved catalog SKUs,
 * for deterministic shoppable hotspot inference on the bird-view image.
 */

import type { ComponentExtractionRow } from '../design-engine/component-extraction/types';
import type { CatalogMatchForHotspot } from './shoppable-hotspots';

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'are',
  'was',
  'has',
  'have',
  'into',
  'each',
  'per',
  'set',
  'one',
  'two',
  'off',
  'its',
]);

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

/** Cosine-like overlap on token sets, in [0,1]. */
function overlapScore(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let n = 0;
  for (const t of A) {
    if (B.has(t)) n += 1;
  }
  return n / Math.sqrt(A.size * B.size);
}

export type RowCatalogMatch = {
  table: string;
  id: string | number;
  label: string;
  score?: number;
};

export type EnrichedExtractionRow = ComponentExtractionRow & {
  catalogMatch?: RowCatalogMatch;
};

/**
 * For each extraction row, pick the best moodboard catalog match by lexical similarity.
 * Returns unique catalog rows that were linked (for hotspot vision).
 */
export function enrichExtractionRowsWithCatalog(
  rows: ComponentExtractionRow[],
  moodboardMatches: CatalogMatchForHotspot[]
): { rows: EnrichedExtractionRow[]; catalogSubset: CatalogMatchForHotspot[] } {
  if (!moodboardMatches.length) {
    return { rows: rows.map((r) => ({ ...r })), catalogSubset: [] };
  }

  const linkedKeys = new Set<string>();

  const enriched: EnrichedExtractionRow[] = rows.map((row) => {
    const blob = [row.componentName, row.description, row.material, row.componentCategory]
      .filter(Boolean)
      .join(' ');
    const name = row.componentName || '';

    let best: { m: CatalogMatchForHotspot; score: number } | null = null;
    for (const m of moodboardMatches) {
      let s = Math.max(overlapScore(blob, m.label), overlapScore(name, m.label));
      const ln = m.label.toLowerCase();
      const cn = name.toLowerCase().trim();
      if (cn.length >= 4 && ln.includes(cn)) {
        s = Math.max(s, 0.55);
      }
      if (!best || s > best.score) {
        best = { m, score: s };
      }
    }

    const THRESH = 0.22;
    if (best && best.score >= THRESH) {
      const key = `${best.m.table}:${String(best.m.id)}`;
      linkedKeys.add(key);
      return {
        ...row,
        catalogMatch: {
          table: best.m.table,
          id: best.m.id,
          label: best.m.label,
          score: Number(best.score.toFixed(3)),
        },
      };
    }
    return { ...row };
  });

  const catalogSubset = moodboardMatches.filter((m) =>
    linkedKeys.has(`${m.table}:${String(m.id)}`)
  );

  return { rows: enriched, catalogSubset };
}
