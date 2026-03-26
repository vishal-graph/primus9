'use server';

/**
 * TatvaOps Vision - Sense Layer Server Actions
 * 
 * Handles:
 * 1. Upload sense inputs (images, text) to S3
 * 2. Trigger intent inference job
 * 3. Poll job status
 * 4. Fetch Intent Graph
 * 5. Refine Intent Graph
 */

import { getServerAuthHeaders } from '@/lib/server-auth';
import { getApiBase } from '@/lib/api-base';

// ============================================
// TYPES
// ============================================

export interface StyleSignals {
  era?: string;
  warmth: 'low' | 'medium' | 'high';
  visualDensity: 'sparse' | 'medium' | 'dense';
  colorPalette: string[];
}

export interface ComponentPreferences {
  furniture: string[];
  materials: string[];
  lighting: string;
}

export interface ChangeBoundaries {
  preserve: string[];
  mustChange: string[];
}

export interface LifestyleSignals {
  hasKids?: boolean;
  hasPets?: boolean;
  workFromHome?: boolean;
  hasElders?: boolean;
  entertainmentFocus?: 'low' | 'medium' | 'high';
}

export interface InferredIntent {
  spaceType: string;
  styleSignals: StyleSignals;
  componentPreferences: ComponentPreferences;
  changeBoundaries: ChangeBoundaries;
  lifestyleSignals?: LifestyleSignals;
  confidence: number;
  inferredFrom: string[];
}

export interface IntentGraph {
  id: string;
  projectId: string;
  inputs: {
    images?: string[];
    floorPlan?: string;
    moodboards?: string[];
    text?: string;
    hints?: Record<string, unknown>;
  };
  inferred: InferredIntent;
  constraints: {
    preserve?: string[];
    mustChange?: string[];
  };
  priorities: {
    style?: number;
    cost?: number;
    speed?: number;
  };
  confidence: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SenseJobResult {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  intentGraph?: IntentGraph;
  error?: string;
}

// ============================================
// UPLOAD SENSE INPUTS
// ============================================

/**
 * Upload sense inputs (images, PDFs, etc.) to S3
 * Returns S3 URLs for the uploaded files
 */
export async function uploadSenseInputs(
  files: File[]
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    console.log('[Sense] Auth headers present:', !!authHeaders);
    console.log('[Sense] Backend URL:', getApiBase());
    console.log('[Sense] Files to upload:', files.length);

    if (!authHeaders) {
      console.error('[Sense] No auth token - user not authenticated');
      return { success: false, error: 'Not authenticated. Please sign in.' };
    }

    if (!files || files.length === 0) {
      return { success: false, error: 'No files provided' };
    }

    // Upload each file
    const uploadPromises = files.map(async (file) => {
      console.log('[Sense] Uploading file:', file.name, 'size:', file.size, 'type:', file.type);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'sense-input');

      const response = await fetch(`${getApiBase()}/api/uploads`, {
        method: 'POST',
        headers: {
          'Authorization': authHeaders!.Authorization,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Sense] Upload failed:', errorText);
        throw new Error(`Failed to upload ${file.name}`);
      }

      const { data } = await response.json();
      console.log('[Sense] Uploaded:', file.name, '→', data.url);
      return data.url;
    });

    const urls = await Promise.all(uploadPromises);
    console.log('[Sense] All files uploaded successfully:', urls.length);

    return { success: true, urls };
  } catch (error) {
    console.error('[Sense] Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload files',
    };
  }
}

// ============================================
// PROCESS INTENT (CREATE INTENT GRAPH)
// ============================================

/**
 * Trigger intent inference for a project
 * Creates a Sense Inference job and queues it
 */
