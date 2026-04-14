import { Box, Paper, Skeleton } from '@mui/material';

export default function ProjectStageLoading() {
  return (
    <Box sx={{ py: 3, px: 2, maxWidth: 'xl', mx: 'auto' }}>
      <Paper sx={{ p: 1, mb: 2, borderRadius: 2 }}>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
      </Paper>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 1 }} />
      </Paper>
    </Box>
  );
}
