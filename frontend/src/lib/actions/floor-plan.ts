'use server';

/**
 * Floor Plan Analysis Server Actions
 * 
 * Handles:
 * 1. Upload floor plan to S3
 * 2. Trigger AI analysis job
 * 3. Poll job status
 * 4. Fetch analysis results
 */

import { auth } from '@clerk/nextjs/server';
import { getApiBase } from '@/lib/api-base';

// ============================================
// TYPES
// ============================================

export interface Room {
  id: string;
  name: string;
  type: string;
  area: number | null;
  confidence: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  reasoning: string;
  geometry: {
    boundingBox: { x: number; y: number; width: number; height: number };
  };
  symbolsDetected: string[];
  textDetected: string[];
  // Moodboards for the room (used by ElevationStage)
  moodboards?: Array<{ id: string; imageUrl: string; version: number }>;
}

export interface AnalysisResult {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  rooms?: Room[];
  error?: string;
  warnings?: Array<{ severity: string; message: string }>;
}

// ============================================
// UPLOAD FLOOR PLAN
// ============================================

export async function uploadFloorPlan(
  projectId: string,
  formData: FormData,
  projectName?: string
): Promise<{ success: boolean; imageUrl?: string; projectId?: string; slug?: string; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    console.log('[FloorPlan] Auth token present:', !!token);
    console.log('[FloorPlan] Backend URL:', getApiBase());
    console.log('[FloorPlan] Project ID:', projectId);

    if (!token) {
      console.error('[FloorPlan] No auth token - user not authenticated');
      return { success: false, error: 'Not authenticated. Please sign in.' };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    console.log('[FloorPlan] Uploading file:', file.name, 'size:', file.size);

    // If projectId is "new", create a new project first
    let actualProjectId = projectId;
    let actualSlug = projectId;
    if (projectId === 'new' || !projectId) {
      // Use provided name or generate a default one
      const finalProjectName = projectName?.trim() || `Floor Plan - ${new Date().toLocaleDateString()}`;
      console.log('[FloorPlan] Creating new project with name:', finalProjectName);
      
      // Check if user is internal and needs to select a plan
      const userResponse = await fetch(`${getApiBase()}/api/user/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!userResponse.ok) {
        console.error('[FloorPlan] Failed to fetch user info');
        return { success: false, error: 'Failed to fetch user information' };
      }
      
      const { data: user } = await userResponse.json();
      const isInternal = user.email?.endsWith('@tatvaops.com');
      
      // For internal users, use PREMIUM plan by default
      // (They can change it later from project settings)
      const projectPayload: any = {
        name: finalProjectName,
      };
      
      if (isInternal) {
        console.log('[FloorPlan] Internal user detected, setting PREMIUM plan');
        projectPayload.planCode = 'PREMIUM';
      }
      
      const createResponse = await fetch(`${getApiBase()}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectPayload),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[FloorPlan] Failed to create project:', errorText);
        return { success: false, error: 'Failed to create project. Please create a project from the entry page first.' };
      }

      const { data: newProject } = await createResponse.json();
      actualProjectId = newProject.id;
      actualSlug = newProject.slug || newProject.id;
      console.log('[FloorPlan] Created project:', actualProjectId, 'with slug:', actualSlug);
    }

    // 1. Get presigned URL for upload
    const presignedResponse = await fetch(`${getApiBase()}/api/uploads/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        bucket: 'floorplans',
        projectId: actualProjectId,
        assetType: 'FLOORPLAN_ORIGINAL',
      }),
    });

    console.log('[FloorPlan] Presigned URL response status:', presignedResponse.status);

    if (!presignedResponse.ok) {
      const errorText = await presignedResponse.text();
      console.error('[FloorPlan] Failed to get presigned URL:', presignedResponse.status, errorText);
      return { success: false, error: `Failed to get upload URL: ${presignedResponse.status}` };
    }

    const { data: presignedData } = await presignedResponse.json();
    const { uploadUrl, key } = presignedData;

    // 2. Upload file to S3
    const arrayBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: arrayBuffer,
    });

    if (!uploadResponse.ok) {
      return { success: false, error: 'Failed to upload file' };
    }

    // 3. Confirm upload
    const confirmResponse = await fetch(`${getApiBase()}/api/uploads/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        key,
        bucket: 'floorplans',
        projectId: actualProjectId,
        assetType: 'FLOORPLAN_ORIGINAL',
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!confirmResponse.ok) {
      return { success: false, error: 'Failed to confirm upload' };
    }

    // Construct the full S3 URL
    const s3Url = `https://tatvaops-vision-production-floorplans.s3.ap-south-1.amazonaws.com/${key}`;
    
    // Return actualSlug so frontend can navigate to /project/[slug]/[stage]
    return { success: true, imageUrl: s3Url, projectId: actualProjectId, slug: actualSlug };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'Upload failed' };
  }
}

// ============================================
// TRIGGER ANALYSIS
// ============================================

export async function triggerFloorPlanAnalysis(
  projectId: string,
  imageUrl: string
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'FLOORPLAN_ANALYSIS',
        projectId,
        payload: {
          projectId,
          imageUrl,
          mimeType: 'image/png',
          hints: {
            planType: 'residential',
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create job:', error);
      return { success: false, error: 'Failed to start analysis' };
    }

    const { data } = await response.json();
    return { success: true, jobId: data.id };
  } catch (error) {
    console.error('Analysis trigger error:', error);
    return { success: false, error: 'Failed to start analysis' };
  }
}

