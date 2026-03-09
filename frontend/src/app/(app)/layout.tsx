/**
 * TatvaOps Vision - App Layout (Protected Routes)
 * 
 * Wrapper for authenticated app routes
 * Applies the main AppLayout with sidebar and header
 * Includes onboarding guard to redirect un-onboarded users
 */

import { ReactNode } from 'react';
import { AppLayout } from '@/ui/layout';
import { OnboardingGuard } from '@/components/OnboardingGuard';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGuard>
      <AppLayout>{children}</AppLayout>
    </OnboardingGuard>
  );
}
