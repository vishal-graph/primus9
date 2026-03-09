/**
 * TatvaOps Vision - App Layout
 * 
 * Main application shell with:
 * - Sidebar only shown on project pages
 * - Top app header
 * - Content area centered
 * - Responsive behavior
 * 
 * Visual inspiration: Apple iCloud, Linear, Notion
 */

'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useAppSelector, useAppDispatch } from '@/store';
import { selectSidebarOpen, setSidebarOpen } from '@/store/uiSlice';
import { selectCurrentProject } from '@/store/projectSlice';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

const SIDEBAR_WIDTH = 260;
const HEADER_HEIGHT = 56;

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const currentProject = useAppSelector(selectCurrentProject);
  const dispatch = useAppDispatch();

  // Only show sidebar on project pages when a project is loaded
  const isProjectPage = pathname?.includes('/project/');
  const showSidebar = isProjectPage && currentProject && !isMobile;
  const showMobileSidebar = isProjectPage && currentProject && isMobile;

  const handleSidebarToggle = () => {
    dispatch(setSidebarOpen(!sidebarOpen));
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Sidebar - Only on project pages */}
      {(showSidebar || showMobileSidebar) && (
        <AppSidebar
          open={showSidebar ? true : sidebarOpen}
          onClose={handleSidebarToggle}
          variant={isMobile ? 'temporary' : 'persistent'}
          width={SIDEBAR_WIDTH}
        />
      )}

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          position: 'relative',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: showSidebar ? `calc(100% - ${SIDEBAR_WIDTH}px)` : '100%',
        }}
      >
        {/* Header */}
        <AppHeader 
          onMenuClick={handleSidebarToggle}
          height={HEADER_HEIGHT}
          showMenuButton={showMobileSidebar ?? false}
        />

        {/* Content — frosted glass layer; minHeight: 0 so child can scroll inside */}
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'rgba(18, 18, 21, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
