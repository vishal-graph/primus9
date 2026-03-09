'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUserProfile } from '@/lib/actions/user';
import { CircularProgress, Box } from '@mui/material';

/**
 * OnboardingGuard Component
 * Redirects un-onboarded users to onboarding page
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      // Skip check for onboarding page itself
      if (pathname === '/onboarding') {
        setChecking(false);
        return;
      }

      const result = await getUserProfile();
      if (result?.success && result.data) {
        if (!result.data.onboarded) {
          router.push('/onboarding');
          return;
        }
      }
      setChecking(false);
    }

    checkOnboarding();
  }, [pathname, router]);

  if (checking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}

