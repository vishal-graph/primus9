'use client';

import Link from 'next/link';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

export default function ProjectNotFound() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        gap: 3,
      }}
    >
      <ErrorOutline sx={{ fontSize: 64, color: 'text.secondary' }} />
      <Box>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Project Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The project you're looking for doesn't exist or you don't have access to it.
        </Typography>
      </Box>
      <Link href="/dashboard" passHref style={{ textDecoration: 'none' }}>
        <Button variant="contained" size="large">
          Return to Dashboard
        </Button>
      </Link>
    </Box>
  );
}

