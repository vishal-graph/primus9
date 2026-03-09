'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Box, Typography, Button, LinearProgress, Alert } from '@mui/material';
import { CheckCircle, Home } from '@mui/icons-material';
import { getJobStatus } from '@/lib/actions/floor-plan';

const HERO_GRADIENT = 'linear-gradient(135deg, #1a0f0a 0%, #0a0604 50%, #000000 100%)';

export default function UploadSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') ?? '';
  const jobId = searchParams.get('jobId') ?? '';

  const [status, setStatus] = useState<string>('PROCESSING');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !projectId) {
      setError('Missing project or job. Return to home and try again.');
      return;
    }

    const interval = setInterval(async () => {
      const result = await getJobStatus(jobId);
      setStatus(result.status);
      setProgress(result.progress ?? 0);
      if (result.status === 'COMPLETED') {
        clearInterval(interval);
        router.push(`/project/${projectId}?stage=floor_plan`);
      }
      if (result.status === 'FAILED') {
        clearInterval(interval);
        setError(result.error ?? 'Analysis failed.');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, projectId, router]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        overflow: 'auto',
        pointerEvents: 'none',
        '& > *:last-child': { pointerEvents: 'auto' },
      }}
    >
      {/* Blurred background */}
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

      {/* Card container */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          p: 2,
        }}
      >
        <Box
          component={motion.div}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: 0.08 }}
          sx={{
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
          }}
        >
          <Box
            component={motion.div}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.2 }}
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.10)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <CheckCircle sx={{ fontSize: 44, color: '#10B981' }} />
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              mb: 1.5,
            }}
          >
            Upload Successful!
          </Typography>

          <Typography
            sx={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 15,
              color: '#FFFFFF',
              opacity: 0.7,
              textAlign: 'center',
              maxWidth: 420,
              mb: 3,
            }}
          >
            Your floor plan has been uploaded successfully. We&apos;re processing your design and will have your room configuration ready shortly.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ width: '100%', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#FFFFFF', opacity: 0.85 }}>
                Processing Status
              </Typography>
              <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#10B981', opacity: 0.9 }}>
                {status === 'COMPLETED' ? 'Complete' : status === 'FAILED' ? 'Failed' : 'In Progress'}
              </Typography>
            </Box>
            <Box
              sx={{
                width: '100%',
                height: 6,
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <LinearProgress
                variant={status === 'QUEUED' || status === 'PROCESSING' ? 'indeterminate' : 'determinate'}
                value={status === 'COMPLETED' ? 100 : progress}
                sx={{
                  height: '100%',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
                  },
                }}
              />
            </Box>
          </Box>

          <Box sx={{ width: '100%', mb: 3 }}>
            <Typography
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                color: '#FFFFFF',
                opacity: 0.7,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                mb: 2,
              }}
            >
              What&apos;s Next?
            </Typography>
            {[
              'AI analyzes your floor plan layout',
              'Room types and dimensions are identified',
              'Design recommendations are generated',
            ].map((text, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#FFFFFF', opacity: 0.7 }}>
                    {i + 1}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#FFFFFF', opacity: 0.75, lineHeight: 1.5 }}>
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
            <Button
              fullWidth
              startIcon={<Home />}
              onClick={() => router.push('/entry')}
              sx={{
                textTransform: 'none',
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.14)' },
              }}
            >
              Return Home
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => projectId && router.push(`/project/${projectId}?stage=floor_plan`)}
              disabled={!projectId}
              sx={{
                textTransform: 'none',
                bgcolor: 'rgba(255, 255, 255, 0.14)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.18)' },
              }}
            >
              View Results
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
