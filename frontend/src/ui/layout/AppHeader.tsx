/**
 * TatvaOps Vision - App Header
 * 
 * Top navigation bar with:
 * - Menu toggle (mobile)
 * - Project switcher
 * - AI job status indicator
 * - User menu
 * 
 * Design: Minimal, clean, Apple-like
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Settings,
  Logout,
  Add,
  FolderOpen,
  Receipt,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useAppSelector } from '@/store';
import { selectCurrentProject } from '@/store/projectSlice';
import { selectActiveJobs } from '@/store/aiJobSlice';
import { AIJobStatusIndicator } from '@/ui/feedback/AIJobStatusIndicator';

interface AppHeaderProps {
  onMenuClick: () => void;
  height: number;
  showMenuButton?: boolean;
}

export function AppHeader({ onMenuClick, height, showMenuButton = false }: AppHeaderProps) {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const currentProject = useAppSelector(selectCurrentProject);
  const activeJobs = useAppSelector(selectActiveJobs);

  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleProjectMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProjectMenuAnchor(event.currentTarget);
  };

  const handleProjectMenuClose = () => {
    setProjectMenuAnchor(null);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        height,
        zIndex: 1300,
        color: 'text.primary',
        borderBottom: '1px solid rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(28,28,32,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.06)',
      }}
    >
      <Toolbar sx={{ height, minHeight: `${height}px !important`, px: { xs: 2, sm: 3 } }}>
        {/* Menu toggle (mobile on project pages) */}
        {showMenuButton && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Logo */}
        <Link href="/entry" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              mr: 2,
            }}
          >
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

        {/* Project Switcher / Spacer */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          {currentProject && (
            <>
              <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center' }} />
              <Box
                onClick={handleProjectMenuOpen}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <FolderOpen sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.875rem' }}>
                  {currentProject.name}
                </Typography>
                <Chip
                  label={currentProject.currentStage.replace('_', ' ')}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                />
              </Box>
            </>
          )}

          {/* Project Menu */}
          <Menu
            anchorEl={projectMenuAnchor}
            open={Boolean(projectMenuAnchor)}
            onClose={handleProjectMenuClose}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => { router.push('/dashboard'); handleProjectMenuClose(); }}>
              <ListItemIcon>
                <FolderOpen fontSize="small" />
              </ListItemIcon>
              <ListItemText>All Projects</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { router.push('/entry'); handleProjectMenuClose(); }}>
              <ListItemIcon>
                <Add fontSize="small" />
              </ListItemIcon>
              <ListItemText>New Project</ListItemText>
            </MenuItem>
          </Menu>
        </Box>

        {/* AI Job Status Indicator */}
        {activeJobs.length > 0 && (
          <AIJobStatusIndicator jobs={activeJobs} />
        )}

        {/* User Menu */}
        <Box sx={{ ml: 2 }}>
          <IconButton
            onClick={handleUserMenuOpen}
            size="small"
            aria-label="account"
            aria-controls="user-menu"
            aria-haspopup="true"
          >
            {user?.imageUrl ? (
              <Avatar
                src={user.imageUrl}
                alt={user.fullName || 'User'}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <AccountCircle sx={{ fontSize: 32 }} />
            )}
          </IconButton>

          <Menu
            id="user-menu"
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{ mt: 1 }}
          >
            {/* User info */}
            <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
              <Typography variant="body2" fontWeight={600}>
                {user?.fullName || 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.primaryEmailAddress?.emailAddress}
              </Typography>
            </Box>

            <Divider />

            <MenuItem onClick={() => { router.push('/dashboard'); handleUserMenuClose(); }}>
              <ListItemIcon>
                <FolderOpen fontSize="small" />
              </ListItemIcon>
              <ListItemText>Dashboard</ListItemText>
            </MenuItem>

            <MenuItem onClick={() => { router.push('/profile'); handleUserMenuClose(); }}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>

            <MenuItem onClick={() => { router.push('/pricing'); handleUserMenuClose(); }}>
              <ListItemIcon>
                <Receipt fontSize="small" />
              </ListItemIcon>
              <ListItemText>Pricing</ListItemText>
            </MenuItem>

            <MenuItem onClick={() => { router.push('/billing'); handleUserMenuClose(); }}>
              <ListItemIcon>
                <Receipt fontSize="small" />
              </ListItemIcon>
              <ListItemText>Billing & Invoices</ListItemText>
            </MenuItem>

            {/* Admin Dashboard - Only for @tatvaops.com users */}
            {user?.primaryEmailAddress?.emailAddress?.endsWith('@tatvaops.com') && (
              <>
                <Divider />
                <MenuItem 
                  onClick={() => { router.push('/krsna'); handleUserMenuClose(); }}
                  sx={{
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText',
                    },
                  }}
                >
                  <ListItemIcon>
                    <AdminPanelSettings fontSize="small" sx={{ color: 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText>
                    <Typography fontWeight={600}>Krsna</Typography>
                  </ListItemText>
                </MenuItem>
              </>
            )}

            <Divider />

            <MenuItem onClick={handleSignOut}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sign Out</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

