'use client';

import { Box, Button, Typography, alpha } from '@mui/material';
import { loginWithGoogle } from '@/lib/auth-client';
import GoogleIcon from '@mui/icons-material/Google';

export default function SignInPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 400,
        margin: 'auto',
        textAlign: 'center',
        p: 4,
        borderRadius: 3,
        bgcolor: 'background.paper',
        boxShadow: `0 8px 32px ${alpha('#000', 0.08)}`,
      }}
    >
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
        Welcome back
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Sign in to continue to TatvaOps Vision
      </Typography>
      
      <Button 
        fullWidth
        variant="outlined" 
        startIcon={<GoogleIcon />}
        onClick={() => loginWithGoogle()}
        sx={{ 
          textTransform: 'none', 
          fontWeight: 600, 
          py: 1.5,
          color: 'text.primary',
          borderColor: 'divider',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'text.primary'
          }
        }}
      >
        Continue with Google
      </Button>
    </Box>
  );
}
