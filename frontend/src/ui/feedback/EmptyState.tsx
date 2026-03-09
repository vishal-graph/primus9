/**
 * TatvaOps Vision - Empty State Component
 * 
 * Standardized empty states with:
 * - Icon
 * - Title
 * - Description
 * - Optional action button
 */

import { Box, Typography, Button, Paper } from '@mui/material';

interface EmptyStateProps {
  icon: React.ReactElement;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        textAlign: 'center',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          p: 2,
          borderRadius: 2,
          backgroundColor: 'background.elevated',
          mb: 2,
        }}
      >
        {icon}
      </Box>
      
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}
      >
        {description}
      </Typography>
      
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{ textTransform: 'none' }}
        >
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
}

