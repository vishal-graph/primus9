'use client';

import { createContext, useContext, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/project-store';
import type { Project, ProjectStage } from '@/types/project';

interface ProjectContextValue {
  currentProject: Project | null;
  isLoading: boolean;
  setProject: (project: Project | null) => void;
  updateStage: (stage: ProjectStage) => void;
  canNavigateToStage: (stage: ProjectStage) => boolean;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

interface ProjectProviderProps {
  children: React.ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const { project, isLoading, setProject, updateStage } = useProjectStore();

  /**
   * Non-linear flow: Users can navigate to any stage they've unlocked
   * Stages are unlocked based on completion of prerequisites
   */
  const canNavigateToStage = useCallback(
    (targetStage: ProjectStage): boolean => {
      if (!project) return false;

      const stageOrder: ProjectStage[] = [
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
      const targetIndex = stageOrder.indexOf(targetStage);

      // Can always go back to completed stages
      // Can go forward only to current stage or one ahead
      return targetIndex <= currentIndex + 1;
    },
    [project]
  );

  const value = useMemo(
    () => ({
      currentProject: project,
      isLoading,
      setProject,
      updateStage,
      canNavigateToStage,
    }),
    [project, isLoading, setProject, updateStage, canNavigateToStage]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

