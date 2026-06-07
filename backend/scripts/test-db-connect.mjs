import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../.env') });

// Simulate production normalization (5432 session → 6543 transaction + pgbouncer)
let url = process.env.DATABASE_URL ?? '';
url = url.trim().replace(/^["']|["']$/g, '');
if (url.includes('pooler.supabase.com') && url.includes(':5432')) {
  url = url.replace(':5432', ':6543');
  if (!url.includes('pgbouncer=true')) {
    url += url.includes('?') ? '&' : '?';
    url += 'pgbouncer=true';
  }
}
if (!/[?&]connection_limit=/i.test(url)) {
  url += url.includes('?') ? '&' : '?';
  url += 'connection_limit=3';
}

const safe = url.replace(/:([^:@/]+)@/, ':***@');
console.log('DATABASE_URL (redacted):', safe);

const prisma = new PrismaClient({ datasources: { db: { url } } });
try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log('OK: database connected');
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

