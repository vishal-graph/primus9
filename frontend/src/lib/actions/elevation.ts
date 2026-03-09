/**
 * TatvaOps Vision - Elevation Server Actions
 * 
 * ============================================================
 * ❗ ISOMETRIC IS THE NEW SOURCE OF TRUTH ❗
 * Room-wise elevations are deprecated
 * ============================================================
 * 
 * Handles:
 * 1. Trigger isometric floor elevation generation (NEW)
 * 2. Fetch existing isometric elevations (NEW)
 * 3. Track elevation job status
 * 4. [DEPRECATED] Room-wise wall elevations
 */

'use server';

import { auth } from '@clerk/nextjs/server';
import { getApiBase } from '@/lib/api-base';

// ============================================
// TYPES
// ============================================

// NEW: Isometric floor elevation (full-floor view)
export interface IsometricElevation {
  id: string;
  projectId: string;
  floor: number;
  imageUrl: string;
  s3Key?: string; // S3 storage key for direct access
  version: number;
  geometryHash?: string;
  styleHash?: string;
  roomCount?: number;
  deviationEstimate?: number;
  architecturalAccuracy?: number;
  createdAt: string;
}

export interface IsometricJob {
  jobId: string;
  projectId: string;
  floor: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  error?: string;
}

// @deprecated - Use IsometricElevation instead
export type WallDirection = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

// @deprecated - Use IsometricElevation instead
export interface RoomElevation {
  id: string;
  roomId: string;
  wall: WallDirection;
  imageUrl: string;
  version: number;
  geometryHash?: string;
  styleHash?: string;
  createdAt: string;
}

// @deprecated - Use IsometricJob instead
export interface ElevationJob {
  jobId: string;
  roomId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  error?: string;
}

// ============================================
// FETCH ELEVATIONS
// ============================================

/**
 * Get all elevations for a project
 */
export async function getProjectElevations(
  projectId: string
): Promise<{ success: boolean; elevations?: RoomElevation[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}/elevations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, elevations: [] };
      }
      return { success: false, error: 'Failed to fetch elevations' };
    }

    const { data } = await response.json();
    return { success: true, elevations: data || [] };
  } catch (error) {
    console.error('Get elevations error:', error);
    return { success: false, error: 'Failed to fetch elevations' };
  }
}

/**
 * Get elevations for a specific room
 */
export async function getRoomElevations(
  projectId: string,
  roomId: string
): Promise<{ success: boolean; elevations?: RoomElevation[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${getApiBase()}/api/projects/${projectId}/rooms/${roomId}/elevations`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, elevations: [] };
      }
      return { success: false, error: 'Failed to fetch room elevations' };
    }

    const { data } = await response.json();
    return { success: true, elevations: data || [] };
  } catch (error) {
    console.error('Get room elevations error:', error);
    return { success: false, error: 'Failed to fetch room elevations' };
  }
}

// ============================================
// TRIGGER ELEVATION GENERATION
// ============================================

/**
 * Trigger elevation generation for a single room
 */
export async function triggerRoomElevationGeneration(
  projectId: string,
  roomId: string,
  wallsToGenerate?: WallDirection[],
  version?: number
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'ELEVATION',
        projectId,
        roomId,
        payload: {
          projectId,
          roomId,
          moodboardId: '', // Will be set by backend if needed
          walls: wallsToGenerate || ['NORTH', 'EAST', 'SOUTH', 'WEST'],
          version: version || 1,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error?.message || 'Failed to trigger elevation generation' 
      };
    }

    const { data } = await response.json();
    return { success: true, jobId: data.id };
  } catch (error) {
    console.error('Trigger elevation error:', error);
    return { success: false, error: 'Failed to trigger elevation generation' };
  }
}

/**
 * Trigger elevation generation for all rooms in a project
 */
export async function triggerAllRoomElevations(
  projectId: string,
  roomIds: string[]
): Promise<{ 
  success: boolean; 
  jobs?: { roomId: string; jobId: string }[]; 
  errors?: { roomId: string; error: string }[];
}> {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return { success: false, errors: [{ roomId: 'all', error: 'Not authenticated' }] };
  }

  const jobs: { roomId: string; jobId: string }[] = [];
  const errors: { roomId: string; error: string }[] = [];

  // Trigger generation for each room sequentially to avoid rate limiting
  for (const roomId of roomIds) {
    try {
      const response = await fetch(`${getApiBase()}/api/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ELEVATION',
          projectId,
          roomId,
          payload: {
            projectId,
            roomId,
            moodboardId: '', // Will be set by backend if needed
            walls: ['NORTH', 'EAST', 'SOUTH', 'WEST'],
            version: 1,
          },
        }),
      });

      if (response.ok) {
        const { data } = await response.json();
        jobs.push({ roomId, jobId: data.id });
      } else {
        const errorData = await response.json().catch(() => ({}));
        errors.push({ 
          roomId, 
          error: errorData.error?.message || 'Failed to trigger' 
        });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      errors.push({ roomId, error: String(error) });
    }
  }

  return { 
    success: jobs.length > 0, 
    jobs: jobs.length > 0 ? jobs : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================
// JOB STATUS
// ============================================

/**
 * Get elevation job status
 */
export async function getElevationJobStatus(
  jobId: string
): Promise<{ success: boolean; status?: ElevationJob['status']; progress?: number; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to get job status' };
    }

    const { data } = await response.json();
    return { 
      success: true, 
      status: data.status,
      progress: data.progress,
    };
  } catch (error) {
    console.error('Get job status error:', error);
    return { success: false, error: 'Failed to get job status' };
  }
}

