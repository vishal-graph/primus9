import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { createStorageSupabaseClient } from '../lib/supabase-storage-client';

/**
 * Storage Service — Supabase Storage
 * Replaces AWS S3. DB columns s3Bucket/s3Key are kept for compatibility.
 */

export type BucketType = 'floorplans' | 'moodboards' | 'renders' | 'exports';

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
      floorplans: config.s3BucketFloorplans,
      moodboards: config.s3BucketMoodboards,
      renders: config.s3BucketRenders,
      exports: config.s3BucketExports,
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
      throw new Error(error?.message || 'Failed to create signed upload URL');
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
}

export const storageService = new StorageService();
