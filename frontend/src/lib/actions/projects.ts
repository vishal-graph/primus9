'use server';

/**
 * Projects Server Actions
 * Fetches real project data from backend API
 */

import { getServerAuthHeaders } from '@/lib/server-auth';
import { getApiBase } from '@/lib/api-base';

export interface Project {
  id: string;
  name: string;
  currentStage: string;
  roomCount: number;
  updatedAt: string;
  createdAt: string;
  floorPlanUrl?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface ProjectsResponse {
  success: boolean;
  data?: Project[];
  error?: string;
}

export async function getProjects(): Promise<ProjectsResponse> {
  try {
    const headers = await getServerAuthHeaders();

    if (!headers) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/projects`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error?.message || `Failed to fetch projects: ${response.status}` 
      };
    }

    const { data } = await response.json();
    
    // Fetch floor plan URLs for all projects in parallel
    const projectsWithUrls = await Promise.all(
      data.map(async (project: any) => {
        let floorPlanUrl: string | undefined;
        
        // Try to fetch converted PDF image first (FLOORPLAN_ANALYZED)
        try {
          const analyzedResponse = await fetch(
            `${getApiBase()}/api/uploads/assets/${project.id}?assetType=FLOORPLAN_ANALYZED&latestOnly=true`,
            { headers }
          );
          
          if (analyzedResponse.ok) {
            const { data: analyzedAssets } = await analyzedResponse.json();
            if (analyzedAssets && analyzedAssets.length > 0 && analyzedAssets[0].downloadUrl) {
              floorPlanUrl = analyzedAssets[0].downloadUrl;
            }
          }
        } catch (e) {
          // Ignore errors, will fallback to original
        }

        // Fallback to original floor plan if no converted image
        if (!floorPlanUrl) {
          try {
            const assetsResponse = await fetch(
              `${getApiBase()}/api/uploads/assets/${project.id}?assetType=FLOORPLAN_ORIGINAL&latestOnly=true`,
              { headers }
            );
            
            if (assetsResponse.ok) {
              const { data: assets } = await assetsResponse.json();
              if (assets && assets.length > 0 && assets[0].downloadUrl) {
                floorPlanUrl = assets[0].downloadUrl;
              }
            }
          } catch (e) {
            // Ignore errors fetching assets
          }
        }
        
        return {
          id: project.id,
          name: project.name,
          currentStage: project.currentStage,
          roomCount: project._count?.rooms || project.rooms?.length || 0,
          updatedAt: project.updatedAt,
          createdAt: project.createdAt,
          floorPlanUrl,
          isFavorite: project.isFavorite ?? false,
          isArchived: project.isArchived ?? false,
        };
      })
    );

    return { success: true, data: projectsWithUrls };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load projects',
    };
  }
}

export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getServerAuthHeaders();
    if (!headers) return { success: false, error: 'Not authenticated' };

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error?.message || 'Failed to delete project' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function renameProject(projectId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getServerAuthHeaders();
    if (!headers) return { success: false, error: 'Not authenticated' };

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error?.message || 'Failed to rename project' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error renaming project:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function archiveProject(projectId: string, archived: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getServerAuthHeaders();
    if (!headers) return { success: false, error: 'Not authenticated' };

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: archived }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error?.message || 'Failed to archive project' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error archiving project:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function favoriteProject(projectId: string, favorite: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getServerAuthHeaders();
    if (!headers) return { success: false, error: 'Not authenticated' };

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: favorite }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.error?.message || 'Failed to update favorite status' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating favorite status:', error);
    return { success: false, error: (error as Error).message };
  }
}

