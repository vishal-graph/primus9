/**
 * TatvaOps Vision - Room Walkthrough Server Actions
 */

'use server';

import { auth } from '@clerk/nextjs/server';
import { getApiBase } from '@/lib/api-base';

export interface RoomWalkthroughVideo {
  id: string;
  roomId: string;
  videoUrl: string;
  s3Key?: string;
  resolution: string;
  duration: number;
  version: number;
  modelVersion?: string;
  generationTimeMs?: number;
  createdAt: string;
}

export interface WalkthroughJob {
  id: string;
  projectId: string;
  roomId?: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  error?: string;
}

export async function getRoomWalkthroughs(
  projectId: string,
  roomId: string
): Promise<{ success: boolean; videos?: RoomWalkthroughVideo[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const response = await fetch(
      `${getApiBase()}/api/projects/${projectId}/rooms/${roomId}/walkthroughs`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, videos: [] };
      }
      return { success: false, error: 'Failed to fetch walkthrough videos' };
    }

    const { data } = await response.json();
    return { success: true, videos: data || [] };
  } catch (error) {
    console.error('Get room walkthroughs error:', error);
    return { success: false, error: 'Failed to fetch walkthrough videos' };
  }
}

export async function getProjectWalkthroughs(
  projectId: string
): Promise<{ success: boolean; videos?: RoomWalkthroughVideo[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const response = await fetch(
      `${getApiBase()}/api/projects/${projectId}/walkthroughs`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, videos: [] };
      }
      return { success: false, error: 'Failed to fetch walkthrough videos' };
    }

    const { data } = await response.json();
    return { success: true, videos: data || [] };
  } catch (error) {
    console.error('Get project walkthroughs error:', error);
    return { success: false, error: 'Failed to fetch walkthrough videos' };
  }
}

/**
 * Start room walkthrough (video) generation.
 * Job is enqueued to backend Redis/BullMQ and processed by the backend worker (npm run queue:worker).
 */
export async function triggerRoomWalkthroughGeneration(
  projectId: string,
  roomId: string,
  version?: number
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const response = await fetch(`${getApiBase()}/api/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'ROOM_WALKTHROUGH',
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
        error: errorData.error?.message || 'Failed to start walkthrough generation',
      };
    }

    const { data } = await response.json();
    return { success: true, jobId: data.id };
  } catch (error) {
    console.error('Trigger walkthrough error:', error);
    return { success: false, error: 'Failed to start walkthrough generation' };
  }
}

export async function getActiveWalkthroughJobs(
  projectId: string
): Promise<{ success: boolean; jobs?: WalkthroughJob[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const response = await fetch(
      `${getApiBase()}/api/jobs?projectId=${projectId}&type=ROOM_WALKTHROUGH&status=QUEUED,PROCESSING`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch active jobs' };
    }

    const { data } = await response.json();
    return { success: true, jobs: data || [] };
  } catch (error) {
    console.error('Get active walkthrough jobs error:', error);
    return { success: false, error: 'Failed to fetch active jobs' };
  }
}
