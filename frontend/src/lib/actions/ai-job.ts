'use server';

import { revalidatePath } from 'next/cache';
import { serverFetch } from '@/lib/api-client';
import type { AIJob, AIJobType, AIJobPayload } from '@/types/ai-job';

/**
 * AI Job Server Actions
 * 
 * Architecture Decision:
 * - Server Actions handle job creation (enqueue to SQS via backend)
 * - No direct AI calls from frontend
 * - All AI processing happens in dedicated worker service
 * - Plan-based access control validated server-side
 */

// ============================================
// Types
// ============================================

interface CreateJobResponse {
  id: string;
  type: AIJobType;
  status: string;
  projectId: string;
  createdAt: string;
  remainingRateLimit?: number;
}

interface JobsListResponse {
  data: AIJob[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ============================================
// Core Job Actions
// ============================================

export async function createAIJob(
  type: AIJobType,
  projectId: string,
  payload: AIJobPayload
): Promise<{ success: boolean; data?: AIJob; error?: string }> {
  const payloadWithRoom = payload as { roomId?: string };
  const response = await serverFetch<CreateJobResponse>('/api/jobs', {
    method: 'POST',
    body: {
      type,
      projectId,
      ...(payloadWithRoom.roomId ? { roomId: payloadWithRoom.roomId } : {}),
      payload,
    },
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to create job',
    };
  }

  // Revalidate project page to show new job
  revalidatePath(`/project/${projectId}`);

  // Cast through unknown since CreateJobResponse is a subset of AIJob
  // The full job can be fetched later via getJob() if needed
  return {
    success: true,
    data: response.data ? (response.data as unknown as AIJob) : undefined,
  };
}

export async function getJob(jobId: string): Promise<AIJob | null> {
  const response = await serverFetch<AIJob>(`/api/jobs/${jobId}`);
  
  if (!response.success) {
    console.error('Failed to fetch job:', response.error);
    return null;
  }

  return response.data || null;
}

export async function getJobs(options?: {
  projectId?: string;
  status?: string;
  type?: AIJobType;
  page?: number;
  limit?: number;
}): Promise<JobsListResponse> {
  const params: Record<string, string> = {};
  
  if (options?.projectId) params.projectId = options.projectId;
  if (options?.status) params.status = options.status;
  if (options?.type) params.type = options.type;
  if (options?.page) params.page = String(options.page);
  if (options?.limit) params.limit = String(options.limit);

  const response = await serverFetch<AIJob[]>('/api/jobs', { params });
  
  if (!response.success) {
    console.error('Failed to fetch jobs:', response.error);
    return {
      data: [],
      meta: { total: 0, page: 1, limit: 20, pages: 0 },
    };
  }

  // Transform ApiMeta to JobsListResponse meta format
  const apiMeta = response.meta;
  const total = apiMeta?.total ?? 0;
  const limit = apiMeta?.limit ?? 20;
  const page = apiMeta?.page ?? 1;
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    data: response.data || [],
    meta: {
      total,
      page,
      limit,
      pages,
    },
  };
}

export async function getActiveJobs(
  projectId?: string
): Promise<AIJob[]> {
  const params: Record<string, string> = {};
  if (projectId) params.projectId = projectId;

  const response = await serverFetch<AIJob[]>('/api/jobs/active', { params });
  
  if (!response.success) {
    console.error('Failed to fetch active jobs:', response.error);
    return [];
  }

  return response.data || [];
}

export async function cancelJob(
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await serverFetch<{ id: string; status: string }>(
    `/api/jobs/${jobId}/cancel`,
    { method: 'POST' }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to cancel job',
    };
  }

  return {
    success: true,
  };
}

export async function retryJob(
  jobId: string
): Promise<{ success: boolean; data?: AIJob; error?: string }> {
  const response = await serverFetch<AIJob>(
    `/api/jobs/${jobId}/retry`,
    { method: 'POST' }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to retry job',
    };
  }

  return {
    success: true,
    data: response.data,
  };
}

// ============================================
// Convenience Wrappers
// ============================================

/**
 * Enqueue floor plan analysis
 */
export async function enqueueFloorPlanAnalysis(
  projectId: string,
  imageUrl: string
): Promise<{ success: boolean; data?: AIJob; error?: string }> {
  return createAIJob('FLOORPLAN_ANALYSIS', projectId, {
    projectId,
    imageUrl,
  });
}

/**
 * Enqueue moodboard generation
 */
export async function enqueueMoodboardGeneration(
  projectId: string,
  roomId: string,
  style: string,
  preferences: {
    colorScheme?: string[];
    budget?: 'LOW' | 'MEDIUM' | 'HIGH' | 'LUXURY';
    priorities?: string[];
  }
): Promise<{ success: boolean; data?: AIJob; error?: string }> {
  return createAIJob('MOODBOARD', projectId, {
    projectId,
    roomId,
    style,
    preferences: {
      style,
      colorScheme: preferences.colorScheme || [],
      budget: preferences.budget || 'MEDIUM',
      priorities: preferences.priorities || [],
    },
  });
}

/**
 * Enqueue elevation generation
 */
export async function enqueueElevationGeneration(
  projectId: string,
  roomId: string,
  moodboardId: string
): Promise<{ success: boolean; data?: AIJob; error?: string }> {
  return createAIJob('ELEVATION', projectId, {
    projectId,
    roomId,
    moodboardId,
    walls: [], // Will be populated by backend if needed
  });
}

/**
 * Enqueue interior view generation
 */
export async function enqueueInteriorViewGeneration(
  projectId: string,
  roomId: string,
  viewAngle: number,
  style: string,
  elevationId: string
): Promise<{ success: boolean; data?: AIJob; error?: string }> {
  return createAIJob('INTERIOR', projectId, {
    projectId,
    roomId,
    elevationId,
    viewAngle,
  });
}

/**
 * Enqueue component update
 */
export async function enqueueComponentUpdate(
  projectId: string,
  roomId: string,
  componentId: string,
  changes: {
    style?: string;
    size?: string;
    material?: string;
  }
): Promise<{ success: boolean; data?: AIJob; error?: string }> {
  return createAIJob('COMPONENT_UPDATE', projectId, {
    projectId,
    roomId,
    componentId,
    changes,
  });
}

// ============================================
// Utility Functions (must be async in 'use server' files)
// ============================================

/**
 * Get human-readable job type name
 */
export async function getJobTypeName(type: AIJobType): Promise<string> {
  const names: Record<AIJobType, string> = {
    FLOORPLAN_ANALYSIS: 'Floor Plan Analysis',
    MOODBOARD: 'Moodboard Generation',
    ELEVATION: 'Elevation Render',
    TWO_D_VIEWS: '2D Views Generation',
    COMPONENT_EXTRACTION: 'Component Extraction',
    ROOM_WALKTHROUGH: 'Room Walkthrough',
    INTERIOR: 'Interior View',
    COMPONENT_UPDATE: 'Component Update',
  };
  return names[type];
}

/**
 * Get estimated processing time (seconds)
 */
export async function getEstimatedProcessingTime(type: AIJobType): Promise<number> {
  const times: Record<AIJobType, number> = {
    FLOORPLAN_ANALYSIS: 30,
    MOODBOARD: 45,
    ELEVATION: 60,
    TWO_D_VIEWS: 120,
    COMPONENT_EXTRACTION: 90,
    ROOM_WALKTHROUGH: 180,
    INTERIOR: 90,
    COMPONENT_UPDATE: 20,
  };
  return times[type];
}
