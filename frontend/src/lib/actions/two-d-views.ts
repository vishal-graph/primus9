/**
 * TatvaOps Vision - 2D Views Server Actions
 */

'use server';

import { getServerAuthHeaders } from '@/lib/server-auth';
import { getApiBase } from '@/lib/api-base';

export type Room2DViewType =
  | 'BIRD_VIEW'
  | 'FRONT_WALL'
  | 'BACK_WALL'
  | 'LEFT_WALL'
  | 'RIGHT_WALL'
  | 'CEILING_VIEW';

export interface Room2DView {
  id: string;
  roomId: string;
  viewType: Room2DViewType;
  imageUrl: string;
  s3Key?: string;
  version: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TwoDViewsJob {
  id: string;
  projectId: string;
  roomId?: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  error?: string;
}

export async function getRoom2DViews(
  projectId: string,
  roomId: string
): Promise<{ success: boolean; views?: Room2DView[]; error?: string }> {
  try {
    const headers = await getServerAuthHeaders();
    if (!headers) return { success: false, error: 'Not authenticated' };

    const response = await fetch(
      `${getApiBase()}/api/projects/${projectId}/rooms/${roomId}/2d-views`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, views: [] };
      }
      return { success: false, error: 'Failed to fetch 2D views' };
    }

    const { data } = await response.json();
    return { success: true, views: data || [] };
  } catch (error) {
    console.error('Get room 2D views error:', error);
    return { success: false, error: 'Failed to fetch 2D views' };
  }
}

export async function getProject2DViews(
  projectId: string
): Promise<{ success: boolean; views?: Room2DView[]; error?: string }> {
  try {
    const headers = await getServerAuthHeaders();
    if (!headers) return { success: false, error: 'Not authenticated' };

    const response = await fetch(
      `${getApiBase()}/api/projects/${projectId}/2d-views`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, views: [] };
      }
      return { success: false, error: 'Failed to fetch 2D views' };
    }

    const { data } = await response.json();
    return { success: true, views: data || [] };
  } catch (error) {
    console.error('Get project 2D views error:', error);
    return { success: false, error: 'Failed to fetch 2D views' };
  }
}

export async function triggerRoom2DViewsGeneration(
  projectId: string,
  roomId: string,
  version?: number
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const headers = await getServerAuthHeaders();
    if (!headers) return { success: false, error: 'Not authenticated' };

    const response = await fetch(`${getApiBase()}/api/jobs`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'TWO_D_VIEWS',
        projectId,
        roomId,
        payload: {
          projectId,
          roomId,
          version: version || 1,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || 'Failed to start 2D views generation',
      };
    }

    const { data } = await response.json();
    return { success: true, jobId: data.id };
  } catch (error) {
    console.error('Trigger 2D views error:', error);
    return { success: false, error: 'Failed to start 2D views generation' };
  }
}

export async function getActiveTwoDViewsJobs(
  projectId: string
): Promise<{ success: boolean; jobs?: TwoDViewsJob[]; error?: string }> {
  try {
    const headers = await getServerAuthHeaders();
    if (!headers) return { success: false, error: 'Not authenticated' };

    const response = await fetch(
      `${getApiBase()}/api/jobs?projectId=${projectId}&type=TWO_D_VIEWS&status=QUEUED,PROCESSING`,
      { headers }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch active jobs' };
    }

    const { data } = await response.json();
    return { success: true, jobs: data || [] };
  } catch (error) {
    console.error('Get active 2D views jobs error:', error);
    return { success: false, error: 'Failed to fetch active jobs' };
  }
}
