/**
 * TatvaOps Vision - Providers
 *
 * Composition of all application providers:
 * - Redux Store Provider
 * - MUI Theme Provider
 * - React Query Provider
 * - Snackbar Provider
 * - PWA service worker, optional install prompt, optional web analytics
 */

'use client';

import { ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from '@/ui/feedback/SnackbarProvider';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { WebAnalytics } from '@/components/WebAnalytics';

import { store } from '@/store';
import { theme } from '@/ui/theme';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,      // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider>
            <ServiceWorkerRegister />
            <WebAnalytics />
            <PwaInstallPrompt />
            {children}
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
