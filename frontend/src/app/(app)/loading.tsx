import { Box, Skeleton } from '@mui/material';

export default function AppShellLoading() {
  return (
    <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}>
      <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2 }} />
    </Box>
  );
}
