/**
 * TatvaOps Vision - Room-wise Moodboard Gallery
 * 
 * Tabbed gallery view for room-specific moodboards
 * Shows intent summary + moodboard in split view
 * Used when project has ROOM intent mode
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Grid,
  alpha,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Error as ErrorIcon,
  RadioButtonUnchecked,
  Refresh,
  Download,
  ZoomIn,
  ArrowForward,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectRoomGenerationStates,
  selectRoomIntents,
  selectSelectedRoomIds,
  selectCurrentRoomIndex,
  goToRoom,
  updateRoomGenerationStatus,
  completeRoomGeneration,
  failRoomGeneration,
  updateRoomIntent,
} from '@/store/slices/intentSlice';
import { IntentSummaryCard } from './IntentSummaryCard';
import { getProjectActiveJobs, getMoodboardJobStatus, getProjectMoodboards, getProjectIntents, regenerateMoodboard, RoomMoodboard, SavedIntent } from '@/lib/actions/intent';
import { getRooms } from '@/lib/actions/project';
import { createMoodboardPdfExport, getExportStatus, ExportAssetStatus } from '@/lib/actions/exports';
import { getApiBase } from '@/lib/api-base';
import { motion } from 'framer-motion';

interface RoomwiseMoodboardGalleryProps {
  projectId: string;
  onStageChange?: (stage: string) => void;
}

interface TabData {
  roomId: string;
  roomName: string;
  status: 'IDLE' | 'QUEUED' | 'GENERATING' | 'GENERATED' | 'FAILED';
  moodboard?: RoomMoodboard;
}

// Status icon component
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'GENERATED':
      return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
    case 'GENERATING':
    case 'QUEUED':
      return <CircularProgress size={14} />;
    case 'FAILED':
      return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
    default:
      return <RadioButtonUnchecked sx={{ fontSize: 16, color: 'text.disabled' }} />;
  }
}

export function RoomwiseMoodboardGallery({ projectId, onStageChange }: RoomwiseMoodboardGalleryProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const dispatch = useAppDispatch();
  const selectedRoomIds = useAppSelector(selectSelectedRoomIds);
  const roomGenerationStates = useAppSelector(selectRoomGenerationStates);
  const roomIntents = useAppSelector(selectRoomIntents);
  const currentRoomIndex = useAppSelector(selectCurrentRoomIndex);
  
  const [activeTab, setActiveTab] = useState(0);
  const [roomNamesFromApi, setRoomNamesFromApi] = useState<Record<string, string>>({});
  const [moodboards, setMoodboards] = useState<Record<string, RoomMoodboard>>({});
  const [intentsByRoomId, setIntentsByRoomId] = useState<Record<string, SavedIntent>>({});
  const [intentsById, setIntentsById] = useState<Record<string, SavedIntent>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingRoomId, setRegeneratingRoomId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportAssetStatus | null>(null);
  const exportPollRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeJobsRef = useRef<Map<string, string>>(new Map());

  const getSavedRoomIntent = useCallback((roomId: string) => {
    try {
      const raw = localStorage.getItem(`intent-room-${projectId}-${roomId}`);
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, [projectId]);

  useEffect(() => {
    if (!selectedRoomIds.length) {
      return;
    }
    if (currentRoomIndex >= 0 && currentRoomIndex < selectedRoomIds.length) {
      setActiveTab(currentRoomIndex);
    }
  }, [currentRoomIndex, selectedRoomIds.length]);

  const openIntentForRoom = useCallback((roomId: string) => {
    const index = selectedRoomIds.indexOf(roomId);
    if (index >= 0) {
      dispatch(goToRoom(index));
    }
    onStageChange?.('intent');
  }, [dispatch, selectedRoomIds, onStageChange]);

  // Build tab data: use API room names first (persist on reload), then Redux, then fallback
  const tabs: TabData[] = selectedRoomIds.map(roomId => {
    const genState = roomGenerationStates[roomId];
    const moodboard = moodboards[roomId];
    const status = moodboard ? 'GENERATED' : (genState?.generationStatus || 'IDLE');
    const roomName = roomNamesFromApi[roomId] ?? genState?.roomName ?? 'Room';
    return {
      roomId,
      roomName,
      status,
      moodboard,
    };
  });

  const currentTab = tabs[activeTab];
  const readyCount = tabs.filter((tab) => tab.status === 'GENERATED').length;
  const inProgressCount = tabs.filter((tab) => tab.status === 'GENERATING' || tab.status === 'QUEUED').length;
  const allGenerated = tabs.length > 0 && tabs.every((tab) => tab.status === 'GENERATED' && tab.moodboard?.imageUrl);

  // Load moodboards and room names (room names from API persist on reload)
  const loadMoodboards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [roomsList, intentsResult] = await Promise.all([
        getRooms(projectId),
        getProjectIntents(projectId),
      ]);
      const nameMap: Record<string, string> = {};
      roomsList.forEach((r) => {
        nameMap[r.id] = r.name;
      });
      setRoomNamesFromApi((prev) => ({ ...prev, ...nameMap }));

      if (intentsResult.success && intentsResult.intents) {
        const byRoom: Record<string, SavedIntent> = {};
        const byId: Record<string, SavedIntent> = {};
        intentsResult.intents.forEach((intent) => {
          byId[intent.id] = intent;
          if (intent.roomId) {
            byRoom[intent.roomId] = intent;
          }
        });
        setIntentsByRoomId(byRoom);
        setIntentsById(byId);
      }

      const result = await getProjectMoodboards(projectId);
      
      if (result.success && result.moodboards) {
        const moodboardMap: Record<string, RoomMoodboard> = {};
        result.moodboards.forEach(mb => {
          moodboardMap[mb.roomId] = mb;
        });
        setMoodboards(moodboardMap);

        // Sync Redux generation state based on available moodboards
        result.moodboards.forEach((mb) => {
          dispatch(completeRoomGeneration({
            roomId: mb.roomId,
            moodboardId: mb.id,
            moodboardUrl: mb.imageUrl,
            moodboardVersion: mb.version || 1,
          }));
        });

        // Hydrate missing room intents from localStorage
        selectedRoomIds.forEach((roomId) => {
          const existing = roomIntents[roomId]?.payload;
          if (!existing || Object.keys(existing).length === 0) {
            const saved = getSavedRoomIntent(roomId);
            if (saved && Object.keys(saved).length > 0) {
              dispatch(updateRoomIntent({ roomId, payload: saved }));
            }
          }
        });
      } else {
        setError(result.error || 'Failed to load moodboards');
      }
    } catch (e) {
      setError('Failed to load moodboards');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, dispatch, selectedRoomIds, roomIntents, getSavedRoomIntent]);

  // Poll active jobs and update room statuses
  const startJobPolling = useCallback((jobMap: Map<string, string>) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    activeJobsRef.current = jobMap;

    pollIntervalRef.current = setInterval(async () => {
      const entries = Array.from(activeJobsRef.current.entries());

      if (entries.length === 0) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        return;
      }

      for (const [roomId, jobId] of entries) {
        try {
          const result = await getMoodboardJobStatus(jobId);
          if (result.success && result.job) {
            const job = result.job;
            dispatch(updateRoomGenerationStatus({
              roomId,
              status: job.status === 'COMPLETED' ? 'GENERATED' :
                      job.status === 'FAILED' ? 'FAILED' :
                      job.status === 'PROCESSING' ? 'GENERATING' : 'QUEUED',
              progress: job.progress,
              error: job.error,
              moodboardId: job.moodboardId,
              moodboardUrl: job.moodboardUrl,
            }));

            if (job.status === 'COMPLETED') {
              dispatch(completeRoomGeneration({
                roomId,
                moodboardId: job.moodboardId || '',
                moodboardUrl: job.moodboardUrl || '',
                moodboardVersion: 1,
              }));
              activeJobsRef.current.delete(roomId);
              // Refresh moodboards to show generated image
              loadMoodboards();
            } else if (job.status === 'FAILED') {
              dispatch(failRoomGeneration({
                roomId,
                error: job.error || 'Generation failed',
              }));
              activeJobsRef.current.delete(roomId);
            }
          }
        } catch (err) {
          console.error('Room-wise job poll error:', err);
        }
      }
    }, 3000);
  }, [dispatch, loadMoodboards]);

  // Load on mount
  useEffect(() => {
    loadMoodboards();
    (async () => {
      const activeJobs = await getProjectActiveJobs(projectId);
      if (activeJobs.success && activeJobs.jobs && activeJobs.jobs.length > 0) {
        const jobMap = new Map<string, string>();
        activeJobs.jobs.forEach((job) => {
          if (job.roomId) {
            jobMap.set(job.roomId, job.id);
            dispatch(updateRoomGenerationStatus({
              roomId: job.roomId,
              status: job.status === 'PROCESSING' ? 'GENERATING' : 'QUEUED',
              jobId: job.id,
              progress: job.progress,
            }));
          }
        });
        startJobPolling(jobMap);
      }
    })();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [loadMoodboards]);

  // Fallback: start polling based on Redux state (room-wise flow)
  useEffect(() => {
    const jobMap = new Map<string, string>();
    Object.values(roomGenerationStates).forEach((state) => {
      if (state.jobId && (state.generationStatus === 'QUEUED' || state.generationStatus === 'GENERATING')) {
        jobMap.set(state.roomId, state.jobId);
      }
    });

    if (jobMap.size > 0) {
      startJobPolling(jobMap);
    }
  }, [roomGenerationStates, startJobPolling]);

  // Handle regenerate
  const handleRegenerate = async (roomId: string) => {
    try {
      setRegeneratingRoomId(roomId);
      const result = await regenerateMoodboard(projectId, roomId);
      
      if (!result.success) {
        setError(result.error || 'Failed to regenerate moodboard');
      } else {
        // Refresh moodboards after a short delay
        setTimeout(() => {
          loadMoodboards();
        }, 2000);
      }
    } catch (e) {
      setError('Failed to regenerate moodboard');
    } finally {
      setRegeneratingRoomId(null);
    }
  };

  // Handle download
  const handleDownload = async (imageUrl: string, roomName: string, s3Key?: string) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${roomName.replace(/\s+/g, '_')}_moodboard_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download moodboard');
    }
  };

  const downloadExportedPdf = async (s3Key: string, filename: string) => {
    try {
      const apiBase = getApiBase();
      const downloadUrl = `${apiBase}/public/download?s3Key=${encodeURIComponent(s3Key)}&filename=${encodeURIComponent(filename)}`;

      // Use window.location to trigger the browser's native download
      window.location.assign(downloadUrl);
    } catch (err) {
      console.error('PDF download failed:', err);
      setError('Failed to download PDF');
    }
  };

  const startExportPolling = (exportId: string) => {
    if (exportPollRef.current) {
      clearInterval(exportPollRef.current);
    }

    exportPollRef.current = setInterval(async () => {
      try {
        const result = await getExportStatus(exportId);
        if (result.success && result.data) {
          setExportStatus(result.data.status);
          if (result.data.status === 'COMPLETED') {
            if (exportPollRef.current) {
              clearInterval(exportPollRef.current);
              exportPollRef.current = null;
            }
            if (result.data.s3Key) {
              downloadExportedPdf(result.data.s3Key, result.data.filename || 'design-moodboard.pdf');
            }
            setExportingPdf(false);
          } else if (result.data.status === 'FAILED') {
            if (exportPollRef.current) {
              clearInterval(exportPollRef.current);
              exportPollRef.current = null;
            }
            setError(result.data.error || 'Export failed');
            setExportingPdf(false);
          }
        }
      } catch (err) {
        console.error('Export poll error:', err);
      }
    }, 2000);
  };

  const handleExportPdf = async () => {
    if (readyCount === 0) {
      setError('No moodboards available to export');
      return;
    }

    setExportingPdf(true);
    setExportStatus('PENDING');
    setError(null);

    try {
      const result = await createMoodboardPdfExport(projectId, {
        includeDescriptions: true,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create export');
      }

      setExportStatus(result.data.status);
      startExportPolling(result.data.id);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create export');
      setExportingPdf(false);
      setExportStatus(null);
    }
  };

  useEffect(() => {
    return () => {
      if (exportPollRef.current) {
        clearInterval(exportPollRef.current);
      }
    };
  }, []);

  // Loading state
  if (isLoading && tabs.length === 0) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // No rooms selected
  if (tabs.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          No Rooms Selected
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Go back to Design Intent to select rooms for moodboard generation.
        </Typography>
        <Button
          variant="contained"
          onClick={() => onStageChange?.('intent')}
          endIcon={<ArrowForward />}
        >
          Go to Design Intent
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Room-wise Moodboards
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Individual design intent and moodboard for each room
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {allGenerated ? (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Moodboards
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI-generated design moodboards for each room
              </Typography>
            </Box>
            {readyCount > 0 && (
              <Button
                variant="contained"
                onClick={handleExportPdf}
                disabled={exportingPdf}
                sx={{ textTransform: 'none' }}
              >
                {exportingPdf
                  ? exportStatus === 'PROCESSING'
                    ? 'Generating PDF...'
                    : 'Preparing...'
                  : 'Export Design PDF'}
              </Button>
            )}
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 4,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {readyCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Moodboards Ready
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {inProgressCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {tabs.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Rooms
              </Typography>
            </Box>
          </Paper>

          <Grid container spacing={3}>
            {tabs.map((tab) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={tab.roomId}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: `0 8px 24px ${alpha('#37474F', 0.1)}`,
                    },
                  }}
                >
                  {tab.moodboard?.imageUrl ? (
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        image={tab.moodboard.imageUrl}
                        alt={`${tab.roomName} moodboard`}
                        sx={{
                          height: 200,
                          objectFit: 'cover',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedImageUrl(tab.moodboard!.imageUrl)}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          display: 'flex',
                          gap: 0.5,
                        }}
                      >
                        <Tooltip title="View full size">
                          <IconButton
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              '&:hover': { backgroundColor: 'white' },
                            }}
                            onClick={() => setSelectedImageUrl(tab.moodboard!.imageUrl)}
                          >
                            <ZoomIn fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              '&:hover': { backgroundColor: 'white' },
                            }}
                            onClick={() => handleDownload(
                              tab.moodboard!.imageUrl,
                              tab.roomName,
                              tab.moodboard!.s3Key
                            )}
                          >
                            <Download fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Chip
                        label={`v${tab.moodboard.version}`}
                        size="small"
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: 200,
                        backgroundColor: alpha('#37474F', 0.04),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                      }}
                    >
                      <RadioButtonUnchecked sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No moodboard yet
                      </Typography>
                    </Box>
                  )}

                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {tab.roomName}
                      </Typography>
                      <Chip
                        label="Ready"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      startIcon={regeneratingRoomId === tab.roomId ? <CircularProgress size={14} /> : <Refresh />}
                      onClick={() => handleRegenerate(tab.roomId)}
                      disabled={regeneratingRoomId === tab.roomId}
                    >
                      Regenerate
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <>
          {/* Room Tabs */}
          <Paper
            elevation={0}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: 3,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  minHeight: 64,
                  fontWeight: 500,
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.roomId}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusIcon status={tab.status} />
                      <Typography variant="body2" fontWeight={activeTab === index ? 600 : 400}>
                        {tab.roomName}
                      </Typography>
                      {tab.moodboard && (
                        <Chip
                          label={`v${tab.moodboard.version}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Paper>

          {/* Tab Content */}
          {currentTab && (
            <Box
              component={motion.div}
              key={currentTab.roomId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              sx={{ flex: 1, overflow: 'auto' }}
            >
              <Grid container spacing={3}>
                {/* Intent Summary Panel */}
                <Grid item xs={12} md={5}>
                  {(() => {
                    const savedLocal = getSavedRoomIntent(currentTab.roomId);
                    const intentFromRoom = roomIntents[currentTab.roomId]?.payload;
                    const intentFromApi = intentsByRoomId[currentTab.roomId]?.payload;
                    const intentFromMoodboard =
                      currentTab.moodboard?.intentId ? intentsById[currentTab.moodboard.intentId]?.payload : undefined;
                    const intentPayload = intentFromRoom || intentFromApi || intentFromMoodboard || savedLocal || {};
                    const hasIntent = Object.keys(intentPayload).length > 0;
                    return hasIntent ? (
                      <IntentSummaryCard
                        intent={intentPayload}
                        roomName={currentTab.roomName}
                        onEditIntent={() => {
                          openIntentForRoom(currentTab.roomId);
                        }}
                      />
                    ) : (
                      <Paper
                        elevation={0}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 2,
                          p: 3,
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          Design Intent Required
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Add a design intent for this room before generating a moodboard.
                        </Typography>
                        <Button variant="contained" onClick={() => openIntentForRoom(currentTab.roomId)}>
                          Add Intent
                        </Button>
                      </Paper>
                    );
                  })()}
                </Grid>

                {/* Moodboard Panel */}
                <Grid item xs={12} md={7}>
                  <Paper
                    elevation={0}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      height: '100%',
                      minHeight: 500,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Moodboard Header */}
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: alpha('#5C6BC0', 0.04),
                        borderBottom: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        Moodboard
                      </Typography>
                      {currentTab.status === 'GENERATED' && currentTab.moodboard && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Regenerate">
                            <IconButton
                              size="small"
                              onClick={() => handleRegenerate(currentTab.roomId)}
                              disabled={regeneratingRoomId === currentTab.roomId}
                            >
                              {regeneratingRoomId === currentTab.roomId ? (
                                <CircularProgress size={18} />
                              ) : (
                                <Refresh fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(
                                currentTab.moodboard!.imageUrl,
                                currentTab.roomName,
                                currentTab.moodboard!.s3Key
                              )}
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>

                    {/* Moodboard Content */}
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: alpha('#37474F', 0.02),
                        position: 'relative',
                      }}
                    >
                      {currentTab.status === 'GENERATING' || currentTab.status === 'QUEUED' ? (
                        <Box sx={{ textAlign: 'center', p: 4 }}>
                          <CircularProgress size={60} sx={{ mb: 2 }} />
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {currentTab.status === 'QUEUED' ? 'Queued for generation...' : 'Generating moodboard...'}
                          </Typography>
                        </Box>
                      ) : currentTab.status === 'FAILED' ? (
                        <Box sx={{ textAlign: 'center', p: 4 }}>
                          <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                          <Typography variant="body2" color="error" gutterBottom>
                            Generation Failed
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                            {roomGenerationStates[currentTab.roomId]?.error || 'Unknown error'}
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Refresh />}
                            onClick={() => handleRegenerate(currentTab.roomId)}
                            disabled={regeneratingRoomId === currentTab.roomId}
                          >
                            Retry
                          </Button>
                        </Box>
                      ) : currentTab.status === 'GENERATED' && currentTab.moodboard ? (
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedImageUrl(currentTab.moodboard!.imageUrl)}
                        >
                          <Box
                            component="img"
                            src={currentTab.moodboard.imageUrl}
                            alt={`${currentTab.roomName} moodboard`}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              p: 2,
                            }}
                          />
                          <Tooltip title="View full size">
                            <IconButton
                              sx={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                '&:hover': { backgroundColor: 'white' },
                              }}
                            >
                              <ZoomIn />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box sx={{ textAlign: 'center', p: 4 }}>
                          <RadioButtonUnchecked sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                          <Typography variant="body2" color="text.secondary">
                            Moodboard not generated yet
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </>
      )}

      {/* Full-size Image Modal */}
      {selectedImageUrl && (
        <Box
          onClick={() => setSelectedImageUrl(null)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            cursor: 'pointer',
          }}
        >
          <Box
            component="img"
            src={selectedImageUrl}
            alt="Full size moodboard"
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </Box>
      )}
    </Box>
  );
}
