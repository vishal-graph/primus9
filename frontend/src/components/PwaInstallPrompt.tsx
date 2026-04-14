'use client';

import { useCallback, useEffect, useState } from 'react';
import { Snackbar, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'tatvaops_pwa_install_dismissed_at';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (raw) {
          const t = parseInt(raw, 10);
          if (!Number.isNaN(t) && Date.now() - t < DISMISS_MS) return;
        }
      } catch {
        /* ignore */
      }
      setOpen(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    setOpen(false);
  }, [deferred]);

  const handleClose = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  if (!deferred) return null;

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      message="Install TatvaOps Vision for a faster, app-like experience"
      action={
        <>
          <Button color="inherit" size="small" onClick={handleInstall}>
            Install
          </Button>
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      }
    />
  );
}
