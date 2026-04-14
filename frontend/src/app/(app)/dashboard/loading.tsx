import { Box, Grid, Skeleton } from '@mui/material';

export default function DashboardLoading() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Skeleton variant="text" width={280} height={40} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={48} sx={{ mb: 3, borderRadius: 1, maxWidth: 560 }} />
      <Grid container spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
