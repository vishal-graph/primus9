/**
 * TatvaOps Vision - App Layout (Protected Routes)
 * 
 * Wrapper for authenticated app routes
 * Applies the main AppLayout with sidebar and header
 * Includes onboarding guard to redirect un-onboarded users
 * AuthRefresh keeps the session alive by refreshing the token before it expires
 */

import { ReactNode } from 'react';
import { AppLayout } from '@/ui/layout';
import { OnboardingGuard } from '@/components/OnboardingGuard';
import { AuthRefresh } from '@/components/AuthRefresh';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGuard>
      <AuthRefresh />
      <AppLayout>{children}</AppLayout>
    </OnboardingGuard>
  );
}
