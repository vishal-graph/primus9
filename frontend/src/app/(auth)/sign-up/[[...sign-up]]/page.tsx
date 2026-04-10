'use client';

import { Box, Button, Typography, alpha } from '@mui/material';
import { loginWithGoogle } from '@/lib/auth-client';
import GoogleIcon from '@mui/icons-material/Google';

export default function SignUpPage() {
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
        Create an account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Join TatvaOps Vision to get started
      </Typography>
      
      <Button 
        fullWidth
        variant="contained" 
        startIcon={<GoogleIcon />}
        onClick={() => loginWithGoogle()}
        sx={{ 
          textTransform: 'none', 
          fontWeight: 600, 
          py: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            bgcolor: 'primary.dark',
          }
        }}
      >
        Sign up with Google
      </Button>
    </Box>
  );
}
