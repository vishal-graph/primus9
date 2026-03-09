/**
 * TatvaOps Vision - Project Slice
 * 
 * Manages:
 * - Current project state
 * - Room list
 * - Stage progression
 * - Project metadata
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ProjectStage } from '@/types/project';
import type { Room } from '@/types/room';

export interface Project {
  id: string;
  userId: string;
  name: string;
  currentStage: ProjectStage;
  floorPlanUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectState {
  current: Project | null;
  rooms: Room[];
  selectedRoomId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  current: null,
  rooms: [],
  selectedRoomId: null,
  isLoading: false,
  error: null,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    // Set current project
    setProject: (state, action: PayloadAction<Project>) => {
      state.current = action.payload;
      state.error = null;
    },
    
    // Clear project
    clearProject: (state) => {
      state.current = null;
      state.rooms = [];
      state.selectedRoomId = null;
      state.error = null;
    },
    
    // Update project stage
    setProjectStage: (state, action: PayloadAction<ProjectStage>) => {
      if (state.current) {
        state.current.currentStage = action.payload;
        state.current.updatedAt = new Date();
      }
    },
    
    // Set rooms
    setRooms: (state, action: PayloadAction<Room[]>) => {
      state.rooms = action.payload;
    },
    
    // Add room
    addRoom: (state, action: PayloadAction<Room>) => {
      state.rooms.push(action.payload);
    },
    
    // Update room
    updateRoom: (state, action: PayloadAction<{ id: string; updates: Partial<Room> }>) => {
      const index = state.rooms.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.rooms[index] = {
          ...state.rooms[index],
          ...action.payload.updates,
        };
      }
    },
    
    // Remove room
    removeRoom: (state, action: PayloadAction<string>) => {
      state.rooms = state.rooms.filter(r => r.id !== action.payload);
    },
    
    // Select room
    setSelectedRoom: (state, action: PayloadAction<string | null>) => {
      state.selectedRoomId = action.payload;
    },
    
    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const {
  setProject,
  clearProject,
  setProjectStage,
  setRooms,
  addRoom,
  updateRoom,
  removeRoom,
  setSelectedRoom,
  setLoading,
  setError,
} = projectSlice.actions;

export default projectSlice.reducer;

// Selectors
export const selectCurrentProject = (state: { project: ProjectState }) => state.project.current;
export const selectRooms = (state: { project: ProjectState }) => state.project.rooms;
export const selectSelectedRoom = (state: { project: ProjectState }) => {
  const roomId = state.project.selectedRoomId;
  return roomId ? state.project.rooms.find(r => r.id === roomId) : null;
};
export const selectProjectLoading = (state: { project: ProjectState }) => state.project.isLoading;
export const selectProjectError = (state: { project: ProjectState }) => state.project.error;

