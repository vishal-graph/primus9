/**
 * Parse catalog match rows from RoomMoodboard.metadata.productCatalog.matches
 * (same shape as moodboard generation / 2D views hotspot pipeline).
 */

import type { CatalogMatchForHotspot } from './shoppable-hotspots';

export function catalogMatchesFromMoodboardMetadata(metadata: unknown): CatalogMatchForHotspot[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const pc = (metadata as Record<string, unknown>).productCatalog;
  if (!pc || typeof pc !== 'object') return [];
  const matches = (pc as Record<string, unknown>).matches;
  if (!Array.isArray(matches)) return [];
  const out: CatalogMatchForHotspot[] = [];
  for (const m of matches) {
    if (!m || typeof m !== 'object') continue;
    const o = m as Record<string, unknown>;
    const table = typeof o.table === 'string' ? o.table : '';
    const id = o.id;
    const label = typeof o.label === 'string' ? o.label : '';
    if (!table || (typeof id !== 'number' && typeof id !== 'string')) continue;
    out.push({ table, id, label: label || `${table} #${id}` });
  }
  return out;
}
