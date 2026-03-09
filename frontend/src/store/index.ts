/**
 * TatvaOps Vision - Redux Store
 * 
 * Global application state management using Redux Toolkit
 * 
 * Slices:
 * - projectSlice: Project and room state
 * - aiJobSlice: AI job status and progress
 * - uiSlice: UI preferences and settings
 */

import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import projectReducer from './projectSlice';
import aiJobReducer from './aiJobSlice';
import uiReducer from './uiSlice';
import intentReducer from './slices/intentSlice';
import senseReducer from './slices/senseSlice';

export const store = configureStore({
  reducer: {
    project: projectReducer,
    aiJobs: aiJobReducer,
    ui: uiReducer,
    intent: intentReducer,
    sense: senseReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for date objects
        ignoredActions: ['project/setProject', 'aiJobs/addJob', 'aiJobs/updateJob'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.createdAt', 'payload.updatedAt', 'payload.completedAt'],
        // Ignore these paths in the state
        ignoredPaths: ['project.current.createdAt', 'project.current.updatedAt'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Infer types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for use throughout the app
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