export async function processIntent(
  projectId: string,
  inputs: {
    images?: string[];
    floorPlan?: string;
    moodboards?: string[];
    text?: string;
    hints?: Record<string, unknown>;
  }
): Promise<{ success: boolean; jobId?: string; fromCache?: boolean; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    console.log('[Sense] Processing intent for project:', projectId);
    console.log('[Sense] Inputs:', JSON.stringify(inputs, null, 2));

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/sense/intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeaders!.Authorization,
      },
      body: JSON.stringify({
        projectId,
        inputs,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Sense] Process intent failed:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to process intent',
      };
    }

    const { data } = await response.json();
    console.log('[Sense] Intent job created:', data.jobId, 'fromCache:', data.fromCache);

    return {
      success: true,
      jobId: data.jobId,
      fromCache: data.fromCache,
    };
  } catch (error) {
    console.error('[Sense] Process intent error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process intent',
    };
  }
}

// ============================================
// GET INTENT GRAPH
// ============================================

/**
 * Fetch Intent Graph for a project
 */
export async function getIntentGraph(
  projectId: string
): Promise<{ success: boolean; data?: IntentGraph; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    console.log('[Sense] Fetching Intent Graph for project:', projectId);

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/sense/${projectId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeaders!.Authorization,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Intent Graph not found for this project' };
      }
      const errorData = await response.json().catch(() => ({}));
      console.error('[Sense] Get Intent Graph failed:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to fetch Intent Graph',
      };
    }

    const { data } = await response.json();
    console.log('[Sense] Intent Graph fetched successfully');

    return { success: true, data };
  } catch (error) {
    console.error('[Sense] Get Intent Graph error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Intent Graph',
    };
  }
}

// ============================================
// REFINE INTENT GRAPH
// ============================================

/**
 * Refine Intent Graph with user corrections
 */
export async function refineIntentGraph(
  projectId: string,
  refinements: {
    styleSignals?: Partial<StyleSignals>;
    componentPreferences?: Partial<ComponentPreferences>;
    changeBoundaries?: Partial<ChangeBoundaries>;
    lifestyleSignals?: Partial<LifestyleSignals>;
  }
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    console.log('[Sense] Refining Intent Graph for project:', projectId);
    console.log('[Sense] Refinements:', JSON.stringify(refinements, null, 2));

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/sense/${projectId}/refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeaders!.Authorization,
      },
      body: JSON.stringify({ refinements }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Sense] Refine Intent Graph failed:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to refine Intent Graph',
      };
    }

    const { data } = await response.json();
    console.log('[Sense] Intent Graph refined, new job:', data.jobId);

    return {
      success: true,
      jobId: data.jobId,
    };
  } catch (error) {
    console.error('[Sense] Refine Intent Graph error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refine Intent Graph',
    };
  }
}

// ============================================
// DELETE INTENT GRAPH
// ============================================

/**
 * Delete Intent Graph for a project
 */
export async function deleteIntentGraph(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    console.log('[Sense] Deleting Intent Graph for project:', projectId);

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/sense/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeaders!.Authorization,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Sense] Delete Intent Graph failed:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to delete Intent Graph',
      };
    }

    console.log('[Sense] Intent Graph deleted successfully');

    return { success: true };
  } catch (error) {
    console.error('[Sense] Delete Intent Graph error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete Intent Graph',
    };
  }
}

// ============================================
// CHECK JOB STATUS (REUSE FROM AI-JOB ACTIONS)
// ============================================

/**
 * Poll sense inference job status
 * Reuses the existing AI job polling infrastructure
 */
export async function getSenseJobStatus(
  jobId: string
): Promise<{ success: boolean; data?: SenseJobResult; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeaders!.Authorization,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch job status' };
    }

    const { data } = await response.json();

    // Map AI job to sense job result
    const senseResult: SenseJobResult = {
      jobId: data.id,
      status: data.status,
      progress: data.progress,
      error: data.error,
    };

    // If job completed, fetch Intent Graph
    if (data.status === 'COMPLETED' && data.projectId) {
      const intentGraphResult = await getIntentGraph(data.projectId);
      if (intentGraphResult.success && intentGraphResult.data) {
        senseResult.intentGraph = intentGraphResult.data;
      }
    }

    return { success: true, data: senseResult };
  } catch (error) {
    console.error('[Sense] Get job status error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch job status',
    };
  }
}
