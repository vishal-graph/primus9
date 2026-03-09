/**
 * TatvaOps Vision - Intent Server Actions
 * 
 * Handles:
 * 1. Save intent (global or room-wise)
 * 2. Lock intent before generation
 * 3. Trigger moodboard generation jobs
 * 4. Fetch existing intent data
 */

'use server';

import { auth } from '@clerk/nextjs/server';
import { getApiBase } from '@/lib/api-base';

// ============================================
// TYPES
// ============================================

export type IntentScope = 'GLOBAL' | 'ROOM';
export type IntentStatus = 'DRAFT' | 'LOCKED';

export interface IntentPayload {
  interiorStyles?: string[];
  mood?: string;
  culturalInfluence?: string;
  inspirationSources?: string[];
  primaryColorPalette?: string;
  secondaryAccents?: string;
  preferredMaterials?: string[];
  textures?: string;
  furnitureStyle?: string;
  comfortVsAesthetics?: number;
  layoutPreference?: 'open' | 'enclosed' | 'mixed';
  storagePreference?: 'low' | 'medium' | 'high';
  naturalLightImportance?: number;
  artificialLightingStyle?: string;
  lightTemperature?: 'warm' | 'neutral' | 'cool';
  householdType?: 'family' | 'couple' | 'bachelor' | 'shared';
  hasKids?: boolean;
  hasElders?: boolean;
  hasPets?: boolean;
  workFromHome?: boolean;
  entertainmentFocus?: 'low' | 'medium' | 'high';
  budgetRange?: string;
  executionPriority?: 'design' | 'cost' | 'speed';
  maintenanceTolerance?: 'low' | 'medium' | 'high';
  referenceImageUrls?: string[];
  pinterestLinks?: string[];
  instagramLinks?: string[];
}

export interface SavedIntent {
  id: string;
  projectId: string;
  scope: IntentScope;
  roomId?: string;
  version: number;
  status: IntentStatus;
  payload: IntentPayload;
  createdAt: string;
  lockedAt?: string;
}

export interface MoodboardJob {
  jobId: string;
  roomId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  moodboardId?: string;
  moodboardUrl?: string;
  error?: string;
}

// ============================================
// SAVE INTENT
// ============================================

export async function saveIntent(
  projectId: string,
  scope: IntentScope,
  payload: IntentPayload,
  roomId?: string
): Promise<{ success: boolean; intentId?: string; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}/intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        scope,
        roomId,
        payload,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error?.message || 'Failed to save intent' };
    }

    const { data } = await response.json();
    return { success: true, intentId: data.id };
  } catch (error) {
    console.error('Save intent error:', error);
    return { success: false, error: 'Failed to save intent' };
  }
}

// ============================================
// LOCK INTENT
// ============================================

export async function lockIntent(
  projectId: string,
  intentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}/intents/${intentId}/lock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error?.message || 'Failed to lock intent' };
    }

    return { success: true };
  } catch (error) {
    console.error('Lock intent error:', error);
    return { success: false, error: 'Failed to lock intent' };
  }
}

// ============================================
// TRIGGER MOODBOARD GENERATION
// ============================================

/**
 * Trigger moodboard generation for a room.
 * This creates an AI job in the queue.
 */
export async function triggerMoodboardGeneration(
  projectId: string,
  roomId: string,
  intentPayload: IntentPayload,
  roomName?: string,
  roomType?: string,
  areaEstimate?: number
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
        type: 'MOODBOARD',
        projectId,
        roomId,
        payload: {
          projectId,
          intentPayload,
          roomId,
          roomName,
          roomType,
          areaEstimate,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error?.message || 'Failed to start moodboard generation' };
    }

    const { data } = await response.json();
    return { success: true, jobId: data.id };
  } catch (error) {
    console.error('Trigger moodboard error:', error);
    return { success: false, error: 'Failed to start moodboard generation' };
  }
}

/**
 * Trigger moodboard generation for all rooms (global intent flow).
 * AI will map the global intent to each room.
 * 
 * SMART GENERATION: Only generates moodboards for rooms that don't already have them.
 */
