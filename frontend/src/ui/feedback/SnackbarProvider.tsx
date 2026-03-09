/**
 * TatvaOps Vision - Snackbar Provider
 * 
 * Global snackbar/toast notification system using MUI Snackbar
 * Connected to Redux for global notification state
 */

'use client';

import { ReactNode, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useAppSelector, useAppDispatch } from '@/store';
import { selectSnackbars, hideSnackbar } from '@/store/uiSlice';

interface SnackbarProviderProps {
  children: ReactNode;
}

export function SnackbarProvider({ children }: SnackbarProviderProps) {
  const snackbars = useAppSelector(selectSnackbars);
  const dispatch = useAppDispatch();
  
  // Auto-hide snackbars after duration
  useEffect(() => {
    snackbars.forEach(snackbar => {
      if (snackbar.duration) {
        const timer = setTimeout(() => {
          dispatch(hideSnackbar(snackbar.id));
        }, snackbar.duration);
        
        return () => clearTimeout(timer);
      }
    });
  }, [snackbars, dispatch]);
  
  // Only show the most recent snackbar
  const currentSnackbar = snackbars[snackbars.length - 1];
  
  return (
    <>
      {children}
      
      <Snackbar
        open={!!currentSnackbar}
        autoHideDuration={currentSnackbar?.duration || 6000}
        onClose={() => currentSnackbar && dispatch(hideSnackbar(currentSnackbar.id))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {currentSnackbar && (
          <Alert
            onClose={() => dispatch(hideSnackbar(currentSnackbar.id))}
            severity={currentSnackbar.severity}
            variant="filled"
            elevation={6}
            sx={{ minWidth: '300px' }}
          >
            {currentSnackbar.message}
          </Alert>
        )}
      </Snackbar>
    </>
  );
}

