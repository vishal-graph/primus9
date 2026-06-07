import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { createStorageSupabaseClient } from '../lib/supabase-storage-client';
import { logger } from '../lib/logger';

/**
 * Storage Service — Supabase Storage
 * Replaces AWS S3. DB columns s3Bucket/s3Key are kept for compatibility.
 */

export type BucketType = 'floorplans' | 'moodboards' | 'renders' | 'exports';

/** Map legacy AWS bucket env values to Supabase bucket ids. */
function normalizeStorageBucket(name: string, fallback: BucketType): string {
  const trimmed = name?.trim() || '';
  if (!trimmed) return fallback;
  const lower = trimmed.toLowerCase();
  if (lower.includes('tatvaops-vision') || lower.includes('production-')) {
    if (lower.includes('floorplan')) return 'floorplans';
    if (lower.includes('moodboard')) return 'moodboards';
    if (lower.includes('export')) return 'exports';
    if (lower.includes('render') || lower.includes('elevation')) return 'renders';
    return fallback;
  }
  return trimmed;
}

export function isStorageNotFoundError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('not found') ||
    m.includes('does not exist') ||
    m.includes('object not found') ||
    m.includes('related resource')
  );
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

interface UploadOptions {
  bucket: BucketType;
  filename: string;
  contentType: string;
  userId: string;
  projectId?: string;
}

export class StorageService {
  private supabase: SupabaseClient;
  private bucketMap: Record<BucketType, string>;

  constructor() {
    this.supabase = createStorageSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);

