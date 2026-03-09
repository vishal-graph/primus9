/**
 * Build Project Context for Feedback Engine
 * 
 * Collects project metadata to generate context-aware feedback forms
 */

import { getProject } from '@/lib/actions/project';
import { getProjectMoodboards } from '@/lib/actions/intent';
import type { ProjectContext } from './feedback-engine';

export async function buildProjectContext(
  projectId: string,
  userId: string
): Promise<ProjectContext | null> {
  try {
    // Fetch project data
    const project = await getProject(projectId);
    if (!project) {
      return null;
    }

    // Fetch moodboards to check which rooms have them
    const moodboardsResult = await getProjectMoodboards(projectId);
    const moodboards = moodboardsResult.moodboards || [];

    // Build rooms array
    const rooms = (project.rooms || []).map((room) => ({
      id: room.id,
      name: room.name,
      type: room.type,
      hasMoodboard: moodboards.some((mb) => mb.roomId === room.id),
    }));

    // Determine stages used (simplified - can be enhanced)
    const stagesUsed: string[] = [];
    if (project.currentStage) {
  const stageOrder = [
    'FLOOR_PLAN',
    'INTENT',
    'MOODBOARD',
    'ELEVATION',
    'TWO_D_VIEWS',
    'COMPONENT',
    'ROOM_WALKTHROUGH',
    'INTERIOR',
    'EXPORT',
  ];
      const currentIndex = stageOrder.indexOf(project.currentStage);
      if (currentIndex >= 0) {
        stagesUsed.push(...stageOrder.slice(0, currentIndex + 1));
      }
    }

    // Check if single theme (simplified - assumes single theme if all rooms share same intent)
    // This can be enhanced by checking actual intent data
    const isSingleTheme = true; // Default assumption, can be enhanced

    // Calculate time spent (rough estimate based on creation time)
    const timeSpent = project.createdAt
      ? Math.round((Date.now() - new Date(project.createdAt).getTime()) / 60000)
      : undefined;

    return {
      projectId,
      userId,
      rooms,
      stagesUsed,
      regenerationCount: 0, // TODO: Calculate from AI jobs
      timeSpent,
      errorsOrRetries: 0, // TODO: Calculate from failed jobs
      selectedStyles: [], // TODO: Extract from intent data
      planType: undefined, // TODO: Get from user subscription
      isSingleTheme,
    };
  } catch (error) {
    console.error('Error building project context:', error);
    return null;
  }
}

