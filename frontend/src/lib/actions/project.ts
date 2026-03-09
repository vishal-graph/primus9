'use server';

import { revalidatePath } from 'next/cache';
import { serverFetch } from '@/lib/api-client';
import type { Project, ProjectStage, CreateProjectInput } from '@/types/project';
import type { Room } from '@/types/room';

/**
 * Project Server Actions
 * Server-side mutations for project operations
 * 
 * All operations go through the backend API which handles:
 * - Authentication via Clerk JWT
 * - Database operations via Prisma
 * - Authorization checks
 */

// ============================================
// Types for API responses
// ============================================

interface ProjectWithRooms extends Project {
  rooms: Room[];
  _count?: {
    rooms: number;
    aiJobs: number;
  };
}

interface ProjectsListResponse {
  data: ProjectWithRooms[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ============================================
// Project Actions
// ============================================

export async function getProject(projectId: string): Promise<ProjectWithRooms | null> {
  const response = await serverFetch<ProjectWithRooms>(`/api/projects/${projectId}`);
  
  if (!response.success) {
    console.error('Failed to fetch project:', response.error);
    return null;
  }

  return response.data || null;
}

export async function getProjects(options?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ProjectsListResponse> {
  const params: Record<string, string> = {};
  
  if (options?.page) params.page = String(options.page);
  if (options?.limit) params.limit = String(options.limit);
  if (options?.search) params.search = options.search;

  const response = await serverFetch<ProjectWithRooms[]>('/api/projects', { params });
  
  if (!response.success) {
    console.error('Failed to fetch projects:', response.error);
    return {
      data: [],
      meta: { total: 0, page: 1, limit: 20, pages: 0 },
    };
  }

  // Transform ApiMeta to ProjectsListResponse meta format
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

export async function createProject(
  input: CreateProjectInput
): Promise<{ success: boolean; data?: Project; error?: string }> {
  const response = await serverFetch<Project>('/api/projects', {
    method: 'POST',
    body: input,
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to create project',
    };
  }

  revalidatePath('/dashboard');
  
  return {
    success: true,
    data: response.data,
  };
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project, 'name' | 'currentStage'>>
): Promise<{ success: boolean; data?: Project; error?: string }> {
  const response = await serverFetch<Project>(`/api/projects/${projectId}`, {
    method: 'PATCH',
    body: updates,
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to update project',
    };
  }

  revalidatePath(`/project/${projectId}`);
  revalidatePath('/dashboard');

  return {
    success: true,
    data: response.data,
  };
}

export async function updateProjectStage(
  projectId: string,
  stage: ProjectStage
): Promise<{ success: boolean; data?: Project; error?: string }> {
  return updateProject(projectId, { currentStage: stage });
}

export async function advanceProjectStage(
  projectId: string
): Promise<{ success: boolean; data?: Project; error?: string }> {
  const response = await serverFetch<Project>(`/api/projects/${projectId}/advance-stage`, {
    method: 'POST',
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to advance project stage',
    };
  }

  revalidatePath(`/project/${projectId}`);
  
  return {
    success: true,
    data: response.data,
  };
}

export async function deleteProject(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await serverFetch<{ id: string; deleted: boolean }>(
    `/api/projects/${projectId}`,
    { method: 'DELETE' }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to delete project',
    };
  }

  revalidatePath('/dashboard');
  
  return { success: true };
}

// ============================================
// Room Actions
// ============================================

export async function getRooms(projectId: string): Promise<Room[]> {
  const response = await serverFetch<Room[]>(`/api/projects/${projectId}/rooms`);
  
  if (!response.success) {
    console.error('Failed to fetch rooms:', response.error);
    return [];
  }

  return response.data || [];
}

export async function createRoom(
  projectId: string,
  input: { name: string; type: string; geometry?: Record<string, unknown> }
): Promise<{ success: boolean; data?: Room; error?: string }> {
  const response = await serverFetch<Room>(`/api/projects/${projectId}/rooms`, {
    method: 'POST',
    body: input,
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to create room',
    };
  }

  revalidatePath(`/project/${projectId}`);
  
  return {
    success: true,
    data: response.data,
  };
}

export async function updateRoom(
  projectId: string,
  roomId: string,
  updates: Partial<Pick<Room, 'name' | 'type' | 'status' | 'geometry'>>
): Promise<{ success: boolean; data?: Room; error?: string }> {
  const response = await serverFetch<Room>(`/api/projects/${projectId}/rooms/${roomId}`, {
    method: 'PATCH',
    body: updates,
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to update room',
    };
  }

  revalidatePath(`/project/${projectId}`);
  
  return {
    success: true,
    data: response.data,
  };
}

export async function deleteRoom(
  projectId: string,
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await serverFetch<{ id: string; deleted: boolean }>(
    `/api/projects/${projectId}/rooms/${roomId}`,
    { method: 'DELETE' }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to delete room',
    };
  }

  revalidatePath(`/project/${projectId}`);
  
  return { success: true };
}