// ============================================
// GET JOB STATUS
// ============================================

export async function getJobStatus(jobId: string): Promise<AnalysisResult & { networkError?: boolean; stage?: string; message?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { jobId, status: 'FAILED', error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { jobId, status: 'FAILED', error: 'Failed to get status' };
    }

    const { data } = await response.json();
    return {
      jobId,
      status: data.status,
      progress: data.progress,
      stage: data.stage,
      message: data.message,
      error: data.error,
    };
  } catch (error) {
    console.error('Status check error:', error);
    // Return PROCESSING with networkError flag - don't treat network issues as job failure
    return { jobId, status: 'PROCESSING', error: 'Network error - retrying...', networkError: true };
  }
}

// ============================================
// GET JOB STREAM INFO (for SSE)
// ============================================

export async function getJobStreamInfo(jobId: string): Promise<{ 
  success: boolean; 
  streamUrl?: string;
  token?: string;
  error?: string 
}> {
  // SSE doesn't work well with internal Docker URLs from browser
  // The browser needs the public API URL, but server actions use internal URL
  // Return false to fall back to polling which works reliably
  return { success: false, error: 'SSE disabled - using polling' };
}

// ============================================
// GET PROJECT DATA (Rooms + Floor Plan Image)
// ============================================

export interface ProjectData {
  rooms: Room[];
  floorPlanUrl?: string;
  currentStage?: string;
}

export async function getProjectData(projectId: string): Promise<{
  success: boolean;
  data?: ProjectData;
  error?: string;
}> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    // Fetch project with rooms
    const projectResponse = await fetch(`${getApiBase()}/api/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!projectResponse.ok) {
      return { success: false, error: 'Failed to get project' };
    }

    const { data: project } = await projectResponse.json();
    
    // Fetch floor plan asset - prefer converted PDF image if available
    // First, try to get FLOORPLAN_ANALYZED (converted PDF image)
    const analyzedAssetsResponse = await fetch(
      `${getApiBase()}/api/uploads/assets/${projectId}?assetType=FLOORPLAN_ANALYZED&latestOnly=true`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    let floorPlanUrl: string | undefined;
    if (analyzedAssetsResponse.ok) {
      const { data: analyzedAssets } = await analyzedAssetsResponse.json();
      if (analyzedAssets && analyzedAssets.length > 0 && analyzedAssets[0].downloadUrl) {
        floorPlanUrl = analyzedAssets[0].downloadUrl;
        console.log('[FloorPlan] Using converted PDF image:', floorPlanUrl);
      }
    }

    // Fallback to original floor plan if no converted image
    if (!floorPlanUrl) {
      const assetsResponse = await fetch(
        `${getApiBase()}/api/uploads/assets/${projectId}?assetType=FLOORPLAN_ORIGINAL&latestOnly=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (assetsResponse.ok) {
        const { data: assets } = await assetsResponse.json();
        if (assets && assets.length > 0 && assets[0].downloadUrl) {
          floorPlanUrl = assets[0].downloadUrl;
          console.log('[FloorPlan] Using original floor plan:', floorPlanUrl);
        }
      }
    }

    // Map database rooms to frontend format
    const metadata = (r: Record<string, unknown>) => (r.metadata || {}) as Record<string, unknown>;
    const rooms: Room[] = (project.rooms || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      type: r.type as string,
      area: metadata(r).areaEstimate as number | null,
      confidence: r.confidence as number || 0.5,
      status: r.status as Room['status'],
      reasoning: (r.reasoning as string) || (metadata(r).reasoning as string) || '',
      geometry: r.geometry as Room['geometry'],
      symbolsDetected: metadata(r).symbolsDetected as string[] || [],
      textDetected: metadata(r).textDetected as string[] || [],
      // Include moodboards for elevation stage
      moodboards: r.moodboards as Array<{ id: string; imageUrl: string; version: number }> || [],
    }));

    return { 
      success: true, 
      data: { 
        rooms, 
        floorPlanUrl,
        currentStage: project.currentStage,
      } 
    };
  } catch (error) {
    console.error('Get project data error:', error);
    return { success: false, error: 'Failed to get project data' };
  }
}

// Keep legacy function for backward compatibility
export async function getProjectRooms(projectId: string): Promise<{
  success: boolean;
  rooms?: Room[];
  error?: string;
}> {
  const result = await getProjectData(projectId);
  if (result.success && result.data) {
    return { success: true, rooms: result.data.rooms };
  }
  return { success: false, error: result.error };
}

// ============================================
// UPDATE ROOM
// ============================================

export async function updateRoom(
  projectId: string,
  roomId: string,
  updates: Partial<Pick<Room, 'name' | 'type' | 'status'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}/rooms/${roomId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to update room' };
    }

    return { success: true };
  } catch (error) {
    console.error('Update room error:', error);
    return { success: false, error: 'Failed to update room' };
  }
}

// ============================================
// DELETE ROOM
// ============================================

export async function deleteRoom(
  projectId: string,
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}/rooms/${roomId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to delete room' };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete room error:', error);
    return { success: false, error: 'Failed to delete room' };
  }
}


