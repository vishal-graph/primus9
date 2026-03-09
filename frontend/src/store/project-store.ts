import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Project, ProjectStage } from '@/types/project';

interface ProjectState {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
}

interface ProjectActions {
  setProject: (project: Project | null) => void;
  updateStage: (stage: ProjectStage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type ProjectStore = ProjectState & ProjectActions;

const initialState: ProjectState = {
  project: null,
  isLoading: false,
  error: null,
};

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (set: (partial: Partial<ProjectStore> | ((state: ProjectStore) => Partial<ProjectStore>), replace?: boolean, action?: string) => void) => ({
        ...initialState,

        setProject: (project) =>
          set({ project, error: null }, false, 'setProject'),

        updateStage: (stage) =>
          set(
            (state) =>
              state.project
                ? {
                    project: {
                      ...state.project,
                      currentStage: stage,
                      updatedAt: new Date(),
                    },
                  }
                : state,
            false,
            'updateStage'
          ),

        setLoading: (isLoading) =>
          set({ isLoading }, false, 'setLoading'),

        setError: (error) =>
          set({ error }, false, 'setError'),

        reset: () =>
          set(initialState, false, 'reset'),
      }),
      {
        name: 'tatvaops-vision-project',
        partialize: (state) => ({
          // Only persist project ID, not full state
          projectId: state.project?.id,
        }),
      }
    ),
    { name: 'ProjectStore' }
  )
);

