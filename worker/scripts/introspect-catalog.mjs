/**
 * One-off: print public catalog table columns. Run with:
 *   PRODUCT_CATALOG_DATABASE_URL=... node scripts/introspect-catalog.mjs
 */
import pg from 'pg';

let url = process.env.PRODUCT_CATALOG_DATABASE_URL;
if (!url) {
  console.error('Set PRODUCT_CATALOG_DATABASE_URL');
  process.exit(1);
}
// Avoid pg v8 treating sslmode=require as verify-full (breaks Supabase chain in some Node versions)
url = url.replace(/[?&]sslmode=[^&]*/gi, '').replace(/\?$/, '');

const tables = [
  'ceiling_options',
  'chair_products',
  'flooring_options',
  'glass_partition_options',
  'lighting_products',
  'mattress_products',
  'mytyles_vitrified_tiles',
  'product_variations',
  'room_variations',
  'sofa_products',
  'table_products',
];

const useSsl = !/localhost|127\.0\.0\.1/i.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

await client.connect();
const r = await client.query(
  `SELECT table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = ANY($1::text[])
   ORDER BY table_name, ordinal_position`,
  [tables]
);
let cur = '';
for (const row of r.rows) {
  if (row.table_name !== cur) {
    cur = row.table_name;
    console.log('\n' + cur);
  }
  console.log('  ', row.column_name, row.data_type);
}
await client.end();
