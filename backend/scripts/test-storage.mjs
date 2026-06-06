import { config as dotenvConfig } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../.env') });

const url =
  process.env.SUPABASE_URL?.trim() ||
  (() => {
    const db = process.env.DATABASE_URL || '';
    const match = db.match(/postgres\.([a-z0-9]+)/i);
    return match?.[1] ? `https://${match[1]}.supabase.co` : '';
  })();

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const buckets = {
  floorplans: process.env.S3_BUCKET_FLOORPLANS || 'floorplans',
  moodboards: process.env.S3_BUCKET_MOODBOARDS || 'moodboards',
  renders: process.env.S3_BUCKET_RENDERS || 'renders',
  exports: process.env.S3_BUCKET_EXPORTS || 'exports',
};

if (!url || !key) {
  console.error('FAIL: Set SUPABASE_URL (or DATABASE_URL with project ref) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testBucket(name, bucket) {
  const result = { bucket, name, upload: null, download: null, signedUrl: null };
  const testKey = `_healthcheck/${Date.now()}-test.txt`;
  const body = Buffer.from('tatvaops storage healthcheck');

  try {
    const { error: upErr } = await supabase.storage.from(bucket).upload(testKey, body, {
      contentType: 'text/plain',
      upsert: true,
    });
    result.upload = upErr ? `${upErr.message}` : 'OK';
    if (upErr) return result;

    const { data: dl, error: dlErr } = await supabase.storage.from(bucket).download(testKey);
    result.download = dlErr ? dlErr.message : dl ? 'OK' : 'empty';

    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(testKey, 300);
    result.signedUrl = signErr ? signErr.message : signed?.signedUrl ? 'OK' : 'missing';

    await supabase.storage.from(bucket).remove([testKey]);
  } catch (e) {
    result.upload = e.message;
  }

  return result;
}

console.log(`Supabase: ${url}`);
console.log('---');

let allOk = true;
for (const [name, bucket] of Object.entries(buckets)) {
  const r = await testBucket(name, bucket);
  const ok = r.upload === 'OK' && r.download === 'OK' && r.signedUrl === 'OK';
  if (!ok) allOk = false;
  console.log(`[${name}] ${bucket}`);
  console.log(`  Upload:      ${r.upload}`);
  console.log(`  Download:    ${r.download}`);
  console.log(`  Signed URL:  ${r.signedUrl}`);
}

console.log('---');
console.log(allOk ? 'RESULT: ALL BUCKETS OK' : 'RESULT: ONE OR MORE CHECKS FAILED');
process.exit(allOk ? 0 : 1);