    this.bucketMap = {
      floorplans: normalizeStorageBucket(config.s3BucketFloorplans, 'floorplans'),
      moodboards: normalizeStorageBucket(config.s3BucketMoodboards, 'moodboards'),
      renders: normalizeStorageBucket(config.s3BucketRenders, 'renders'),
      exports: normalizeStorageBucket(config.s3BucketExports, 'exports'),
    };
  }

  /** Resolve a stored bucket name (or legacy AWS name) to the Supabase bucket id. */
  resolveBucketName(name: string): string {
    const values = Object.values(this.bucketMap);
    if (values.includes(name)) return name;

    const lower = name.toLowerCase();
    if (lower.includes('floorplan')) return this.bucketMap.floorplans;
    if (lower.includes('moodboard')) return this.bucketMap.moodboards;
    if (lower.includes('export')) return this.bucketMap.exports;
    if (lower.includes('render') || lower.includes('elevation') || lower.includes('isometric')) {
      return this.bucketMap.renders;
    }

    return name;
  }

  bucketTypeFromName(name: string): BucketType | null {
    const resolved = this.resolveBucketName(name);
    for (const [type, bucketName] of Object.entries(this.bucketMap) as [BucketType, string][]) {
      if (bucketName === resolved) return type;
    }
    return null;
  }

  /**
   * Generate signed upload URL (client/server PUT).
   */
  async generateUploadUrl(options: UploadOptions): Promise<{ url: string; key: string }> {
    const { bucket, filename, contentType, userId, projectId } = options;
    const bucketName = this.bucketMap[bucket];

    const ext = filename.split('.').pop() || 'bin';
    const key = projectId
      ? `${userId}/${projectId}/${uuidv4()}.${ext}`
      : `${userId}/${uuidv4()}.${ext}`;

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(key, { upsert: true });

    if (error || !data?.signedUrl) {
      const msg = error?.message || 'Failed to create signed upload URL';

      if (isStorageNotFoundError(msg)) {
        await this.ensureBucketExists(bucketName, bucket);
        const retry = await this.supabase.storage
          .from(bucketName)
          .createSignedUploadUrl(key, { upsert: true });
        if (retry.data?.signedUrl) {
          return { url: retry.data.signedUrl, key: retry.data.path || key };
        }
      }

      throw new StorageError(
        `${msg} (bucket: ${bucketName}, project: ${config.supabaseUrl}). Create bucket in Supabase Storage or check SUPABASE_SERVICE_ROLE_KEY.`
      );
    }

    // Content-Type must match on PUT; Supabase signs without binding type in all versions,
    // but callers still send file.type (same as before with S3 presigned PUT).
    void contentType;

    return { url: data.signedUrl, key: data.path || key };
  }

  async generateDownloadUrl(bucket: BucketType, key: string): Promise<string> {
    const bucketName = this.bucketMap[bucket];
    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .createSignedUrl(key, config.s3SignedUrlExpiry);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || 'Failed to create signed download URL');
    }

    return data.signedUrl;
  }

  async downloadFile(
    bucketName: string,
    key: string
  ): Promise<{ data: Buffer; contentType: string | undefined }> {
    const resolved = this.resolveBucketName(bucketName);
    const { data, error } = await this.supabase.storage.from(resolved).download(key);

    if (error || !data) {
      throw new Error(error?.message || 'File not found in storage');
    }

    const arrayBuffer = await data.arrayBuffer();
    return {
      data: Buffer.from(arrayBuffer),
      contentType: data.type || undefined,
    };
  }

  async deleteFile(bucket: BucketType, key: string): Promise<void> {
    const bucketName = this.bucketMap[bucket];
    const { error } = await this.supabase.storage.from(bucketName).remove([key]);
    if (error) {
      throw new Error(error.message);
    }
  }

  /** Public URL — bucket must be public in Supabase dashboard. */
  getPublicUrl(bucket: BucketType, key: string): string {
    const bucketName = this.bucketMap[bucket];
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `${config.supabaseUrl}/storage/v1/object/public/${bucketName}/${encodedKey}`;
  }

  getBucketName(bucket: BucketType): string {
    return this.bucketMap[bucket];
  }

  getBucketNames(): Record<BucketType, string> {
    return { ...this.bucketMap };
  }

  /** Verify Supabase Storage and create missing buckets (Render / fresh projects). */
  async ensureReady(): Promise<void> {
    const { data: existing, error: listError } = await this.supabase.storage.listBuckets();
    if (listError) {
      throw new StorageError(
        `Supabase Storage listBuckets failed: ${listError.message}. Verify SUPABASE_SERVICE_ROLE_KEY on Render.`
      );
    }

    const existingNames = new Set((existing ?? []).map((b) => b.name));
    for (const [type, bucketName] of Object.entries(this.bucketMap) as [BucketType, string][]) {
      if (existingNames.has(bucketName)) continue;

      const isPublic = type !== 'exports';
      const { error: createError } = await this.supabase.storage.createBucket(bucketName, {
        public: isPublic,
      });

      if (createError && !/already exists/i.test(createError.message)) {
        throw new StorageError(
          `Failed to create storage bucket "${bucketName}": ${createError.message}`
        );
      }

      logger.info({ bucket: bucketName, public: isPublic }, 'Created Supabase storage bucket');
      existingNames.add(bucketName);
    }

    const probeKey = `_startup/${Date.now()}-probe.txt`;
    const { error: signError } = await this.supabase.storage
      .from(this.bucketMap.floorplans)
      .createSignedUploadUrl(probeKey, { upsert: true });

    if (signError) {
      throw new StorageError(
        `Storage upload URL probe failed for bucket "${this.bucketMap.floorplans}": ${signError.message}`
      );
    }

    logger.info(
      { supabaseUrl: config.supabaseUrl, buckets: this.bucketMap },
      'Supabase Storage ready'
    );
  }

  private async ensureBucketExists(bucketName: string, type: BucketType): Promise<void> {
    const { data: existing } = await this.supabase.storage.listBuckets();
    if (existing?.some((b) => b.name === bucketName)) return;

    const isPublic = type !== 'exports';
    const { error } = await this.supabase.storage.createBucket(bucketName, { public: isPublic });
    if (error && !/already exists/i.test(error.message)) {
      throw new StorageError(`Bucket "${bucketName}" missing: ${error.message}`);
    }
  }
}

export const storageService = new StorageService();
