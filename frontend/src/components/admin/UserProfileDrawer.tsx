/**
 * User Profile Drawer
 * 
 * 360° view of a single user with 5 sections:
 * 1. Basic Info
 * 2. Projects Summary
 * 3. Feedback Summary
 * 4. AI Usage Breakdown
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Close,
  Person,
  Folder,
  Feedback as FeedbackIcon,
  AutoAwesome,
  ContentCopy,
} from '@mui/icons-material';
import { getAdminUserProfile, AdminUserProfile } from '@/lib/actions/admin';

interface UserProfileDrawerProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function UserProfileDrawer({ userId, open, onClose }: UserProfileDrawerProps) {
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    const result = await getAdminUserProfile(userId);

    if (result.success && result.data) {
      setProfile(result.data);
    } else {
      setError(result.error || 'Failed to load user profile');
    }

    setIsLoading(false);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 600, md: 700 },
          bgcolor: '#fafafa',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600}>
            User Profile
          </Typography>
          {profile && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {profile.basicInfo.email}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3, overflow: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box>
            <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Box>
        ) : profile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 1. Basic Info */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Person sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Basic Information
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        User ID:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                      >
                        {profile.basicInfo.id}
                      </Typography>
                      <IconButton size="small" onClick={() => handleCopyId(profile.basicInfo.id)}>
                        <ContentCopy sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        Name:
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {profile.basicInfo.name || '-'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        Email:
                      </Typography>
                      <Typography variant="body2">
                        {profile.basicInfo.email}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        Plan:
                      </Typography>
                      <Chip label={profile.basicInfo.plan} size="small" />
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        Status:
                      </Typography>
                      <Chip
                        label={profile.basicInfo.status}
                        size="small"
                        color={profile.basicInfo.status === 'active' ? 'success' : 'default'}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        Signup Date:
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(profile.basicInfo.signupDate)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 2. Projects Summary */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Folder sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Projects ({profile.projects.length})
                  </Typography>
                </Box>

                {profile.projects.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No projects yet
                  </Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Rooms</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Gens</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Regens</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>Exports</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {profile.projects.map((project) => (
                          <TableRow key={project.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {project.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {project.theme}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {project.roomCount}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {project.totalGenerations}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography
                                variant="body2"
                                color={project.totalRegenerations > 5 ? 'error' : 'text.primary'}
                                fontWeight={project.totalRegenerations > 5 ? 600 : 400}
                              >
                                {project.totalRegenerations}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {project.exportCount}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(project.createdAt).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>

            {/* 4. Feedback Summary */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <FeedbackIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Feedback Summary
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Submissions
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {profile.feedbackSummary.count}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Avg Satisfaction
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {profile.feedbackSummary.avgSatisfaction.toFixed(1)} / 5.0
                      </Typography>
                    </Box>
                  </Grid>

                  {profile.feedbackSummary.commonSignals.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Common Improvement Signals
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {profile.feedbackSummary.commonSignals.map((signal, idx) => (
                          <Chip
                            key={idx}
                            label={signal.replace(/_/g, ' ')}
                            size="small"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Last Feedback:
                      </Typography>
                      <Typography variant="caption">
                        {formatDate(profile.feedbackSummary.lastFeedbackAt)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 5. AI Usage Breakdown */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AutoAwesome sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    AI Usage Breakdown
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#9c27b015',
                        border: '1px solid #9c27b030',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Moodboards
                      </Typography>
                      <Typography variant="h5" fontWeight={600} color="#9c27b0">
                        {profile.aiUsage.moodboardGens}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#ff980015',
                        border: '1px solid #ff980030',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Elevations
                      </Typography>
                      <Typography variant="h5" fontWeight={600} color="#ff9800">
                        {profile.aiUsage.elevationGens}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#4caf5015',
                        border: '1px solid #4caf5030',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Interiors
                      </Typography>
                      <Typography variant="h5" fontWeight={600} color="#4caf50">
                        {profile.aiUsage.interiorGens}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: '#2196f315',
                        border: '1px solid #2196f330',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Floor Plans
                      </Typography>
                      <Typography variant="h5" fontWeight={600} color="#2196f3">
                        {profile.aiUsage.floorplanAnalysis}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Total AI Jobs */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Total AI Jobs
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {profile.aiUsage.moodboardGens +
                          profile.aiUsage.elevationGens +
                          profile.aiUsage.interiorGens +
                          profile.aiUsage.floorplanAnalysis}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        ) : null}
      </Box>
    </Drawer>
  );
}

