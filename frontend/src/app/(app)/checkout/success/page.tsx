'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Box, Container, Typography, Button } from '@mui/material';
import { CheckCircle, SpaceDashboard, Download, AutoAwesome, Diamond } from '@mui/icons-material';

const glassCardSx = {
  background: 'rgba(24, 24, 27, 0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '1rem',
  p: 3,
};

const confettiColors = [
  '#a855f7',
  '#3b82f6',
  '#10b981',
  '#ec4899',
  '#f59e0b',
  '#6366f1',
  '#ef4444',
  '#14b8a6',
  '#8b5cf6',
  '#d946ef',
];

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function SuccessFallback() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f0f12' }}>
      <Typography sx={{ color: '#9ca3af' }}>Loading…</Typography>
    </Box>
  );
}

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();

  const planName = searchParams.get('planName') || searchParams.get('plan') || 'Plan';
  const amountPaise = searchParams.get('amount');
  const subscriptionId = searchParams.get('subscriptionId');

  const amountFormatted = useMemo(() => {
    if (!amountPaise) return '—';
    const paise = parseInt(amountPaise, 10);
    if (Number.isNaN(paise)) return '—';
    return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }, [amountPaise]);

  const orderIdShort = useMemo(() => {
    if (!subscriptionId) return '#——';
    return `#${subscriptionId.slice(0, 8).toUpperCase()}`;
  }, [subscriptionId]);

  const dateFormatted = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const handleDownloadInvoice = async () => {
    if (!subscriptionId) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/billing/invoices/${subscriptionId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${subscriptionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box
      sx={{
        bgcolor: '#0f0f12',
        color: '#fafafa',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
      }}
    >
      {/* Background orbs – same as pricing/checkout + green */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '60%',
            background: 'rgba(88, 28, 135, 0.2)',
            borderRadius: '50%',
            filter: 'blur(120px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-10%',
            right: '-10%',
            width: '40%',
            height: '40%',
            background: 'rgba(30, 58, 138, 0.1)',
            borderRadius: '50%',
            filter: 'blur(100px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '20%',
            height: '20%',
            background: 'rgba(22, 163, 74, 0.1)',
            borderRadius: '50%',
            filter: 'blur(80px)',
          }}
        />
      </Box>

      {/* Confetti */}
      {confettiColors.map((bg, i) => (
        <Box
          key={i}
          sx={{
            position: 'fixed',
            left: `${7 + i * 9}%`,
            top: 0,
            width: 8,
            height: 16,
            bgcolor: bg,
            opacity: 0,
            zIndex: 1,
            animation: 'makeItRain 4s ease-out forwards',
            animationDelay: `${i * 0.3}s`,
            transform: `rotate(${-40 + i * 12}deg)`,
            '@keyframes makeItRain': {
              '0%': { opacity: 0 },
              '30%': { opacity: 1 },
              '100%': {
                opacity: 0,
                transform: `translateY(100vh) rotate(${-40 + i * 12 + 360}deg)`,
              },
            },
          }}
        />
      ))}

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 2 }}>
        <Box
          sx={{
            textAlign: 'center',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-10px)' },
            },
            animation: 'float 6s ease-in-out infinite',
          }}
        >
          {/* Success icon */}
          <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(34, 197, 94, 0.2)',
                borderRadius: '50%',
                filter: 'blur(24px)',
                animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                '@keyframes pulse': { '0%, 100%': { opacity: 0.6 }, '50%': { opacity: 1 } },
              }}
            />
            <Box
              sx={{
                position: 'relative',
                bgcolor: '#18181b',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '50%',
                p: 3,
                filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.4))',
              }}
            >
              <CheckCircle sx={{ fontSize: '4rem', color: '#22c55e' }} />
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.02em',
                mb: 1,
              }}
            >
              Payment Successful!
            </Typography>
            <Typography sx={{ fontSize: '1.125rem', color: 'rgba(216, 180, 254, 0.8)', fontWeight: 500 }}>
              Your {planName} Plan is now active
            </Typography>
          </Box>

          {/* Order details card */}
          <Box sx={{ ...glassCardSx, borderRadius: '1rem', overflow: 'hidden', mb: 4 }}>
            <Box
              sx={{
                bgcolor: 'rgba(24, 24, 27, 0.4)',
                backdropFilter: 'blur(8px)',
                borderRadius: '0.75rem',
                p: { xs: 2, sm: 3 },
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                  pb: 2,
                  mb: 2,
                  borderBottom: '1px solid rgba(63, 63, 70, 0.5)',
                }}
              >
                <Box sx={{ textAlign: 'left' }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#9ca3af', mb: 0.5 }}>Order ID</Typography>
                  <Typography sx={{ fontFamily: 'monospace', color: '#fff', letterSpacing: 1 }}>
                    {orderIdShort}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#9ca3af', mb: 0.5 }}>Date</Typography>
                  <Typography sx={{ color: '#fff' }}>{dateFormatted}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Diamond sx={{ fontSize: '1.5rem', color: '#a855f7' }} />
                  </Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ fontWeight: 600, color: '#fff' }}>{planName} Plan</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>One-time payment</Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{amountFormatted}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Buttons */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <Button
              fullWidth
              onClick={() => router.push('/entry')}
              startIcon={<SpaceDashboard />}
              sx={{
                py: 1.5,
                px: 3,
                fontSize: '1.125rem',
                fontWeight: 700,
                borderRadius: '0.75rem',
                background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)',
                color: '#fff',
                boxShadow: '0 10px 15px -3px rgba(88, 28, 135, 0.4)',
                textTransform: 'none',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  background: 'linear-gradient(90deg, #7e22ce 0%, #a855f7 100%)',
                  boxShadow: '0 10px 25px -5px rgba(168, 85, 247, 0.5)',
                  transform: 'translateY(-2px)',
                },
                '& .btn-shine': {
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255,255,255,0.2)',
                  transform: 'translateY(100%)',
                  transition: 'transform 0.3s ease',
                },
                '&:hover .btn-shine': { transform: 'translateY(0)' },
              }}
            >
              <Box component="span" sx={{ position: 'relative', zIndex: 1 }}>
                Go to Dashboard
              </Box>
              <Box className="btn-shine" />
            </Button>
            <Button
              fullWidth
              onClick={handleDownloadInvoice}
              disabled={!subscriptionId}
              startIcon={<Download />}
              sx={{
                py: 1.5,
                px: 3,
                fontSize: '1.125rem',
                fontWeight: 500,
                ...glassCardSx,
                borderRadius: '0.75rem',
                color: '#fff',
                border: '1px solid #3f3f46',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderColor: '#52525b',
                },
                '& .MuiButton-startIcon': { color: '#9ca3af' },
                '&:hover .MuiButton-startIcon': { color: '#fff' },
              }}
            >
              Download Invoice
            </Button>
          </Box>

          {/* Footer line */}
          <Box
            sx={{
              pt: 4,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 96,
                height: 1,
                background: 'linear-gradient(90deg, transparent, #3f3f46, transparent)',
              },
            }}
          >
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <AutoAwesome sx={{ fontSize: '1rem', color: '#eab308' }} />
              Welcome to the future of interior design!
              <AutoAwesome sx={{ fontSize: '1rem', color: '#eab308' }} />
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
