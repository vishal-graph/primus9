/**
 * TatvaOps Vision - AI Job Slice
 * 
 * Manages:
 * - Active AI jobs
 * - Job status and progress
 * - Job results
 * - Job history
 * 
 * Critical for non-blocking UI with real-time feedback
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

export type AIJobType = 
  | 'FLOORPLAN_ANALYSIS'
  | 'MOODBOARD'
  | 'ELEVATION'
  | 'INTERIOR'
  | 'COMPONENT_UPDATE';

export type AIJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AIJob {
  id: string;
  projectId: string;
  roomId?: string;
  type: AIJobType;
  status: AIJobStatus;
  progress?: number;        // 0-100
  result?: unknown;
  error?: string;
  retryCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AIJobsState {
  jobs: Record<string, AIJob>;  // Keyed by job ID
  activeJobIds: string[];        // Currently active jobs
  recentJobIds: string[];        // Last 10 completed jobs
}

const initialState: AIJobsState = {
  jobs: {},
  activeJobIds: [],
  recentJobIds: [],
};

const aiJobSlice = createSlice({
  name: 'aiJobs',
  initialState,
  reducers: {
    // Add new job
    addJob: (state, action: PayloadAction<AIJob>) => {
      const job = action.payload;
      state.jobs[job.id] = job;
      state.activeJobIds.push(job.id);
    },
    
    // Update job status
    updateJobStatus: (
      state,
      action: PayloadAction<{ jobId: string; status: AIJobStatus; progress?: number }>
    ) => {
      const { jobId, status, progress } = action.payload;
      const job = state.jobs[jobId];
      
      if (job) {
        job.status = status;
        if (progress !== undefined) {
          job.progress = progress;
        }
        
        // Update timestamps
        if (status === 'PROCESSING' && !job.startedAt) {
          job.startedAt = new Date();
        }
        if (status === 'COMPLETED' || status === 'FAILED') {
          job.completedAt = new Date();
          // Move from active to recent
          state.activeJobIds = state.activeJobIds.filter(id => id !== jobId);
          state.recentJobIds = [jobId, ...state.recentJobIds.slice(0, 9)];
        }
      }
    },
    
    // Update job with result
    updateJobResult: (
      state,
      action: PayloadAction<{ jobId: string; result: unknown }>
    ) => {
      const { jobId, result } = action.payload;
      const job = state.jobs[jobId];
      
      if (job) {
        job.result = result;
        job.status = 'COMPLETED';
        job.completedAt = new Date();
        // Move from active to recent
        state.activeJobIds = state.activeJobIds.filter(id => id !== jobId);
        state.recentJobIds = [jobId, ...state.recentJobIds.slice(0, 9)];
      }
    },
    
    // Update job with error
    updateJobError: (
      state,
      action: PayloadAction<{ jobId: string; error: string }>
    ) => {
      const { jobId, error } = action.payload;
      const job = state.jobs[jobId];
      
      if (job) {
        job.error = error;
        job.status = 'FAILED';
        job.completedAt = new Date();
        // Move from active to recent
        state.activeJobIds = state.activeJobIds.filter(id => id !== jobId);
        state.recentJobIds = [jobId, ...state.recentJobIds.slice(0, 9)];
      }
    },
    
    // Retry job
    retryJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      const job = state.jobs[jobId];
      
      if (job) {
        job.status = 'QUEUED';
        job.error = undefined;
        job.progress = 0;
        job.retryCount += 1;
        // Move back to active
        if (!state.activeJobIds.includes(jobId)) {
          state.activeJobIds.push(jobId);
        }
        state.recentJobIds = state.recentJobIds.filter(id => id !== jobId);
      }
    },
    
    // Clear completed jobs
    clearCompleted: (state) => {
      const completedIds = state.recentJobIds.filter(
        id => state.jobs[id]?.status === 'COMPLETED'
      );
      completedIds.forEach(id => {
        delete state.jobs[id];
      });
      state.recentJobIds = state.recentJobIds.filter(
        id => !completedIds.includes(id)
      );
    },
    
    // Clear all jobs (for project switch)
    clearAllJobs: (state) => {
      state.jobs = {};
      state.activeJobIds = [];
      state.recentJobIds = [];
    },
  },
});

export const {
  addJob,
  updateJobStatus,
  updateJobResult,
  updateJobError,
  retryJob,
  clearCompleted,
  clearAllJobs,
} = aiJobSlice.actions;

export default aiJobSlice.reducer;

// Selectors
export const selectJob = (jobId: string) => (state: { aiJobs: AIJobsState }) =>
  state.aiJobs.jobs[jobId];

// Base selectors
const selectAllJobs = (state: { aiJobs: AIJobsState }) => state.aiJobs.jobs;
const selectActiveJobIds = (state: { aiJobs: AIJobsState }) => state.aiJobs.activeJobIds;
const selectRecentJobIds = (state: { aiJobs: AIJobsState }) => state.aiJobs.recentJobIds;

// Memoized selectors
export const selectActiveJobs = createSelector(
  [selectActiveJobIds, selectAllJobs],
  (activeIds, jobs) => activeIds.map(id => jobs[id]).filter(Boolean)
);

export const selectRecentJobs = createSelector(
  [selectRecentJobIds, selectAllJobs],
  (recentIds, jobs) => recentIds.map(id => jobs[id]).filter(Boolean)
);

export const selectJobsByType = (type: AIJobType) => createSelector(
  [selectAllJobs],
  (jobs) => Object.values(jobs).filter(job => job.type === type)
);

export const selectJobsByRoom = (roomId: string) => createSelector(
  [selectAllJobs],
  (jobs) => Object.values(jobs).filter(job => job.roomId === roomId)
);

export const selectHasActiveJobs = createSelector(
  [selectActiveJobIds],
  (activeIds) => activeIds.length > 0
);