export async function triggerGlobalMoodboardGeneration(
  projectId: string,
  rooms: Array<{ id: string; name: string; type: string }>,
  intentPayload: IntentPayload
): Promise<{ success: boolean; jobs?: MoodboardJob[]; errors?: string[]; skipped?: number }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, errors: ['Not authenticated'] };
    }

    // First, fetch existing moodboards to check which rooms already have them
    const moodboardsResult = await getProjectMoodboards(projectId);
    const existingMoodboards = moodboardsResult.success && moodboardsResult.moodboards 
      ? moodboardsResult.moodboards 
      : [];
    
    const roomsWithMoodboards = new Set(existingMoodboards.map(m => m.roomId));

    // Filter to only rooms that need moodboards
    const roomsNeedingMoodboards = rooms.filter(room => !roomsWithMoodboards.has(room.id));
    const skippedCount = rooms.length - roomsNeedingMoodboards.length;

    console.log(`[Intent] ${skippedCount} rooms already have moodboards, generating for ${roomsNeedingMoodboards.length} remaining rooms`);

    const jobs: MoodboardJob[] = [];
    const errors: string[] = [];

    // Create a job for each room that needs a moodboard
    for (const room of roomsNeedingMoodboards) {
      try {
        const response = await fetch(`${getApiBase()}/api/jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'MOODBOARD',
            projectId,
            roomId: room.id,
            payload: {
              projectId,
              intentPayload,
              roomId: room.id,
              roomName: room.name,
              roomType: room.type,
              isGlobalIntent: true,
            },
          }),
        });

        if (response.ok) {
          const { data } = await response.json();
          jobs.push({
            jobId: data.id,
            roomId: room.id,
            status: 'QUEUED',
            progress: 0,
          });
        } else {
          const errorData = await response.json();
          errors.push(`${room.name}: ${errorData.error?.message || 'Failed'}`);
        }
      } catch (e) {
        errors.push(`${room.name}: Network error`);
      }
    }

    return { 
      success: errors.length === 0, 
      jobs,
      errors: errors.length > 0 ? errors : undefined,
      skipped: skippedCount,
    };
  } catch (error) {
    console.error('Trigger global moodboard error:', error);
    return { success: false, errors: ['Failed to start generation'] };
  }
}

/**
 * FORCE regenerate moodboards for ALL rooms (creates new versions).
 * Used for "Redo All" functionality.
 */
export async function regenerateAllMoodboards(
  projectId: string,
  rooms: Array<{ id: string; name: string; type: string }>,
  intentPayload: IntentPayload
): Promise<{ success: boolean; jobs?: MoodboardJob[]; errors?: string[] }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, errors: ['Not authenticated'] };
    }

    // Get existing moodboards to determine next version numbers
    const moodboardsResult = await getProjectMoodboards(projectId);
    const existingMoodboards = moodboardsResult.success && moodboardsResult.moodboards 
      ? moodboardsResult.moodboards 
      : [];
    
    // Create a map of roomId -> current max version
    const roomVersions = new Map<string, number>();
    existingMoodboards.forEach(m => {
      const currentVersion = roomVersions.get(m.roomId) || 0;
      roomVersions.set(m.roomId, Math.max(currentVersion, m.version));
    });

    console.log(`[Intent] Force regenerating all ${rooms.length} rooms with incremented versions`);

    const jobs: MoodboardJob[] = [];
    const errors: string[] = [];

    // Create a job for EVERY room (no filtering)
    for (const room of rooms) {
      try {
        const currentVersion = roomVersions.get(room.id) || 0;
        const nextVersion = currentVersion + 1;
        
        const response = await fetch(`${getApiBase()}/api/jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'MOODBOARD',
            projectId,
            roomId: room.id,
            payload: {
              projectId,
              intentPayload,
              roomId: room.id,
              roomName: room.name,
              roomType: room.type,
              isGlobalIntent: true,
              version: nextVersion, // Incremented version!
            },
          }),
        });

        if (response.ok) {
          const { data } = await response.json();
          jobs.push({
            jobId: data.id,
            roomId: room.id,
            status: 'QUEUED',
            progress: 0,
          });
          console.log(`[Intent] Room ${room.name} queued for regeneration (v${nextVersion})`);
        } else {
          const errorData = await response.json();
          errors.push(`${room.name}: ${errorData.error?.message || 'Failed'}`);
        }
      } catch (e) {
        errors.push(`${room.name}: Network error`);
      }
    }

    return { 
      success: errors.length === 0, 
      jobs,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Regenerate all moodboards error:', error);
    return { success: false, errors: ['Failed to start regeneration'] };
  }
}

// ============================================
// GET JOB STATUS
// ============================================

export async function getMoodboardJobStatus(
  jobId: string
): Promise<{ success: boolean; job?: MoodboardJob; error?: string }> {
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
      return { success: false, error: 'Failed to fetch job status' };
    }

    const { data } = await response.json();
    
    return {
      success: true,
      job: {
        jobId: data.id,
        roomId: data.roomId,
        status: data.status,
        progress: data.progress,
        moodboardId: data.result?.moodboardId,
        moodboardUrl: data.result?.moodboardUrl,
        error: data.error,
      },
    };
  } catch (error) {
    console.error('Get job status error:', error);
    return { success: false, error: 'Failed to fetch job status' };
  }
}

// ============================================
// FETCH EXISTING INTENTS
// ============================================

