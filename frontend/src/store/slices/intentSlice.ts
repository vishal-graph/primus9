/**
 * TatvaOps Vision - Intent State Management
 * 
 * Manages:
 * - Intent mode (GLOBAL vs ROOM)
 * - Intent drafts and locked intents
 * - Generation status per room
 * - Version tracking
 * 
 * State Machine per room:
 * DRAFT_INTENT → LOCKED → GENERATING → GENERATED → (REGENERATED)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ============================================
// TYPES
// ============================================

export type IntentMode = 'GLOBAL' | 'ROOM';
export type IntentScope = 'GLOBAL' | 'ROOM';
export type IntentStatus = 'DRAFT' | 'LOCKED';
export type GenerationStatus = 'IDLE' | 'QUEUED' | 'GENERATING' | 'GENERATED' | 'FAILED';

// Form field option types
export interface SelectOption {
  value: string;
  label: string;
}

// Intent payload structure (comprehensive form data)
export interface IntentPayload {
  // A. Overall Style Direction
  interiorStyles: string[];        // multi-select
  mood: string;                    // dropdown
  culturalInfluence?: string;      // optional dropdown
  inspirationSources?: string[];   // AI-suggested tags

  // B. Color & Material Preferences
  primaryColorPalette: string;     // dropdown
  secondaryAccents: string;        // dropdown
  preferredMaterials: string[];    // multi-select
  textures: string;                // dropdown

  // C. Furniture & Layout Preferences
  furnitureStyle: string;          // dropdown
  comfortVsAesthetics: number;     // slider 0-100
  layoutPreference: 'open' | 'enclosed' | 'mixed';
  storagePreference: 'low' | 'medium' | 'high';

  // D. Lighting Preferences
  naturalLightImportance: number;  // slider 0-100
  artificialLightingStyle: string; // dropdown
  lightTemperature: 'warm' | 'neutral' | 'cool';

  // E. Lifestyle & Usage
  householdType: 'family' | 'couple' | 'bachelor' | 'shared';
  hasKids: boolean;
  hasElders: boolean;
  hasPets: boolean;
  workFromHome: boolean;
  entertainmentFocus: 'low' | 'medium' | 'high';

  // F. Budget & Practical Constraints
  budgetRange: string;             // dropdown
  executionPriority: 'design' | 'cost' | 'speed';
  maintenanceTolerance: 'low' | 'medium' | 'high';

  // G. AI Assist Inputs (Optional)
  referenceImageUrls?: string[];
  pinterestLinks?: string[];
  instagramLinks?: string[];
}

// Intent model
export interface Intent {
  id: string;
  scope: IntentScope;
  roomId?: string;                 // Only for ROOM scope
  version: number;
  status: IntentStatus;
  payload: Partial<IntentPayload>;
  createdAt: string;
  lockedAt?: string;
}

// Room generation state
export interface RoomGenerationState {
  roomId: string;
  roomName: string;
  intentId?: string;
  generationStatus: GenerationStatus;
  jobId?: string;
  progress?: number;
  moodboardId?: string;
  moodboardUrl?: string;
  moodboardVersion?: number;
  error?: string;
}

// Main state
export interface IntentState {
  // Current flow state
  projectId: string | null;
  intentMode: IntentMode | null;
  showModeSelector: boolean;
  
  // Global intent (for single-theme flow)
  globalIntent: Intent | null;
  
  // Room-wise intents (for room-wise flow)
  roomIntents: Record<string, Intent>;
  
  // Selected rooms for room-wise flow
  selectedRoomIds: string[];
  
  // Current room being edited (for sequential flow)
  currentRoomIndex: number;
  
  // Generation states per room
  roomGenerationStates: Record<string, RoomGenerationState>;
  
  // UI state
  isSubmitting: boolean;
  error: string | null;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: IntentState = {
  projectId: null,
  intentMode: null,
  showModeSelector: false,
  globalIntent: null,
  roomIntents: {},
  selectedRoomIds: [],
  currentRoomIndex: 0,
  roomGenerationStates: {},
  isSubmitting: false,
  error: null,
};

// ============================================
// SLICE
// ============================================

const intentSlice = createSlice({
  name: 'intent',
  initialState,
  reducers: {
    // Initialize intent flow for a project
    initializeIntentFlow: (
      state,
      action: PayloadAction<{
        projectId: string;
        rooms: Array<{ id: string; name: string }>;
      }>
    ) => {
      state.projectId = action.payload.projectId;
      state.showModeSelector = true;
      state.intentMode = null;
      state.globalIntent = null;
      state.roomIntents = {};
      state.selectedRoomIds = [];
      state.currentRoomIndex = 0;
      state.error = null;
      
      // Initialize generation states for all rooms
      state.roomGenerationStates = {};
      action.payload.rooms.forEach((room) => {
        state.roomGenerationStates[room.id] = {
          roomId: room.id,
          roomName: room.name,
          generationStatus: 'IDLE',
        };
      });
    },

    // Close mode selector
    closeModeSelector: (state) => {
      state.showModeSelector = false;
    },

    // Set intent mode
    setIntentMode: (state, action: PayloadAction<IntentMode>) => {
      state.intentMode = action.payload;
      state.showModeSelector = false;
      
      if (action.payload === 'GLOBAL') {
        // Create draft global intent
        state.globalIntent = {
          id: `intent-global-${Date.now()}`,
          scope: 'GLOBAL',
          version: 1,
          status: 'DRAFT',
          payload: {},
          createdAt: new Date().toISOString(),
        };
      }
    },

    // Update global intent payload
    updateGlobalIntent: (state, action: PayloadAction<Partial<IntentPayload>>) => {
      if (state.globalIntent && state.globalIntent.status === 'DRAFT') {
        state.globalIntent.payload = {
          ...state.globalIntent.payload,
          ...action.payload,
        };
      }
    },

    // Lock global intent (prevent edits)
    lockGlobalIntent: (state) => {
      if (state.globalIntent) {
        state.globalIntent.status = 'LOCKED';
        state.globalIntent.lockedAt = new Date().toISOString();
      }
    },

    // Set selected rooms for room-wise flow
    setSelectedRooms: (state, action: PayloadAction<string[]>) => {
      state.selectedRoomIds = action.payload;
      state.currentRoomIndex = 0;
      
      // Create draft intents for selected rooms
      action.payload.forEach((roomId) => {
        if (!state.roomIntents[roomId]) {
          const roomState = state.roomGenerationStates[roomId];
          state.roomIntents[roomId] = {
            id: `intent-room-${roomId}-${Date.now()}`,
            scope: 'ROOM',
            roomId,
            version: 1,
            status: 'DRAFT',
            payload: {},
            createdAt: new Date().toISOString(),
          };
        }
      });
    },

    // Update room intent payload
    updateRoomIntent: (
      state,
      action: PayloadAction<{ roomId: string; payload: Partial<IntentPayload> }>
    ) => {
      const { roomId, payload } = action.payload;
      const intent = state.roomIntents[roomId];
      
      if (intent && intent.status === 'DRAFT') {
        intent.payload = { ...intent.payload, ...payload };
      }
    },

    // Lock room intent
    lockRoomIntent: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      const intent = state.roomIntents[roomId];
      
      if (intent) {
        intent.status = 'LOCKED';
        intent.lockedAt = new Date().toISOString();
      }
    },

    // Advance to next room in sequence
    advanceToNextRoom: (state) => {
      if (state.currentRoomIndex < state.selectedRoomIds.length - 1) {
        state.currentRoomIndex += 1;
      }
    },

    // Go to specific room
    goToRoom: (state, action: PayloadAction<number>) => {
      if (action.payload >= 0 && action.payload < state.selectedRoomIds.length) {
        state.currentRoomIndex = action.payload;
      }
    },

    // Update room generation status
    updateRoomGenerationStatus: (
      state,
      action: PayloadAction<{
        roomId: string;
        status: GenerationStatus;
        jobId?: string;
        progress?: number;
        moodboardId?: string;
        moodboardUrl?: string;
        moodboardVersion?: number;
        error?: string;
      }>
    ) => {
      const { roomId, ...updates } = action.payload;
      const roomState = state.roomGenerationStates[roomId];
      
      if (roomState) {
        Object.assign(roomState, updates);
        roomState.generationStatus = updates.status;
      }
    },

    // Start generation for a room
    startRoomGeneration: (
      state,
      action: PayloadAction<{ roomId: string; jobId: string }>
    ) => {
      const { roomId, jobId } = action.payload;
      const roomState = state.roomGenerationStates[roomId];
      
      if (roomState) {
        roomState.generationStatus = 'QUEUED';
        roomState.jobId = jobId;
        roomState.progress = 0;
        roomState.error = undefined;
      }
    },

    // Mark room generation complete
    completeRoomGeneration: (
      state,
      action: PayloadAction<{
        roomId: string;
        moodboardId: string;
        moodboardUrl: string;
        moodboardVersion: number;
      }>
    ) => {
      const { roomId, moodboardId, moodboardUrl, moodboardVersion } = action.payload;
      const roomState = state.roomGenerationStates[roomId];
      
      if (roomState) {
        roomState.generationStatus = 'GENERATED';
        roomState.moodboardId = moodboardId;
        roomState.moodboardUrl = moodboardUrl;
        roomState.moodboardVersion = moodboardVersion;
        roomState.progress = 100;
      }
    },

    // Mark room generation failed
    failRoomGeneration: (
      state,
      action: PayloadAction<{ roomId: string; error: string }>
    ) => {
      const { roomId, error } = action.payload;
      const roomState = state.roomGenerationStates[roomId];
      
      if (roomState) {
        roomState.generationStatus = 'FAILED';
        roomState.error = error;
      }
    },

    // Prepare for regeneration
    prepareRegeneration: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      const intent = state.roomIntents[roomId] || state.globalIntent;
      const roomState = state.roomGenerationStates[roomId];
      
      if (roomState) {
        roomState.generationStatus = 'IDLE';
        roomState.error = undefined;
        roomState.progress = undefined;
        roomState.jobId = undefined;
      }
      
      // Unlock intent for editing if room-wise
      if (state.roomIntents[roomId]) {
        state.roomIntents[roomId].status = 'DRAFT';
        state.roomIntents[roomId].version += 1;
        state.roomIntents[roomId].lockedAt = undefined;
      }
    },

    // Set submitting state
    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Reset intent state
    resetIntentState: () => initialState,

    // Load existing intent data from backend
    loadExistingIntentData: (
      state,
      action: PayloadAction<{
        intentMode: IntentMode;
        globalIntent?: Intent;
        roomIntents?: Record<string, Intent>;
        roomGenerationStates?: Record<string, RoomGenerationState>;
        selectedRoomIds?: string[];
      }>
    ) => {
      const { intentMode, globalIntent, roomIntents, roomGenerationStates, selectedRoomIds } = action.payload;
      
      state.intentMode = intentMode;
      state.showModeSelector = false;
      
      if (globalIntent) {
        state.globalIntent = globalIntent;
      }
      
      if (roomIntents) {
        state.roomIntents = roomIntents;
      }
      
      if (roomGenerationStates) {
        state.roomGenerationStates = {
          ...state.roomGenerationStates,
          ...roomGenerationStates,
        };
      }
      
      if (selectedRoomIds) {
        state.selectedRoomIds = selectedRoomIds;
      }
    },
  },
});

// ============================================
// EXPORTS
// ============================================

export const {
  initializeIntentFlow,
  closeModeSelector,
  setIntentMode,
  updateGlobalIntent,
  lockGlobalIntent,
  setSelectedRooms,
  updateRoomIntent,
  lockRoomIntent,
  advanceToNextRoom,
  goToRoom,
  updateRoomGenerationStatus,
  startRoomGeneration,
  completeRoomGeneration,
  failRoomGeneration,
  prepareRegeneration,
  setSubmitting,
  setError,
  resetIntentState,
  loadExistingIntentData,
} = intentSlice.actions;

export default intentSlice.reducer;

// ============================================
// SELECTORS
// ============================================

export const selectIntentMode = (state: { intent: IntentState }) => state.intent.intentMode;
export const selectShowModeSelector = (state: { intent: IntentState }) => state.intent.showModeSelector;
export const selectGlobalIntent = (state: { intent: IntentState }) => state.intent.globalIntent;
export const selectRoomIntents = (state: { intent: IntentState }) => state.intent.roomIntents;
export const selectSelectedRoomIds = (state: { intent: IntentState }) => state.intent.selectedRoomIds;
export const selectCurrentRoomIndex = (state: { intent: IntentState }) => state.intent.currentRoomIndex;
export const selectRoomGenerationStates = (state: { intent: IntentState }) => state.intent.roomGenerationStates;
export const selectIsSubmitting = (state: { intent: IntentState }) => state.intent.isSubmitting;
export const selectIntentError = (state: { intent: IntentState }) => state.intent.error;

export const selectCurrentRoom = (state: { intent: IntentState }) => {
  const { selectedRoomIds, currentRoomIndex, roomGenerationStates } = state.intent;
  const roomId = selectedRoomIds[currentRoomIndex];
  return roomId ? roomGenerationStates[roomId] : null;
};

export const selectCurrentRoomIntent = (state: { intent: IntentState }) => {
  const { selectedRoomIds, currentRoomIndex, roomIntents } = state.intent;
  const roomId = selectedRoomIds[currentRoomIndex];
  return roomId ? roomIntents[roomId] : null;
};

export const selectAllRoomsGenerated = (state: { intent: IntentState }) => {
  const { roomGenerationStates } = state.intent;
  const rooms = Object.values(roomGenerationStates);
  return rooms.length > 0 && rooms.every(r => r.generationStatus === 'GENERATED');
};

export const selectAnyRoomGenerating = (state: { intent: IntentState }) => {
  const { roomGenerationStates } = state.intent;
  return Object.values(roomGenerationStates).some(
    r => r.generationStatus === 'QUEUED' || r.generationStatus === 'GENERATING'
  );
};