/**
 * Get active elevation jobs for a project
 */
export async function getActiveElevationJobs(
  projectId: string
): Promise<{ success: boolean; jobs?: ElevationJob[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${getApiBase()}/api/jobs?projectId=${projectId}&type=ELEVATION&status=QUEUED,PROCESSING`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch active jobs' };
    }

    const { data } = await response.json();
    
    // Map to ElevationJob format
    const jobs: ElevationJob[] = (data || []).map((job: any) => ({
      jobId: job.id,
      roomId: job.payload?.roomId || '',
      status: job.status,
      progress: job.progress,
      error: job.error,
    }));

    return { success: true, jobs };
  } catch (error) {
    console.error('Get active jobs error:', error);
    return { success: false, error: 'Failed to fetch active jobs' };
  }
}

// ============================================
// ISOMETRIC ELEVATION (NEW - SOURCE OF TRUTH)
// ============================================

/**
 * Get isometric floor elevation for a project
 * ============================================================
 * ❗ THIS IS THE SINGLE SOURCE OF TRUTH FOR ELEVATIONS ❗
 * ============================================================
 */
export async function getIsometricElevation(
  projectId: string,
  floor: number = 1
): Promise<{ success: boolean; elevation?: IsometricElevation | null; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${getApiBase()}/api/projects/${projectId}/isometric/latest?floor=${floor}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, elevation: null };
      }
      return { success: false, error: 'Failed to fetch isometric elevation' };
    }

    const { data } = await response.json();
    return { success: true, elevation: data };
  } catch (error) {
    console.error('Get isometric elevation error:', error);
    return { success: false, error: 'Failed to fetch isometric elevation' };
  }
}

/**
 * Get all isometric elevations for a project (all floors, all versions)
 */
export async function getAllIsometricElevations(
  projectId: string
): Promise<{ success: boolean; elevations?: IsometricElevation[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${getApiBase()}/api/projects/${projectId}/isometric`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, elevations: [] };
      }
      return { success: false, error: 'Failed to fetch isometric elevations' };
    }

    const { data } = await response.json();
    return { success: true, elevations: data || [] };
  } catch (error) {
    console.error('Get isometric elevations error:', error);
    return { success: false, error: 'Failed to fetch isometric elevations' };
  }
}

/**
 * Trigger isometric floor elevation generation
 * ============================================================
 * ❗ ONE IMAGE = ENTIRE FLOOR ❗
 * ============================================================
 */
export async function triggerIsometricGeneration(
  projectId: string,
  floor: number = 1,
  version?: number
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'INTERIOR_ISOMETRIC',
        projectId,
        payload: {
          projectId,
          floor,
          version: version || 1,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error?.message || 'Failed to trigger isometric generation' 
      };
    }

    const { data } = await response.json();
    return { success: true, jobId: data.id };
  } catch (error) {
    console.error('Trigger isometric error:', error);
    return { success: false, error: 'Failed to trigger isometric generation' };
  }
}

/**
 * Cancel an active isometric generation job
 */
export async function cancelIsometricJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error?.message || 'Failed to cancel job' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Cancel job error:', error);
    return { success: false, error: 'Failed to cancel job' };
  }
}

/**
 * Get active isometric generation jobs for a project
 */
export async function getActiveIsometricJobs(
  projectId: string
): Promise<{ success: boolean; jobs?: IsometricJob[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${getApiBase()}/api/jobs?projectId=${projectId}&type=INTERIOR_ISOMETRIC&status=QUEUED,PROCESSING`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch active jobs' };
    }

    const { data } = await response.json();
    
    // Map to IsometricJob format
    const jobs: IsometricJob[] = (data || []).map((job: any) => ({
      jobId: job.id,
      projectId: job.projectId,
      floor: job.payload?.floor || 1,
      status: job.status,
      progress: job.progress,
      error: job.error,
    }));

    return { success: true, jobs };
  } catch (error) {
    console.error('Get active isometric jobs error:', error);
    return { success: false, error: 'Failed to fetch active jobs' };
  }
}

