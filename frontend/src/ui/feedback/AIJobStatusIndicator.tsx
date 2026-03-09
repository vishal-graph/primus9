/**
 * TatvaOps Vision - AI Job Status Indicator
 * 
 * Displays active AI jobs in the header with:
 * - Progress indicator
 * - Job type
 * - Expandable details
 * 
 * Design: Subtle, non-intrusive, informative
 */

'use client';

import { useState } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  Typography,
  LinearProgress,
  Chip,
} from '@mui/material';
import { Notifications, CheckCircle, Error, HourglassEmpty } from '@mui/icons-material';
import type { AIJob } from '@/store/aiJobSlice';

interface AIJobStatusIndicatorProps {
  jobs: AIJob[];
}

export function AIJobStatusIndicator({ jobs }: AIJobStatusIndicatorProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getJobIcon = (status: AIJob['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />;
      case 'FAILED':
        return <Error sx={{ fontSize: 18, color: 'error.main' }} />;
      case 'PROCESSING':
        return <HourglassEmpty sx={{ fontSize: 18, color: 'primary.main' }} />;
      default:
        return <HourglassEmpty sx={{ fontSize: 18, color: 'text.secondary' }} />;
    }
  };

  const getJobLabel = (type: AIJob['type']): string => {
    const labels: Record<AIJob['type'], string> = {
      FLOORPLAN_ANALYSIS: 'Floor Plan Analysis',
      MOODBOARD: 'Moodboard Generation',
      ELEVATION: 'Elevation Render',
      INTERIOR: 'Interior View',
      COMPONENT_UPDATE: 'Component Update',
    };
    return labels[type];
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="ai-jobs"
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={jobs.length} color="primary">
          <Notifications />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ px: 2, py: 1.5, minWidth: 320, maxWidth: 400 }}>
          <Typography variant="body2" fontWeight={600}>
            Active AI Jobs ({jobs.length})
          </Typography>
        </Box>

        {jobs.map((job) => (
          <MenuItem key={job.id} sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getJobIcon(job.status)}
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {getJobLabel(job.type)}
              </Typography>
              <Chip
                label={job.status}
                size="small"
                color={
                  job.status === 'COMPLETED'
                    ? 'success'
                    : job.status === 'FAILED'
                    ? 'error'
                    : 'default'
                }
                sx={{ height: 20, fontSize: '0.6875rem' }}
              />
            </Box>

            {job.status === 'PROCESSING' && job.progress !== undefined && (
              <Box sx={{ width: '100%' }}>
                <LinearProgress
                  variant="determinate"
                  value={job.progress}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'action.hover',
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {job.progress}% complete
                </Typography>
              </Box>
            )}

            {job.status === 'QUEUED' && (
              <LinearProgress
                variant="indeterminate"
                sx={{
                  height: 2,
                  borderRadius: 1,
                }}
              />
            )}

            {job.error && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {job.error}
              </Typography>
            )}
          </MenuItem>
        ))}

        {jobs.length === 0 && (
          <MenuItem disabled>
            <ListItemText
              primary="No active jobs"
              secondary="AI tasks will appear here"
            />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

