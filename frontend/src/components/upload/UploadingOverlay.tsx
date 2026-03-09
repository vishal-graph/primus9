'use client';

import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

const HERO_GRADIENT = 'linear-gradient(135deg, #1a0f0a 0%, #0a0604 50%, #000000 100%)';

/**
 * Full-screen overlay shown as soon as the user clicks "Upload & Continue",
 * so they see immediate feedback instead of waiting 2–4s in the modal.
 */
export function UploadingOverlay() {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: HERO_GRADIENT,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(27px)',
          transform: 'scale(1.08)',
          opacity: 0.75,
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: '#000000',
          opacity: 0.45,
          zIndex: 1,
        }}
      />

      <Box
        component={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut', delay: 0.08 }}
        sx={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 520,
          background: '#1e1e1e',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '22px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 20px 60px rgba(0, 0, 0, 0.3)',
          p: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mx: 2,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'rgba(255, 255, 255, 0.10)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <CircularProgress size={44} sx={{ color: '#10B981' }} />
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            textAlign: 'center',
            mb: 1.5,
          }}
        >
          Uploading your floor plan…
        </Typography>

        <Typography
          sx={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 15,
            color: '#FFFFFF',
            opacity: 0.7,
            textAlign: 'center',
            maxWidth: 420,
          }}
        >
          We&apos;re uploading your file and preparing analysis. You&apos;ll see your room configuration shortly.
        </Typography>
      </Box>
    </Box>
  );
}
