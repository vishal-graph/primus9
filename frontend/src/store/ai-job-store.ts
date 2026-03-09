import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AIJob, AIJobStatus } from '@/types/ai-job';

interface AIJobState {
  activeJobs: Map<string, AIJob>;
  completedJobs: AIJob[];
  pollingJobIds: Set<string>;
}

interface AIJobActions {
  addJob: (job: AIJob) => void;
  updateJobStatus: (jobId: string, status: AIJobStatus, result?: unknown) => void;
  removeJob: (jobId: string) => void;
  startPolling: (jobId: string) => void;
  stopPolling: (jobId: string) => void;
  getJobById: (jobId: string) => AIJob | undefined;
  getJobsByRoom: (roomId: string) => AIJob[];
  clearCompleted: () => void;
}

type AIJobStore = AIJobState & AIJobActions;

export const useAIJobStore = create<AIJobStore>()(
  devtools(
    (set: (partial: Partial<AIJobStore> | ((state: AIJobStore) => Partial<AIJobStore>), replace?: boolean, action?: string) => void, get: () => AIJobStore) => ({
      activeJobs: new Map(),
      completedJobs: [],
      pollingJobIds: new Set(),

      addJob: (job) =>
        set(
          (state) => {
            const newActiveJobs = new Map(state.activeJobs);
            newActiveJobs.set(job.id, job);
            return { activeJobs: newActiveJobs };
          },
          false,
          'addJob'
        ),

      updateJobStatus: (jobId, status, result) =>
        set(
          (state) => {
            const job = state.activeJobs.get(jobId);
            if (!job) return state;

            const updatedJob: AIJob = {
              ...job,
              status,
              result: result as AIJob['result'],
              updatedAt: new Date(),
              ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
            };

            if (status === 'COMPLETED' || status === 'FAILED') {
              const newActiveJobs = new Map(state.activeJobs);
              newActiveJobs.delete(jobId);
              const newPollingJobIds = new Set(state.pollingJobIds);
              newPollingJobIds.delete(jobId);

              return {
                activeJobs: newActiveJobs,
                completedJobs: [...state.completedJobs, updatedJob],
                pollingJobIds: newPollingJobIds,
              };
            }

            const newActiveJobs = new Map(state.activeJobs);
            newActiveJobs.set(jobId, updatedJob);
            return { activeJobs: newActiveJobs };
          },
          false,
          'updateJobStatus'
        ),

      removeJob: (jobId) =>
        set(
          (state) => {
            const newActiveJobs = new Map(state.activeJobs);
            newActiveJobs.delete(jobId);
            const newPollingJobIds = new Set(state.pollingJobIds);
            newPollingJobIds.delete(jobId);
            return {
              activeJobs: newActiveJobs,
              pollingJobIds: newPollingJobIds,
            };
          },
          false,
          'removeJob'
        ),

      startPolling: (jobId) =>
        set(
          (state) => {
            const newPollingJobIds = new Set(state.pollingJobIds);
            newPollingJobIds.add(jobId);
            return { pollingJobIds: newPollingJobIds };
          },
          false,
          'startPolling'
        ),

      stopPolling: (jobId) =>
        set(
          (state) => {
            const newPollingJobIds = new Set(state.pollingJobIds);
            newPollingJobIds.delete(jobId);
            return { pollingJobIds: newPollingJobIds };
          },
          false,
          'stopPolling'
        ),

      getJobById: (jobId) => get().activeJobs.get(jobId),

      getJobsByRoom: (roomId) => {
        const jobs: AIJob[] = [];
        get().activeJobs.forEach((job) => {
          if ('roomId' in job.payload && job.payload.roomId === roomId) {
            jobs.push(job);
          }
        });
        return jobs;
      },

      clearCompleted: () =>
        set({ completedJobs: [] }, false, 'clearCompleted'),
    }),
    { name: 'AIJobStore' }
  )
);

