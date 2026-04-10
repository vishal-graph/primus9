'use client';

import { useEffect, useRef } from 'react';
import {
  refreshAuthToken,
  getAccessToken,
  getMsUntilProactiveRefresh,
  getAccessTokenExpiryMs,
} from '@/lib/auth-client';

/**
 * Keeps the session alive by refreshing the access token before it expires.
 * Schedules from JWT `exp` so 15m access tokens work (old fixed 50m interval did not).
 * Also refreshes when the tab becomes visible if the token is about to expire.
 */
export function AuthRefresh() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canceledRef = useRef(false);

  useEffect(() => {
    canceledRef.current = false;
    if (!getAccessToken()) return;

    const clearTimer = () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const scheduleNext = () => {
      if (canceledRef.current) return;
      clearTimer();
      const delay = getMsUntilProactiveRefresh(90);
      timeoutRef.current = setTimeout(async () => {
        if (canceledRef.current) return;
        await refreshAuthToken();
        scheduleNext();
      }, delay);
    };

    void refreshAuthToken().finally(() => {
      if (!canceledRef.current) scheduleNext();
    });

    const onVisibility = () => {
      if (document.visibilityState !== 'visible' || canceledRef.current) return;
      const exp = getAccessTokenExpiryMs();
      if (exp != null && exp - Date.now() < 120_000) {
        void refreshAuthToken().finally(() => scheduleNext());
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      canceledRef.current = true;
      clearTimer();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
