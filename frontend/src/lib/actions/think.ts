'use server';

/**
 * TatvaOps Vision - Think Layer Server Actions
 * 
 * Handles:
 * 1. Create spatial plan from intent graph
 * 2. Fetch spatial plan
 * 3. Delete spatial plan
 * 4. Poll spatial planning job status
 */

import { getServerAuthHeaders } from '@/lib/server-auth';
import { getApiBase } from '@/lib/api-base';

// ============================================
// TYPES
// ============================================

export interface RoomSpatialPlan {
  roomId: string;
  roomName: string;
  roomType?: string;
  applyStyle: boolean;
  visualWeight: number;
  density: 'sparse' | 'medium' | 'dense';
  components: {
    primary: string[];
    secondary: string[];
    ambient: string[];
  };
  layoutLocked: boolean;
  geometrySource: 'floor_plan' | 'inferred';
}

export interface ComponentPlacementPlan {
  componentType: string;
  componentCategory: 'furniture' | 'lighting' | 'decor' | 'fixture';
  placementRule: 'anchor' | 'distributed' | 'focal' | 'perimeter';
  constraints: string[];
  visualHierarchy: number;
  quantity?: number;
}

export interface LightingPlan {
  naturalLightBias: number;
  artificial: string[];
  directionality: 'diffuse' | 'directional' | 'mixed';
  mood: string;
  lightingSources: Array<{
    type: string;
    intensity: string;
    color: string;
  }>;
}

export interface WalkthroughPlan {
  entryRoom: string;
  cameraHeight: 'human_eye' | 'elevated' | 'ground';
  pathStyle: 'smooth' | 'cinematic' | 'first_person';
  focusPoints: Array<{
    roomId: string;
    roomName: string;
    duration: number;
    angle: number;
    highlight: string;
  }>;
  transitions: 'cut' | 'fade' | 'pan';
  totalDuration?: number;
}

export interface SpatialPlan {
  id: string;
  projectId: string;
  intentGraphId: string;
  roomPlans: Record<string, RoomSpatialPlan>;
  componentPlan: ComponentPlacementPlan[];
  lightingPlan: LightingPlan;
  walkthrough: WalkthroughPlan;
  constraints: {
    layoutLocked: boolean;
    preserveElements: string[];
    mustChangeElements: string[];
  };
  readiness: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CREATE SPATIAL PLAN
// ============================================

/**
 * Create spatial plan from intent graph
 */
export async function createSpatialPlan(
  projectId: string,
  intentGraphId: string,
  options?: {
    useFloorPlan?: boolean;
    forceRegenerate?: boolean;
  }
): Promise<{
  success: boolean;
  spatialPlanId?: string;
  jobId?: string;
  readiness?: number;
  fromCache?: boolean;
  error?: string;
}> {
  try {
    const authHeaders = await getServerAuthHeaders();

    console.log('[Think] Creating spatial plan', {
      projectId,
      intentGraphId,
      options,
    });

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/think/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeaders!.Authorization,
      },
      body: JSON.stringify({
        projectId,
        intentGraphId,
        options,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Think] Create spatial plan failed:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to create spatial plan',
      };
    }

    const { data } = await response.json();
    console.log('[Think] Spatial plan created:', {
      spatialPlanId: data.spatialPlanId,
      jobId: data.jobId,
      readiness: data.readiness,
      fromCache: data.fromCache,
    });

    return {
      success: true,
      spatialPlanId: data.spatialPlanId,
      jobId: data.jobId,
      readiness: data.readiness,
      fromCache: data.fromCache,
    };
  } catch (error) {
    console.error('[Think] Create spatial plan error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create spatial plan',
    };
  }
}

// ============================================
// GET SPATIAL PLAN
// ============================================

/**
 * Fetch spatial plan for a project
 */
export async function getSpatialPlan(
  projectId: string
): Promise<{ success: boolean; data?: SpatialPlan; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    console.log('[Think] Fetching spatial plan', { projectId });

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/think/${projectId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeaders!.Authorization,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Spatial plan not found' };
      }
      const errorData = await response.json().catch(() => ({}));
      console.error('[Think] Get spatial plan failed:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to fetch spatial plan',
      };
    }

    const { data } = await response.json();
    console.log('[Think] Spatial plan fetched', {
      spatialPlanId: data.id,
      readiness: data.readiness,
      roomCount: Object.keys(data.roomPlans).length,
    });

    return { success: true, data };
  } catch (error) {
    console.error('[Think] Get spatial plan error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch spatial plan',
    };
  }
}

// ============================================
// DELETE SPATIAL PLAN
// ============================================

/**
 * Delete spatial plan for a project
 */
export async function deleteSpatialPlan(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authHeaders = await getServerAuthHeaders();

    console.log('[Think] Deleting spatial plan', { projectId });

    if (!authHeaders) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/think/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeaders!.Authorization,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Think] Delete spatial plan failed:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to delete spatial plan',
      };
    }

    console.log('[Think] Spatial plan deleted');

    return { success: true };
  } catch (error) {
    console.error('[Think] Delete spatial plan error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete spatial plan',
    };
  }
}

// ============================================
// POLL SPATIAL PLANNING JOB STATUS
// ============================================

/**
 * Poll spatial planning job status
 * Reuses the existing AI job polling infrastructure
 */
export async function getSpatialPlanningJobStatus(
  jobId: string
): Promise<{
  success: boolean;
  data?: {
    jobId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress?: number;
    error?: string;
    spatialPlanId?: string;
    readiness?: number;
  };
  error?: string;
}> {
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

    // Map AI job to spatial planning job result
    const result = {
      jobId: data.id,
      status: data.status,
      progress: data.progress,
      error: data.error,
      spatialPlanId: data.result?.spatialPlanId,
      readiness: data.result?.readiness,
    };

    return { success: true, data: result };
  } catch (error) {
    console.error('[Think] Get job status error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch job status',
    };
  }
}
