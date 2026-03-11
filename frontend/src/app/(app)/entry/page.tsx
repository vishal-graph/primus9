/**
 * TatvaOps Vision - Entry (Happy Space Hero)
 *
 * Full-screen hero with "Happy Space" messaging and two action cards:
 * - Room Configuration (Coming Soon)
 * - Upload Floor Plan → opens UploadModal, then redirects to upload/success
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Box, Typography, Button } from '@mui/material';
import { GridView, CloudUpload, Dashboard as DashboardIcon } from '@mui/icons-material';
import { UploadModal, type PlanOption } from '@/components/upload/UploadModal';
import { UploadingOverlay } from '@/components/upload/UploadingOverlay';

// Interior hero background (public/interior-bg.jpeg)
const INTERIOR_BG = '/interior-bg.jpeg';
const HERO_GRADIENT = 'linear-gradient(135deg, #1a0f0a 0%, #0a0604 50%, #000000 100%)';

export default function EntryPage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showUploadingOverlay, setShowUploadingOverlay] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);

  useEffect(() => {
    const fetchUserAndPlans = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const [userRes, plansRes] = await Promise.all([
          fetch('/api/user/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const userData = await userRes.json();
        const plansData = await plansRes.json();
        if (userData.success) setIsInternal(userData.data?.isInternal ?? false);
        if (plansData.success && Array.isArray(plansData.data)) setPlans(plansData.data);
      } catch {
        // ignore
      }
    };
    fetchUserAndPlans();
  }, [getToken]);

  const handleUploadStarted = () => {
    setShowUploadingOverlay(true);
  };

  const handleUploadFailed = () => {
    setShowUploadingOverlay(false);
  };

  const handleUploadSuccess = (slug: string) => {
    setUploadModalOpen(false);
    setShowUploadingOverlay(false);
    router.push(`/project/${slug}/processing`);
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', overflowY: uploadModalOpen ? 'hidden' : 'auto' }}>
      {/* Interior image as full-screen background (fixed so it extends under the app header for frosted glass effect) */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${INTERIOR_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
          backgroundColor: '#0a0604',
        }}
      />
      {/* Light overlay so interior image shows through; keeps text readable */}
      <Box sx={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.5) 100%)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Top nav: Dashboard access — only when logged in */}
      {isSignedIn && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <Button
            component={Link}
            href="/dashboard"
            startIcon={<DashboardIcon />}
            sx={{
              color: '#F4F0E6',
              borderColor: 'rgba(255,255,255,0.3)',
              '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.08)' },
              textTransform: 'none',
              fontWeight: 600,
            }}
            variant="outlined"
          >
            Go to Dashboard
          </Button>
        </Box>
      )}

      <Box sx={{ position: 'relative', flex: 1, width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2, px: 2, py: 4 }}>
        <Box sx={{ maxWidth: 1200, width: '100%', textAlign: 'center' }}>
          <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: { xs: 14, md: 16 }, color: '#F4F0E6', opacity: 0.8, mb: 3 }}>
            Let Your Soul Find Its
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', gap: 1, mb: 3 }}>
            <Typography component="span" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: { xs: 48, sm: 72, md: 102 }, color: '#F4F0E6', lineHeight: 1 }}>Happy</Typography>
            <Box component="span" sx={{ position: 'relative' }}>
              <Typography component="span" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: { xs: 48, sm: 72, md: 102 }, color: '#F4F0E6', lineHeight: 1 }}>Space</Typography>
              <FocusCorners />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 5 }, justifyContent: 'center', mb: 4 }}>
            {[{ a: 'Creating', b: 'modern' }, { a: 'timeless interiors', b: 'that blend' }, { a: 'comfort, beauty,', b: 'and purpose' }].map((item, i) => (
              <Typography key={i} sx={{ fontFamily: 'Inter, sans-serif', fontSize: { xs: 16, md: 20 }, lineHeight: 1.3, color: '#F4F0E6', opacity: 0.75 }}>{item.a}<br />{item.b}</Typography>
            ))}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', mb: 4 }}>
            <ActionCard icon={<GridView sx={{ fontSize: 32 }} />} title="Room Configuration" description="Define room types, sizes, and layout preferences" comingSoon />
            <ActionCard icon={<CloudUpload sx={{ fontSize: 32 }} />} title="Upload Floor Plan" description="Upload your floor plan to get started" onClick={() => setUploadModalOpen(true)} />
          </Box>
          <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 14, letterSpacing: 2, color: '#F4F0E6', opacity: 0.7 }}>www.tatvaops.com</Typography>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, px: { xs: 2, md: 4 }, py: 2, bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', mt: 'auto' }}>
        <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#9ca3af' }}>© {new Date().getFullYear()} TatvaOps. All rights reserved.</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {isSignedIn && (
            <Typography component={Link} href="/dashboard" sx={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#F4F0E6', textDecoration: 'none', '&:hover': { color: '#fff' } }}>Dashboard</Typography>
          )}
          {['Privacy Policy', 'About Us', 'Terms & Conditions', 'Contact Us'].map((label) => (
            <Typography key={label} component="button" sx={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#9ca3af', bgcolor: 'transparent', border: 'none', cursor: 'pointer', '&:hover': { color: '#d1d5db' } }}>{label}</Typography>
          ))}
        </Box>
      </Box>

      <UploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onUploadStarted={handleUploadStarted} onUploadFailed={handleUploadFailed} onSuccess={handleUploadSuccess} isInternal={isInternal} plans={plans} />
      {showUploadingOverlay && <UploadingOverlay />}
    </Box>
  );
}

