/**
 * TatvaOps Vision - Object Storage Utilities (Supabase Storage)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url =
    process.env.SUPABASE_URL?.trim() ||
    (() => {
      const db = process.env.DATABASE_URL || '';
      const match = db.match(/postgres\.([a-z0-9]+)/i);
      return match?.[1] ? `https://${match[1]}.supabase.co` : '';
    })();

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for storage');
  }

  supabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
}

function resolveBucketName(name: string): string {
  const floorplans = process.env.S3_BUCKET_FLOORPLANS || 'floorplans';
  const moodboards = process.env.S3_BUCKET_MOODBOARDS || 'moodboards';
  const renders = process.env.S3_BUCKET_RENDERS || 'renders';
  const exportsBucket = process.env.S3_BUCKET_EXPORTS || 'exports';
  const known = [floorplans, moodboards, renders, exportsBucket];
  if (known.includes(name)) return name;

  const lower = name.toLowerCase();
  if (lower.includes('floorplan')) return floorplans;
  if (lower.includes('moodboard')) return moodboards;
  if (lower.includes('export')) return exportsBucket;
  if (lower.includes('render') || lower.includes('elevation') || lower.includes('isometric')) {
    return renders;
  }
  return name;
}

interface UploadOptions {
  bucket: string;
  key: string;
  body: Buffer | string;
  contentType: string;
  metadata?: Record<string, string>;
}

/** Upload a file to Supabase Storage. */
export async function uploadToS3(options: UploadOptions): Promise<void> {
  const { bucket, key, body, contentType } = options;
  const bucketName = resolveBucketName(bucket);
  const bodyBuffer = typeof body === 'string' ? Buffer.from(body) : body;

  try {
    const { error } = await getSupabase()
      .storage
      .from(bucketName)
      .upload(key, bodyBuffer, { contentType, upsert: true });

    if (error) throw error;
    logger.debug('Storage upload successful', { bucket: bucketName, key });
  } catch (error) {
    logger.error('Storage upload failed', { bucket: bucketName, key, error: String(error) });
    throw new Error(`Failed to upload to storage: ${error}`);
  }
}

/** Download a file from Supabase Storage. */
export async function downloadFromS3(
  bucket: string,
  key: string
): Promise<{ data: Buffer; contentType: string | undefined }> {
  const bucketName = resolveBucketName(bucket);

  try {
    const { data, error } = await getSupabase().storage.from(bucketName).download(key);
    if (error || !data) throw error || new Error('Empty response');

    const arrayBuffer = await data.arrayBuffer();
    return {
      data: Buffer.from(arrayBuffer),
      contentType: data.type || undefined,
    };
  } catch (error) {
    logger.error('Storage download failed', { bucket: bucketName, key, error: String(error) });
    throw new Error(`Failed to download from storage: ${error}`);
  }
}

/** Generate a signed URL for reading an object. */
export async function generateSignedUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const bucketName = resolveBucketName(bucket);

  try {
    const { data, error } = await getSupabase()
      .storage
      .from(bucketName)
      .createSignedUrl(key, expiresIn);

    if (error || !data?.signedUrl) throw error || new Error('No signed URL');
    return data.signedUrl;
  } catch (error) {
    logger.error('Failed to generate signed URL', { bucket: bucketName, key, error: String(error) });
    throw new Error(`Failed to generate signed URL: ${error}`);
  }
}

/** s3://bucket/key — kept for DB compatibility. */
export function isS3Url(url: string): boolean {
  return url.startsWith('s3://');
}

export function parseS3Url(url: string): { bucket: string; key: string } {
  if (!isS3Url(url)) {
    throw new Error(`Invalid storage URL: ${url}`);
  }

  const withoutProtocol = url.slice(5);
  const slashIndex = withoutProtocol.indexOf('/');
  if (slashIndex === -1) {
    throw new Error(`Invalid storage URL (no key): ${url}`);
  }

  return {
    bucket: withoutProtocol.slice(0, slashIndex),
    key: withoutProtocol.slice(slashIndex + 1),
  };
}

export function buildS3Url(bucket: string, key: string): string {
  return `s3://${bucket}/${key}`;
}

/** Public object URL when bucket is public in Supabase. */
export function getPublicStorageUrl(bucket: string, key: string): string {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    (() => {
      const db = process.env.DATABASE_URL || '';
      const match = db.match(/postgres\.([a-z0-9]+)/i);
      return match?.[1] ? `https://${match[1]}.supabase.co` : '';
    })();
  const bucketName = resolveBucketName(bucket);
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${url}/storage/v1/object/public/${bucketName}/${encodedKey}`;
}
