import { Box, LinearProgress } from '@mui/material';

export default function RootLoading() {
  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300, pointerEvents: 'none' }}>
      <LinearProgress color="primary" sx={{ height: 3 }} />
    </Box>
  );
}
