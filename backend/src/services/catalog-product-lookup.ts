/**
 * Read-only lookups against the optional product catalog Postgres (Supabase).
 * Table names are whitelisted; only SELECT by primary key.
 */

import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../lib/logger';

export interface CatalogProductPriceResult {
  catalogTable: string;
  catalogId: string;
  /** Primary display title */
  title: string;
  /** Secondary line (brand, category, etc.) */
  subtitle?: string;
  /** Listed DB price when present */
  price: number | null;
  currency: string;
  hasPrice: boolean;
  ctaHint: 'ADD' | 'EXPLORE';
  /** Short material / description snippet for “material” context */
  materialNote?: string;
}

const ALLOWED: Record<
  string,
  { sql: string }
> = {
  sofa_products: {
    sql: `SELECT name, brand, price, description, primary_material_type
          FROM sofa_products WHERE id = $1::bigint LIMIT 1`,
  },
  chair_products: {
    sql: `SELECT name, brand, price, description, primary_material_type
          FROM chair_products WHERE id = $1::bigint LIMIT 1`,
  },
  table_products: {
    sql: `SELECT name, brand, price, description, primary_material_type
          FROM table_products WHERE id = $1::bigint LIMIT 1`,
  },
  lighting_products: {
    sql: `SELECT name, brand, price, description, primary_material_type
          FROM lighting_products WHERE id = $1::bigint LIMIT 1`,
  },
  mattress_products: {
    sql: `SELECT name, price, description
          FROM mattress_products WHERE id = $1::bigint LIMIT 1`,
  },
  mytyles_vitrified_tiles: {
    sql: `SELECT product_name AS name, category, price, description, styles
          FROM mytyles_vitrified_tiles WHERE id = $1::int LIMIT 1`,
  },
  ceiling_options: {
    sql: `SELECT style_name AS name, category, material, texture, finish
          FROM ceiling_options WHERE id = $1::int LIMIT 1`,
  },
  flooring_options: {
    sql: `SELECT style_name AS name, category, material, texture, finish
          FROM flooring_options WHERE id = $1::int LIMIT 1`,
  },
  glass_partition_options: {
    sql: `SELECT style_name AS name, category, description, material
          FROM glass_partition_options WHERE id = $1::int LIMIT 1`,
  },
  product_variations: {
    sql: `SELECT variation_name AS name, component_name, material, color, texture
          FROM product_variations WHERE id = $1::bigint LIMIT 1`,
  },
  room_variations: {
    sql: `SELECT component_type AS name, color, material, texture, finish, size
          FROM room_variations WHERE id = $1::bigint LIMIT 1`,
  },
};

let pool: Pool | null = null;

function stripSslMode(url: string): string {
  return url
    .replace(/[?&]sslmode=[^&]*/gi, '')
    .replace(/\?&/g, '?')
    .replace(/\?$/, '');
}

function getPool(): Pool | null {
  const url = config.productCatalogDatabaseUrl?.trim();
  if (!url) return null;
  const normalized = stripSslMode(url);
  if (!pool) {
    const local = /localhost|127\.0\.0\.1/i.test(normalized);
    pool = new Pool({
      connectionString: normalized,
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      ssl: local ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

function rowToResult(
  table: string,
  catalogId: string,
  row: Record<string, unknown>
): CatalogProductPriceResult {
  const name = String(row.name ?? row.style_name ?? 'Product');
  const brand = row.brand != null ? String(row.brand) : '';
  const priceRaw = row.price;
  let price: number | null = null;
  if (priceRaw != null && priceRaw !== '') {
    const n = typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw));
    price = Number.isFinite(n) ? n : null;
  }
  const mat =
    row.primary_material_type ||
    row.material ||
    row.texture ||
    row.description ||
    row.styles;
  const materialNote =
    mat != null && String(mat).trim() ? String(mat).trim().slice(0, 200) : undefined;

  return {
    catalogTable: table,
    catalogId,
    title: name,
    subtitle: brand || (row.category != null ? String(row.category) : undefined),
    price,
    currency: 'INR',
    hasPrice: price != null,
    ctaHint: price != null ? 'ADD' : 'EXPLORE',
    materialNote,
  };
}

export async function lookupCatalogProduct(
  table: string,
  id: string
): Promise<CatalogProductPriceResult | null> {
  const def = ALLOWED[table];
  if (!def || !/^\d+$/.test(id)) {
    return null;
  }

  const p = getPool();
  if (!p) {
    logger.warn('PRODUCT_CATALOG_DATABASE_URL not set; catalog price lookup skipped');
    return null;
  }

  try {
    const r = await p.query(def.sql, [id]);
    if (r.rows.length === 0) return null;
    return rowToResult(table, id, r.rows[0] as Record<string, unknown>);
  } catch (e) {
    logger.warn({ err: String(e), table, id }, 'Catalog product lookup failed');
    return null;
  }
}

export function isAllowedCatalogTable(table: string): boolean {
  return table in ALLOWED;
}
