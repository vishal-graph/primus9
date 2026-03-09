/**
 * TatvaOps Vision - Frosted Nav Bar (shared)
 *
 * Same frosted glass navbar used everywhere: auth, landing, etc.
 * Matches AppHeader visual style: blur, semi-transparent, logo + right slot.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AppBar, Toolbar, Box } from '@mui/material';

const NAV_HEIGHT = 56;

const navBarSx = {
  height: NAV_HEIGHT,
  zIndex: 1300,
  color: 'text.primary',
  borderBottom: '1px solid rgba(255,255,255,0.14)',
  backgroundColor: 'rgba(28,28,32,0.92)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 1px 0 0 rgba(255,255,255,0.06)',
};

interface FrostedNavBarProps {
  /** Content for the right side (e.g. Sign In, Get Started, or UserButton) */
  rightContent?: React.ReactNode;
  /** Logo link href. Default "/" */
  logoHref?: string;
}

export function FrostedNavBar({ rightContent, logoHref = '/' }: FrostedNavBarProps) {
  return (
    <AppBar position="static" elevation={0} sx={navBarSx}>
      <Toolbar sx={{ height: NAV_HEIGHT, minHeight: `${NAV_HEIGHT}px !important`, px: { xs: 2, sm: 3 } }}>
        <Link href={logoHref} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mr: 2 }}>
            <Image
              src="/logo.png"
              alt="TatvaOps"
              width={140}
              height={36}
              priority
              style={{ objectFit: 'contain' }}
            />
          </Box>
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        {rightContent}
      </Toolbar>
    </AppBar>
  );
}
