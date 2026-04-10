import { Pool } from 'pg';

let pool: Pool | null = null;
let poolUrl: string | null = null;

/** pg v8 may treat sslmode=require as strict verify; strip and use explicit ssl below. */
export function stripSslModeFromConnectionString(url: string): string {
  return url
    .replace(/[?&]sslmode=[^&]*/gi, '')
    .replace(/\?&/g, '?')
    .replace(/\?$/, '');
}

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * Small dedicated pool for Supabase product catalog (separate from Prisma app DB).
 */
export function getCatalogPool(connectionUrl: string | undefined): Pool | null {
  if (!connectionUrl?.trim()) {
    return null;
  }
  const normalized = stripSslModeFromConnectionString(connectionUrl.trim());
  if (pool && poolUrl === normalized) {
    return pool;
  }
  if (pool) {
    void pool.end().catch(() => {});
    pool = null;
    poolUrl = null;
  }
  // max: 1 — catalog queries run sequentially per job; avoids exhausting Supabase Session
  // pool when the same project also serves DATABASE_URL for Prisma + BullMQ concurrency > 1.
  pool = new Pool({
    connectionString: normalized,
    max: Number(process.env.PRODUCT_CATALOG_POOL_MAX ?? '1') || 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 20_000,
    ssl: isLocalhostUrl(normalized) ? false : { rejectUnauthorized: false },
  });
  poolUrl = normalized;
  return pool;
}

export async function closeCatalogPool(): Promise<void> {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
    poolUrl = null;
  }
}
