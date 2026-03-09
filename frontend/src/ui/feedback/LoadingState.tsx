/**
 * TatvaOps Vision - Loading States
 * 
 * Standardized loading skeletons for:
 * - Cards
 * - Tables
 * - Images
 * - Full page
 */

import { Box, Skeleton, Card, CardContent, Grid } from '@mui/material';

export function CardSkeleton() {
  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <Skeleton variant="rectangular" height={160} />
      <CardContent>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={80} height={24} />
        </Box>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 2, py: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="20%" />
          <Skeleton variant="text" width="15%" />
          <Skeleton variant="text" width="20%" />
        </Box>
      ))}
    </Box>
  );
}

export function ImageSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Skeleton
      variant="rectangular"
      height={height}
      sx={{
        borderRadius: 2,
        className: 'skeleton-shimmer',
      }}
    />
  );
}

export function PageLoadingSkeleton() {
  return (
    <Box sx={{ p: 4 }}>
      <Skeleton variant="text" width="40%" height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="60%" sx={{ mb: 4 }} />
      
      <Grid container spacing={3}>
        {[1, 2, 3].map(i => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <CardSkeleton />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

