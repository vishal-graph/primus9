/**
 * TatvaOps Vision - Sense Layer State Management
 * 
 * Manages:
 * - Uploaded sense inputs (images, files, text)
 * - Intent inference job status
 * - Intent Graph (AI-inferred)
 * - Refinement state
 * 
 * State Machine:
 * UPLOADING → UPLOADED → PROCESSING → INFERRED → (REFINING) → READY
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IntentGraph } from '@/lib/actions/sense';

// ============================================
// TYPES
// ============================================

export type SenseStatus = 
  | 'IDLE' 
  | 'UPLOADING' 
  | 'UPLOADED' 
  | 'PROCESSING' 
  | 'INFERRED' 
  | 'REFINING' 
  | 'READY' 
  | 'FAILED';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'other';
  size: number;
  uploadedAt: string;
}

export interface SenseInput {
  images: UploadedFile[];
  floorPlan?: UploadedFile;
  moodboards: UploadedFile[];
  text?: string;
  hints?: {
    spaceType?: string;
    budget?: string;
    style?: string;
    [key: string]: unknown;
  };
}

export interface SenseJob {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface SenseState {
  // Current project context
  projectId: string | null;
  projectName: string | null;

  // Upload state
  status: SenseStatus;
  inputs: SenseInput;
  
  // Job tracking
  currentJob: SenseJob | null;
  fromCache: boolean;
  
  // Intent Graph (AI-inferred)
  intentGraph: IntentGraph | null;
  
  // Refinement tracking
  hasUserRefinements: boolean;
  refinementJob: SenseJob | null;
  
  // UI state
  uploadProgress: number;
  error: string | null;
  showIntentPreview: boolean;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: SenseState = {
  projectId: null,
  projectName: null,
  status: 'IDLE',
  inputs: {
    images: [],
    moodboards: [],
  },
  currentJob: null,
  fromCache: false,
  intentGraph: null,
  hasUserRefinements: false,
  refinementJob: null,
  uploadProgress: 0,
  error: null,
  showIntentPreview: false,
};

// ============================================
// SLICE
// ============================================

const senseSlice = createSlice({
  name: 'sense',
  initialState,
  reducers: {
    // ============================================
    // PROJECT SETUP
    // ============================================

    setProject(
      state,
      action: PayloadAction<{ projectId: string; projectName: string }>
    ) {
      state.projectId = action.payload.projectId;
      state.projectName = action.payload.projectName;
      state.status = 'IDLE';
      state.error = null;
    },

    // ============================================
    // FILE UPLOADS
    // ============================================

    startUpload(state) {
      state.status = 'UPLOADING';
      state.uploadProgress = 0;
      state.error = null;
    },

    updateUploadProgress(state, action: PayloadAction<number>) {
      state.uploadProgress = action.payload;
    },

    addUploadedFile(state, action: PayloadAction<{ file: UploadedFile; category: 'images' | 'floorPlan' | 'moodboards' }>) {
      const { file, category } = action.payload;
      if (category === 'floorPlan') {
        state.inputs.floorPlan = file;
      } else if (category === 'images') {
        state.inputs.images.push(file);
      } else if (category === 'moodboards') {
        state.inputs.moodboards.push(file);
      }
    },

    removeUploadedFile(state, action: PayloadAction<string>) {
      const fileId = action.payload;
      state.inputs.images = state.inputs.images.filter((f) => f.id !== fileId);
      state.inputs.moodboards = state.inputs.moodboards.filter((f) => f.id !== fileId);
      if (state.inputs.floorPlan?.id === fileId) {
        state.inputs.floorPlan = undefined;
      }
    },

    uploadComplete(state) {
      state.status = 'UPLOADED';
      state.uploadProgress = 100;
    },

    uploadFailed(state, action: PayloadAction<string>) {
      state.status = 'FAILED';
      state.error = action.payload;
      state.uploadProgress = 0;
    },

    // ============================================
    // TEXT & HINTS
    // ============================================

    setTextInput(state, action: PayloadAction<string>) {
      state.inputs.text = action.payload;
    },

    setHints(state, action: PayloadAction<Record<string, unknown>>) {
      state.inputs.hints = action.payload;
    },

    updateHint(state, action: PayloadAction<{ key: string; value: unknown }>) {
      if (!state.inputs.hints) {
        state.inputs.hints = {};
      }
      state.inputs.hints[action.payload.key] = action.payload.value;
    },

    // ============================================
    // INTENT INFERENCE
    // ============================================

    startProcessing(state, action: PayloadAction<{ jobId: string; fromCache: boolean }>) {
      state.status = 'PROCESSING';
      state.fromCache = action.payload.fromCache;
      state.currentJob = {
        jobId: action.payload.jobId,
        status: 'QUEUED',
        startedAt: new Date().toISOString(),
      };
      state.error = null;
    },

    updateJobProgress(
      state,
      action: PayloadAction<{ jobId: string; status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; progress?: number; error?: string }>
    ) {
      if (state.currentJob?.jobId === action.payload.jobId) {
        state.currentJob.status = action.payload.status;
        state.currentJob.progress = action.payload.progress;
        state.currentJob.error = action.payload.error;

        if (action.payload.status === 'COMPLETED') {
          state.currentJob.completedAt = new Date().toISOString();
          state.status = 'INFERRED';
        } else if (action.payload.status === 'FAILED') {
          state.status = 'FAILED';
          state.error = action.payload.error || 'Intent inference failed';
        }
      }
    },

    setIntentGraph(state, action: PayloadAction<IntentGraph>) {
      state.intentGraph = action.payload;
      state.status = 'READY';
      state.error = null;
    },

    inferenceComplete(state, action: PayloadAction<IntentGraph>) {
      state.intentGraph = action.payload;
      state.status = 'READY';
      state.showIntentPreview = true;
      if (state.currentJob) {
        state.currentJob.status = 'COMPLETED';
        state.currentJob.completedAt = new Date().toISOString();
      }
    },

    inferenceFailed(state, action: PayloadAction<string>) {
      state.status = 'FAILED';
      state.error = action.payload;
      if (state.currentJob) {
        state.currentJob.status = 'FAILED';
        state.currentJob.error = action.payload;
      }
    },

    // ============================================
    // REFINEMENT
    // ============================================

    startRefinement(state, action: PayloadAction<string>) {
      state.status = 'REFINING';
      state.hasUserRefinements = true;
      state.refinementJob = {
        jobId: action.payload,
        status: 'QUEUED',
        startedAt: new Date().toISOString(),
      };
      state.error = null;
    },

    updateRefinementProgress(
      state,
      action: PayloadAction<{ jobId: string; status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; progress?: number; error?: string }>
    ) {
      if (state.refinementJob?.jobId === action.payload.jobId) {
        state.refinementJob.status = action.payload.status;
        state.refinementJob.progress = action.payload.progress;
        state.refinementJob.error = action.payload.error;

        if (action.payload.status === 'COMPLETED') {
          state.refinementJob.completedAt = new Date().toISOString();
          state.status = 'READY';
        } else if (action.payload.status === 'FAILED') {
          state.status = 'FAILED';
          state.error = action.payload.error || 'Refinement failed';
        }
      }
    },

    refinementComplete(state, action: PayloadAction<IntentGraph>) {
      state.intentGraph = action.payload;
      state.status = 'READY';
      if (state.refinementJob) {
        state.refinementJob.status = 'COMPLETED';
        state.refinementJob.completedAt = new Date().toISOString();
      }
    },

    // ============================================
    // UI CONTROL
    // ============================================

    toggleIntentPreview(state) {
      state.showIntentPreview = !state.showIntentPreview;
    },

    setShowIntentPreview(state, action: PayloadAction<boolean>) {
      state.showIntentPreview = action.payload;
    },

    clearError(state) {
      state.error = null;
    },

    // ============================================
    // RESET
    // ============================================

    resetSense(state) {
      return initialState;
    },

    resetInputs(state) {
      state.inputs = {
        images: [],
        moodboards: [],
      };
      state.status = 'IDLE';
      state.error = null;
      state.uploadProgress = 0;
    },
  },
});

// ============================================
// EXPORTS
// ============================================

export const {
  setProject,
  startUpload,
  updateUploadProgress,
  addUploadedFile,
  removeUploadedFile,
  uploadComplete,
  uploadFailed,
  setTextInput,
  setHints,
  updateHint,
  startProcessing,
  updateJobProgress,
  setIntentGraph,
  inferenceComplete,
  inferenceFailed,
  startRefinement,
  updateRefinementProgress,
  refinementComplete,
  toggleIntentPreview,
  setShowIntentPreview,
  clearError,
  resetSense,
  resetInputs,
} = senseSlice.actions;

export default senseSlice.reducer;
