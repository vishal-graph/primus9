/**
 * TatvaOps Vision - UI Slice
 * 
 * Manages:
 * - Sidebar state (open/closed)
 * - Snackbar notifications
 * - Modal states
 * - UI preferences
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SnackbarNotification {
  id: string;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface UIState {
  sidebarOpen: boolean;
  snackbars: SnackbarNotification[];
  activeModals: Record<string, boolean>;
  preferences: {
    compactView: boolean;
    showTips: boolean;
  };
}

const initialState: UIState = {
  sidebarOpen: true,
  snackbars: [],
  activeModals: {},
  preferences: {
    compactView: false,
    showTips: true,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Sidebar
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    
    // Snackbars
    showSnackbar: (state, action: PayloadAction<Omit<SnackbarNotification, 'id'>>) => {
      const notification: SnackbarNotification = {
        ...action.payload,
        id: `snackbar-${Date.now()}`,
        duration: action.payload.duration || 6000,
      };
      state.snackbars.push(notification);
    },
    
    hideSnackbar: (state, action: PayloadAction<string>) => {
      state.snackbars = state.snackbars.filter(s => s.id !== action.payload);
    },
    
    clearSnackbars: (state) => {
      state.snackbars = [];
    },
    
    // Modals
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModals[action.payload] = true;
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      state.activeModals[action.payload] = false;
    },
    
    // Preferences
    setCompactView: (state, action: PayloadAction<boolean>) => {
      state.preferences.compactView = action.payload;
    },
    
    setShowTips: (state, action: PayloadAction<boolean>) => {
      state.preferences.showTips = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  showSnackbar,
  hideSnackbar,
  clearSnackbars,
  openModal,
  closeModal,
  setCompactView,
  setShowTips,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectSidebarOpen = (state: { ui: UIState }) => state.ui.sidebarOpen;
export const selectSnackbars = (state: { ui: UIState }) => state.ui.snackbars;
export const selectModalOpen = (modalId: string) => (state: { ui: UIState }) =>
  state.ui.activeModals[modalId] || false;
export const selectPreferences = (state: { ui: UIState }) => state.ui.preferences;

