import type { Pool } from 'pg';
import type { DesignIntent } from '../../design-engine/types';
import { logger } from '../../lib/logger';
import {
  SEARCHABLE_COLUMNS,
  type CatalogTableName,
  buildIntentSearchBlob,
  escapeLikePattern,
  selectCatalogTables,
  tokenizeIntentSearchText,
} from './catalogTables';

const MIN_TOKEN_SCORE = 1;
const MAX_ROWS_PER_TABLE_FETCH = 24;
const MAX_ROWS_PER_TABLE_AFTER_SCORE = 3;
const MAX_TOTAL_MATCHES = 15;
const MIN_SCORE_FOR_INCLUDE = 1;

export interface CatalogMatch {
  table: CatalogTableName;
  id: string | number;
  label: string;
  summary: string;
  score: number;
}

export interface ProductCatalogResolution {
  promptSection: string;
  matches: CatalogMatch[];
  resolvedAt: string;
}

function rowToSearchText(table: CatalogTableName, row: Record<string, unknown>): string {
  const cols = SEARCHABLE_COLUMNS[table];
  const parts: string[] = [];
  for (const c of cols) {
    const v = row[c];
    if (v != null && v !== '') parts.push(String(v));
  }
  return parts.join(' ').toLowerCase();
}

function scoreRowAgainstTokens(searchText: string, tokens: string[]): number {
  let score = 0;
  for (const t of tokens) {
    if (searchText.includes(t)) score += 1;
  }
  return score;
}

function pickId(row: Record<string, unknown>): string | number {
  if (row.id != null) return row.id as string | number;
  return 'unknown';
}

function buildLabel(table: CatalogTableName, row: Record<string, unknown>): string {
  const r = row as Record<string, string | null | undefined>;
  const candidates = [
    r.name,
    r.product_name,
    r.style_name,
    r.variation_name,
    r.component_name,
    r.generic_name,
  ].filter(Boolean);
  let base = candidates[0] || `${table} #${pickId(row)}`;
  if (r.brand) base = `${base} (${r.brand})`;
  return base;
}

function buildSummary(table: CatalogTableName, row: Record<string, unknown>): string {
  const r = row as Record<string, string | number | null | undefined>;
  const bits: string[] = [];
  const push = (k: string, label?: string) => {
    const v = r[k];
    if (v != null && v !== '') bits.push(`${label || k}: ${v}`);
  };
  push('colour', 'colour');
  push('color', 'color');
  push('category');
  push('material');
  push('primary_material_type', 'material');
  push('finish');
  push('price');
  const desc = r.description;
  if (typeof desc === 'string' && desc.trim()) {
    const short = desc.trim().slice(0, 160);
    bits.push(short + (desc.length > 160 ? '…' : ''));
  }
  return bits.slice(0, 6).join(' · ') || table;
}

function buildWhereClause(
  table: CatalogTableName,
  tokens: string[]
): { sql: string; params: string[] } {
  const cols = SEARCHABLE_COLUMNS[table];
  const params: string[] = [];
  const orParts: string[] = [];
  let p = 1;
  for (const token of tokens) {
    const pat = `%${escapeLikePattern(token)}%`;
    params.push(pat);
    for (const col of cols) {
      orParts.push(`"${col}"::text ILIKE $${p} ESCAPE '\\'`);
    }
    p += 1;
  }
  if (orParts.length === 0) {
    return { sql: 'FALSE', params: [] };
  }
  return { sql: `(${orParts.join(' OR ')})`, params };
}

async function queryTable(
  pool: Pool,
  table: CatalogTableName,
  tokens: string[]
): Promise<Record<string, unknown>[]> {
  if (tokens.length === 0) return [];
  const { sql, params } = buildWhereClause(table, tokens);
  if (sql === 'FALSE') return [];
  const query = `SELECT * FROM "${table}" WHERE ${sql} ORDER BY id DESC NULLS LAST LIMIT ${MAX_ROWS_PER_TABLE_FETCH}`;
  const res = await pool.query(query, params);
  return res.rows as Record<string, unknown>[];
}

function buildPromptSection(matches: CatalogMatch[], strictSofaTiles = false): string {
  const lines = matches.map(
    (m) =>
      `- [${m.table} id=${m.id}] ${m.label}. ${m.summary}`
  );
  return [
    '=== REAL CATALOG PRODUCTS (USE WHEN THEY FIT USER INTENT) ===',
    'The following items exist in our product database. Prefer depicting these exact products or very close visual equivalents when they align with the room type, style, and user intent below.',
    strictSofaTiles
      ? 'STRICT VERIFICATION MODE: For sofas and tiles/flooring, use only listed catalog items. Do not invent new sofas/tiles.'
      : 'If the user asks for something not represented here, you may still invent appropriate pieces (generative fill). Do not ignore the rest of the design brief.',
    '',
    ...lines,
    '',
  ].join('\n');
}

/**
 * Resolve catalog rows from Supabase using token overlap on searchable columns.
 * Returns null when catalog DB is unavailable, on error, or when there are no qualifying matches.
 */
export async function resolveProductsForIntent(
  pool: Pool | null,
  intent: DesignIntent,
  options?: { strictSofaTiles?: boolean }
): Promise<ProductCatalogResolution | null> {
  if (!pool) {
    return null;
  }

  const blob = buildIntentSearchBlob(intent);
  const tokens = tokenizeIntentSearchText(blob);
  if (tokens.length === 0) {
    logger.debug('Product catalog: no search tokens from intent');
    return null;
  }

  const tables = selectCatalogTables(intent.roomType, blob);
  const allScored: CatalogMatch[] = [];

  try {
    for (const table of tables) {
      const rows = await queryTable(pool, table, tokens);
      for (const row of rows) {
        const text = rowToSearchText(table, row);
        const score = scoreRowAgainstTokens(text, tokens);
        if (score < MIN_TOKEN_SCORE) continue;
        allScored.push({
          table,
          id: pickId(row),
          label: buildLabel(table, row),
          summary: buildSummary(table, row),
          score,
        });
      }
    }
  } catch (e) {
    logger.warn({ err: String(e) }, 'Product catalog query failed; continuing without catalog');
    return null;
  }

  allScored.sort((a, b) => b.score - a.score || String(a.label).localeCompare(String(b.label)));

  const dedup = new Set<string>();
  const picked: CatalogMatch[] = [];
  for (const m of allScored) {
    const key = `${m.table}:${m.id}`;
    if (dedup.has(key)) continue;
    const perTable = picked.filter((x) => x.table === m.table).length;
    if (perTable >= MAX_ROWS_PER_TABLE_AFTER_SCORE) continue;
    if (m.score < MIN_SCORE_FOR_INCLUDE) continue;
    dedup.add(key);
    picked.push(m);
    if (picked.length >= MAX_TOTAL_MATCHES) break;
  }

  if (picked.length === 0) {
    logger.debug({ tables: tables.length, tokenCount: tokens.length }, 'Product catalog: zero scored matches');
    return null;
  }

  logger.info(
    {
      matchCount: picked.length,
      tables: [...new Set(picked.map((p) => p.table))],
    },
    'Product catalog matches resolved'
  );

  return {
    promptSection: buildPromptSection(picked, Boolean(options?.strictSofaTiles)),
    matches: picked,
    resolvedAt: new Date().toISOString(),
  };
}
