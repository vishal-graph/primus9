/**
 * TatvaOps Vision - Auth Layout
 *
 * Same frosted navbar as app; centered auth form below.
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import { Box, Container, Typography, Paper, Button } from '@mui/material';
import { FrostedNavBar } from '@/ui/layout';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'background.default' }}>
      <FrostedNavBar logoHref="/" rightContent={<Button component={Link} href="/" sx={{ textTransform: 'none', fontWeight: 600 }}>Back to home</Button>} />

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <Container maxWidth="sm">
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 2 }}>
            AI-Powered Interior Design Platform
          </Typography>

          <Paper
          elevation={0}
          sx={{
            p: 4,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
          >
            {children}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}
