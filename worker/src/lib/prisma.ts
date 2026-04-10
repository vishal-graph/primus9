import { PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient for the worker process.
 *
 * Multiple `new PrismaClient()` instances (across handlers) each open their own
 * connection pools and exhaust Supabase pooler session slots →
 * "MaxClientsInSessionMode: max clients reached".
 *
 * Set `WORKER_PRISMA_CONNECTION_LIMIT` (default 1) for Supabase Session pooler /
 * small pool_size. Raise only if you use Transaction mode (port 6543) or a larger pool.
 */
const globalForPrisma = globalThis as unknown as { __tatvaopsWorkerPrisma?: PrismaClient };

function buildWorkerDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) return url;
  if (/[?&]connection_limit=/i.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  const limit = process.env.WORKER_PRISMA_CONNECTION_LIMIT ?? '1';
  return `${url}${sep}connection_limit=${encodeURIComponent(limit)}`;
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__tatvaopsWorkerPrisma) {
    globalForPrisma.__tatvaopsWorkerPrisma = new PrismaClient({
      datasources: { db: { url: buildWorkerDatabaseUrl() } },
    });
  }
  return globalForPrisma.__tatvaopsWorkerPrisma;
}

export async function disconnectWorkerPrisma(): Promise<void> {
  if (globalForPrisma.__tatvaopsWorkerPrisma) {
    await globalForPrisma.__tatvaopsWorkerPrisma.$disconnect();
    globalForPrisma.__tatvaopsWorkerPrisma = undefined;
  }
}

/** @deprecated Prefer `getPrisma()` — kept for imports that expect a stable binding */
export const prismaClient = getPrisma();
