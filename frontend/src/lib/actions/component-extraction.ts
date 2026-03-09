'use server';

import { serverFetch } from '@/lib/api-client';
import { createAIJob } from '@/lib/actions/ai-job';

export interface ComponentExtractionRow {
  roomName: string;
  componentCategory: string;
  componentName: string;
  description: string;
  material: string;
  finishColor: string;
  approximateSize: string;
  placement: string;
  wallLocation: string;
  suggestedBuyLinks: Array<{ label: string; url: string; note?: string }> | string;
  confidence: string;
}

export interface RoomComponentTable {
  roomId: string;
  roomName: string;
  rows: ComponentExtractionRow[];
  s3Key?: string;
  version: number;
  createdAt: string;
}

export interface ProjectComponentTables {
  rooms: RoomComponentTable[];
  combined: ComponentExtractionRow[];
}

export async function getProjectComponents(
  projectId: string
): Promise<{ success: boolean; data?: ProjectComponentTables; error?: string }> {
  const response = await serverFetch<ProjectComponentTables>(`/api/projects/${projectId}/components`);

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to fetch component tables',
    };
  }

  const normalized = response.data
    ? {
        ...response.data,
        rooms: response.data.rooms.map((room) => ({
          ...room,
          rows: (room.rows || []).map((row: any) => ({
            ...row,
            suggestedBuyLinks: row.suggestedBuyLinks || [],
            confidence: typeof row.confidence === 'number' ? String(row.confidence) : row.confidence || '',
          })),
        })),
      }
    : undefined;

  return {
    success: true,
    data: normalized,
  };
}

export async function triggerComponentExtraction(
  projectId: string,
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await createAIJob('COMPONENT_EXTRACTION', projectId, {
    projectId,
    roomId,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Failed to trigger extraction' };
  }

  return { success: true };
}
