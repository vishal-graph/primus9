import Link from 'next/link';
import { Box, Button, Typography } from '@mui/material';

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        bgcolor: '#0a0a0f',
        color: '#fafafa',
      }}
    >
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        Page not found
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 420, textAlign: 'center' }}>
        The link may be broken or the page was removed. Try the home page or go back.
      </Typography>
      <Button component={Link} href="/" variant="contained" color="primary" size="large">
        Go home
      </Button>
    </Box>
  );
}
