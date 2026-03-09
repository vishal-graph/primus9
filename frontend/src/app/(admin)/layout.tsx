/**
 * Admin Layout
 * 
 * Minimal, clean layout for internal admin dashboard
 * No customer-facing UI elements
 * AWS Console / Stripe Admin style
 */

import { ReactNode } from 'react';
import { Box, Container } from '@mui/material';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Admin Header */}
      <Box
        component="header"
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 2,
          px: 3,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: 'text.primary',
                  fontFamily: 'monospace',
                }}
              >
                TatvaOps Vision
              </Box>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  bgcolor: '#FFA726',
                  color: 'white',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Admin
              </Box>
            </Box>
            
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              Internal Observability Dashboard
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 3,
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          px: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'white',
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: 'text.secondary',
            }}
          >
            <Box>
              © {new Date().getFullYear()} TatvaOps. Internal use only.
            </Box>
            <Box>
              Read-only observability • No mutations allowed
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