export async function getProjectIntents(
  projectId: string
): Promise<{ success: boolean; intents?: SavedIntent[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/projects/${projectId}/intents`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // 404 is okay - no intents yet
      if (response.status === 404) {
        return { success: true, intents: [] };
      }
      return { success: false, error: 'Failed to fetch intents' };
    }

    const { data } = await response.json();
    return { success: true, intents: data };
  } catch (error) {
    console.error('Get intents error:', error);
    return { success: false, error: 'Failed to fetch intents' };
  }
}

// ============================================
// GET ACTIVE JOBS FOR PROJECT
// ============================================

export interface ActiveJob {
  id: string;
  type: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  roomId: string;
  result?: {
    assetUrl?: string;
    versionId?: string;
    moodboardUrl?: string;
    moodboardId?: string;
  };
  error?: string;
  createdAt: string;
}

export async function getProjectActiveJobs(
  projectId: string
): Promise<{ success: boolean; jobs?: ActiveJob[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${getApiBase()}/api/jobs?projectId=${projectId}&status=QUEUED,PROCESSING`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch jobs' };
    }

    const { data } = await response.json();
    return { success: true, jobs: data || [] };
  } catch (error) {
    console.error('Get active jobs error:', error);
    return { success: false, error: 'Failed to fetch jobs' };
  }
}

// ============================================
// FETCH ROOM MOODBOARDS
// ============================================

export interface RoomMoodboard {
  id: string;
  roomId: string;
  roomName: string;
  version: number;
  imageUrl: string;
  s3Key?: string; // S3 key for direct access
  generatedAt: string;
  intentId?: string;
}

export async function getProjectMoodboards(
  projectId: string
): Promise<{ success: boolean; moodboards?: RoomMoodboard[]; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    // Fetch project with rooms and their moodboards
    const response = await fetch(`${getApiBase()}/api/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch project' };
    }

    const { data: project } = await response.json();
    
    // Extract moodboards from rooms
    const moodboards: RoomMoodboard[] = [];
    
    for (const room of project.rooms || []) {
      if (room.moodboards && room.moodboards.length > 0) {
        // Get latest moodboard for each room
        const latestMoodboard = room.moodboards[0];
        moodboards.push({
          id: latestMoodboard.id,
          roomId: room.id,
          roomName: room.name,
          version: latestMoodboard.version || 1,
          imageUrl: latestMoodboard.imageUrl || latestMoodboard.s3Url,
          s3Key: latestMoodboard.s3Key,
          generatedAt: latestMoodboard.createdAt,
          intentId: latestMoodboard.intentId,
        });
      }
    }

    return { success: true, moodboards };
  } catch (error) {
    console.error('Get moodboards error:', error);
    return { success: false, error: 'Failed to fetch moodboards' };
  }
}

// ============================================
// REGENERATE SINGLE ROOM MOODBOARD
// ============================================

/**
 * Regenerate moodboard for a single room (creates a new version).
 * Used in room-wise themes gallery for per-room regeneration.
 */
export async function regenerateMoodboard(
  projectId: string,
  roomId: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the room's existing intent and current moodboard version
    const intentsResult = await getProjectIntents(projectId);
    if (!intentsResult.success || !intentsResult.intents) {
      return { success: false, error: 'Failed to fetch room intent' };
    }

    // Find the room-specific intent
    const roomIntent = intentsResult.intents.find(
      (intent) => intent.scope === 'ROOM' && intent.roomId === roomId
    );

    if (!roomIntent) {
      return { success: false, error: 'No intent found for this room' };
    }

    // Get current moodboard to determine next version
    const moodboardsResult = await getProjectMoodboards(projectId);
    const existingMoodboards = moodboardsResult.success && moodboardsResult.moodboards 
      ? moodboardsResult.moodboards 
      : [];
    
    const roomMoodboards = existingMoodboards.filter(m => m.roomId === roomId);
    const currentVersion = roomMoodboards.length > 0 
      ? Math.max(...roomMoodboards.map(m => m.version))
      : 0;
    const nextVersion = currentVersion + 1;

    console.log(`[Intent] Regenerating moodboard for room ${roomId} (v${nextVersion})`);

    let roomName: string | undefined;
    let roomType: string | undefined;

    try {
      const projectResponse = await fetch(`${getApiBase()}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (projectResponse.ok) {
        const { data } = await projectResponse.json();
        const projectRoom = data?.rooms?.find((room: { id: string; name?: string; type?: string }) => room.id === roomId);
        roomName = projectRoom?.name;
        roomType = projectRoom?.type;
      }
    } catch {
      // Non-blocking; regenerate can proceed without room metadata
    }

    // Create regeneration job
    const response = await fetch(`${getApiBase()}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'MOODBOARD',
        projectId,
        roomId,
        payload: {
          projectId,
          intentPayload: roomIntent.payload,
          roomId,
          roomName,
          roomType,
          version: nextVersion,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error?.message || 'Failed to start regeneration' };
    }

    const { data } = await response.json();
    return { success: true, jobId: data.id };
  } catch (error) {
    console.error('Regenerate moodboard error:', error);
    return { success: false, error: 'Failed to start regeneration' };
  }
}

