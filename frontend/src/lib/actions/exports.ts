/**
 * TatvaOps Vision - Export Server Actions
 * 
 * Handles PDF export generation for moodboards and design documents.
 */

'use server';

import { getServerAuthHeaders } from '@/lib/server-auth';
import { getApiBase } from '@/lib/api-base';

// ============================================
// TYPES
// ============================================

export type ExportAssetType = 'MOODBOARD_PDF' | 'ELEVATION_PDF' | 'FULL_DESIGN_PDF';
export type ExportAssetStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ExportAsset {
  id: string;
  type: ExportAssetType;
  status: ExportAssetStatus;
  createdAt: string;
  completedAt?: string;
  s3Key?: string;
  filename?: string;
  error?: string;
  metadata?: {
    roomCount?: number;
    rooms?: Array<{ name: string; style: string }>;
  };
}

export interface CreateExportResponse {
  success: boolean;
  data?: {
    id: string;
    jobId?: string;
    status: ExportAssetStatus;
    message: string;
    roomCount?: number;
  };
  error?: string;
}

export interface GetExportResponse {
  success: boolean;
  data?: ExportAsset;
  error?: string;
}

// ============================================
// CREATE MOODBOARD PDF EXPORT
// ============================================

/**
 * Create a new moodboard PDF export job.
 * The PDF will be generated asynchronously by the worker.
 */
export async function createMoodboardPdfExport(
  projectId: string,
  options?: {
    includeDescriptions?: boolean;
  }
): Promise<CreateExportResponse> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/exports/moodboard-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': authHeaders!.Authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        options: options || { includeDescriptions: true },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || errorData.error || 'Failed to create export',
      };
    }

    const result = await response.json();
    return {
      success: true,
      data: result.data,
    };

  } catch (error) {
    console.error('Create export error:', error);
    return { success: false, error: 'Failed to create export' };
  }
}

// ============================================
// GET EXPORT STATUS
// ============================================

/**
 * Get the status and details of an export.
 */
export async function getExportStatus(
  exportId: string
): Promise<GetExportResponse> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/exports/${exportId}`, {
      headers: {
        'Authorization': authHeaders!.Authorization,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Export not found' };
      }
      return { success: false, error: 'Failed to fetch export status' };
    }

    const result = await response.json();
    return {
      success: true,
      data: result.data,
    };

  } catch (error) {
    console.error('Get export status error:', error);
    return { success: false, error: 'Failed to fetch export status' };
  }
}

// ============================================
// GET LATEST EXPORT
// ============================================

/**
 * Get the latest completed export for a project.
 */
export async function getLatestExport(
  projectId: string,
  type: ExportAssetType = 'MOODBOARD_PDF'
): Promise<GetExportResponse> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${getApiBase()}/api/exports/project/${projectId}/latest?type=${type}`,
      {
        headers: {
          'Authorization': authHeaders!.Authorization,
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch latest export' };
    }

    const result = await response.json();
    return {
      success: true,
      data: result.data, // May be null if no export exists
    };

  } catch (error) {
    console.error('Get latest export error:', error);
    return { success: false, error: 'Failed to fetch latest export' };
  }
}

// ============================================
// GET PROJECT EXPORTS
// ============================================

/**
 * Get all exports for a project.
 */
export async function getProjectExports(
  projectId: string
): Promise<{ success: boolean; data?: ExportAsset[]; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${getApiBase()}/api/exports/project/${projectId}`,
      {
        headers: {
          'Authorization': authHeaders!.Authorization,
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch exports' };
    }

    const result = await response.json();
    return {
      success: true,
      data: result.data || [],
    };

  } catch (error) {
    console.error('Get project exports error:', error);
    return { success: false, error: 'Failed to fetch exports' };
  }
}