function FocusCorners() {
  const cornerSize = 18;
  const strokeWidth = 2;
  const offset = -16;
  return (
    <>
      {[{ pos: { top: offset, left: offset }, d: `M ${cornerSize} 0 L 0 0 L 0 ${cornerSize}` }, { pos: { top: offset, right: offset }, d: `M 0 0 L ${cornerSize} 0 L ${cornerSize} ${cornerSize}` }, { pos: { bottom: offset, left: offset }, d: `M 0 0 L 0 ${cornerSize} L ${cornerSize} ${cornerSize}` }, { pos: { bottom: offset, right: offset }, d: `M ${cornerSize} 0 L ${cornerSize} ${cornerSize} L 0 ${cornerSize}` }].map(({ pos, d }, i) => (
        <Box key={i} component={motion.svg} width={cornerSize} height={cornerSize} sx={{ position: 'absolute', ...pos }} animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.1, 1] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}>
          <path d={d} stroke="#F4F0E6" strokeWidth={strokeWidth} fill="none" />
        </Box>
      ))}
    </>
  );
}

function ActionCard({ icon, title, description, onClick, comingSoon }: { icon: React.ReactNode; title: string; description: string; onClick?: () => void; comingSoon?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Box
      component={motion.div}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={comingSoon ? undefined : onClick}
      sx={{
        width: { xs: 280, sm: 340 },
        minHeight: { xs: 260, sm: 300 },
        borderRadius: '16px',
        background: hovered && !comingSoon ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.06)',
        border: `1px solid ${hovered && !comingSoon ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.12)'}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        p: { xs: '32px 24px', sm: '40px 32px' },
        cursor: comingSoon ? 'default' : 'pointer',
        boxShadow: hovered && !comingSoon ? '0 8px 32px rgba(0, 0, 0, 0.18)' : '0 4px 16px rgba(0, 0, 0, 0.08)',
        opacity: comingSoon ? 0.7 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
      animate={{ scale: hovered && !comingSoon ? 1.02 : 1 }}
      transition={{ duration: 0.2 }}
      whileTap={comingSoon ? {} : { scale: 0.98 }}
    >
      <Box sx={{ color: '#FFFFFF', opacity: 0.8, mb: 1.5 }}>{icon}</Box>
      <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: { xs: 18, sm: 20 }, fontWeight: 600, color: '#FFFFFF', mb: 1 }}>{title}</Typography>
      <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: { xs: 13, sm: 14 }, color: '#FFFFFF', opacity: 0.6, mb: 2.5 }}>{description}</Typography>
      <Box sx={{ flex: 1 }} />
      {!comingSoon && <Box component="span" sx={{ display: 'inline-block', width: 140, height: 44, borderRadius: '12px', bgcolor: hovered ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 500, lineHeight: '44px' }}>Get Started</Box>}
      {comingSoon && <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#FFFFFF', opacity: 0.6 }}>Coming Soon</Typography>}
    </Box>
  );
}
