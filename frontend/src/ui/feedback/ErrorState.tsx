/**
 * TatvaOps Vision - Error State Component
 * 
 * Standardized error display with:
 * - Error icon
 * - User-friendly message
 * - Retry action
 * - No raw error text
 */

import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        textAlign: 'center',
        border: 1,
        borderColor: 'error.light',
        borderRadius: 2,
        backgroundColor: 'error.50',
      }}
    >
      <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2, opacity: 0.8 }} />
      
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}
      >
        {message}
      </Typography>
      
      {onRetry && (
        <Button
          variant="contained"
          color="error"
          startIcon={<Refresh />}
          onClick={onRetry}
          sx={{ textTransform: 'none' }}
        >
          {retryLabel}
        </Button>
      )}
    </Paper>
  );
}

/**
 * Inline error alert (for forms)
 */
export function InlineError({ message }: { message: string }) {
  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      {message}
    </Alert>
  );
}

