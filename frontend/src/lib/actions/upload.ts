'use server';

import { revalidatePath } from 'next/cache';
import { serverFetch } from '@/lib/api-client';

/**
 * Upload Server Actions
 * Handle file uploads to S3 via presigned URLs
 * 
 * Flow:
 * 1. Client requests presigned URL
 * 2. Client uploads directly to S3
 * 3. Client confirms upload
 * 4. Backend creates asset version record
 */

// ============================================
// Types
// ============================================

type BucketType = 'floorplans' | 'moodboards' | 'renders' | 'exports';

type AssetType = 
  | 'FLOORPLAN_ORIGINAL'
  | 'FLOORPLAN_ANALYZED'
  | 'MOODBOARD'
  | 'ELEVATION'
  | 'INTERIOR_VIEW'
  | 'COMPONENT_RENDER'
  | 'EXPORT_PACKAGE';

interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  bucket: BucketType;
  expiresIn: number;
  instructions: {
    method: string;
    headers: Record<string, string>;
  };
}

interface ConfirmUploadResponse {
  id: string;
  projectId: string;
  roomId?: string;
  assetType: AssetType;
  version: number;
  s3Bucket: string;
  s3Key: string;
  downloadUrl: string;
}

interface AssetVersion {
  id: string;
  projectId: string;
  roomId?: string;
  assetType: AssetType;
  version: number;
  s3Bucket: string;
  s3Key: string;
  contentType: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
  isLatest: boolean;
  downloadUrl?: string;
  createdAt: string;
}

// ============================================
// Actions
// ============================================

/**
 * Get a presigned URL for uploading a file
 */
export async function getUploadUrl(
  filename: string,
  contentType: string,
  bucket: BucketType,
  projectId: string,
  roomId?: string,
  assetType?: AssetType
): Promise<{ success: boolean; data?: PresignedUrlResponse; error?: string }> {
  const response = await serverFetch<PresignedUrlResponse>('/api/uploads/presigned-url', {
    method: 'POST',
    body: {
      filename,
      contentType,
      bucket,
      projectId,
      roomId,
      assetType,
    },
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to get upload URL',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Confirm that an upload has completed
 * This creates the asset version record in the database
 */
export async function confirmUpload(
  key: string,
  bucket: BucketType,
  projectId: string,
  assetType: AssetType,
  contentType: string,
  roomId?: string,
  fileSize?: number,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; data?: ConfirmUploadResponse; error?: string }> {
  const response = await serverFetch<ConfirmUploadResponse>('/api/uploads/confirm', {
    method: 'POST',
    body: {
      key,
      bucket,
      projectId,
      roomId,
      assetType,
      contentType,
      fileSize,
      metadata,
    },
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to confirm upload',
    };
  }

  revalidatePath(`/project/${projectId}`);

  return {
    success: true,
    data: response.data,
  };
}

/**
 * Get a presigned download URL for a file
 */
export async function getDownloadUrl(
  key: string,
  bucket: BucketType
): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
  const response = await serverFetch<{ downloadUrl: string; expiresIn: number }>(
    '/api/uploads/download-url',
    {
      method: 'POST',
      body: { key, bucket },
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to get download URL',
    };
  }

  return {
    success: true,
    downloadUrl: response.data?.downloadUrl,
  };
}

/**
 * Get all assets for a project
 */
export async function getProjectAssets(
  projectId: string,
  options?: {
    assetType?: AssetType;
    roomId?: string;
    latestOnly?: boolean;
  }
): Promise<AssetVersion[]> {
  const params: Record<string, string> = {};
  
  if (options?.assetType) params.assetType = options.assetType;
  if (options?.roomId) params.roomId = options.roomId;
  if (options?.latestOnly !== undefined) params.latestOnly = String(options.latestOnly);

  const response = await serverFetch<AssetVersion[]>(
    `/api/uploads/assets/${projectId}`,
    { params }
  );

  if (!response.success) {
    console.error('Failed to fetch assets:', response.error);
    return [];
  }

  return response.data || [];
}

/**
 * Get all versions of an asset
 */
export async function getAssetVersions(
  projectId: string,
  assetId: string
): Promise<AssetVersion[]> {
  const response = await serverFetch<AssetVersion[]>(
    `/api/uploads/assets/${projectId}/${assetId}/versions`
  );

  if (!response.success) {
    console.error('Failed to fetch asset versions:', response.error);
    return [];
  }

  return response.data || [];
}

/**
 * Delete an asset
 */
export async function deleteAsset(
  assetId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await serverFetch<{ id: string; deleted: boolean }>(
    `/api/uploads/assets/${assetId}`,
    { method: 'DELETE' }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to delete asset',
    };
  }

  revalidatePath(`/project/${projectId}`);

  return { success: true };
}

// ============================================
// Client-Side Upload Helper
// ============================================

/**
 * Full upload flow (to be called from client component)
 * 
 * Usage in client component:
 * ```ts
 * const { data } = await getUploadUrl(...);
 * await uploadToS3(data.uploadUrl, file, data.instructions.headers);
 * await confirmUpload(data.key, ...);
 * ```
 */
export async function uploadFile(
  file: File,
  bucket: BucketType,
  projectId: string,
  assetType: AssetType,
  roomId?: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; data?: ConfirmUploadResponse; error?: string }> {
  // Step 1: Get presigned URL
  const urlResult = await getUploadUrl(
    file.name,
    file.type,
    bucket,
    projectId,
    roomId,
    assetType
  );

  if (!urlResult.success || !urlResult.data) {
    return {
      success: false,
      error: urlResult.error || 'Failed to get upload URL',
    };
  }

  // Note: Step 2 (actual upload to S3) must happen client-side
  // because we can't stream files in server actions
  // Return the presigned URL info for client to complete

  return {
    success: true,
    data: urlResult.data as unknown as ConfirmUploadResponse,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get bucket type from asset type
 */
export function getBucketForAssetType(assetType: AssetType): BucketType {
  const mapping: Record<AssetType, BucketType> = {
    FLOORPLAN_ORIGINAL: 'floorplans',
    FLOORPLAN_ANALYZED: 'floorplans',
    MOODBOARD: 'moodboards',
    ELEVATION: 'renders',
    INTERIOR_VIEW: 'renders',
    COMPONENT_RENDER: 'renders',
    EXPORT_PACKAGE: 'exports',
  };
  return mapping[assetType];
}

/**
 * Validate file type for upload
 */
export function isValidFileType(
  file: File,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

