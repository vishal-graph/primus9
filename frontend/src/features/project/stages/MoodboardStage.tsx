/**
 * TatvaOps Vision - Moodboard Stage
 * 
 * Unified view of all room moodboards.
 * Works for both:
 * - Single-theme flow (global intent mapped to rooms)
 * - Room-wise flow (individual room intents)
 * 
 * Features:
 * - Grid of room moodboard cards
 * - Version display (v1, v2, etc.)
 * - Regenerate button per room
 * - Generation status indicators
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Skeleton,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Refresh,
  ZoomIn,
  Download,
  CheckCircle,
  HourglassEmpty,
  Error as ErrorIcon,
  CollectionsBookmark,
  ArrowForward,
  PictureAsPdf,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectRoomGenerationStates, updateRoomGenerationStatus, completeRoomGeneration, failRoomGeneration, selectIntentMode } from '@/store/slices/intentSlice';
import { getProjectMoodboards, getProjectActiveJobs, getMoodboardJobStatus, RoomMoodboard } from '@/lib/actions/intent';
import { slideFromBottomVariants, staggerContainerVariants, staggerItemVariants } from '@/motion/pageTransitions';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { buildProjectContext } from '@/lib/feedback/build-context';
import { checkFeedbackExists } from '@/lib/actions/feedback';
import { useUser } from '@clerk/nextjs';
import type { ProjectContext } from '@/lib/feedback/feedback-engine';
import { getApiBase } from '@/lib/api-base';
import { createMoodboardPdfExport, getExportStatus, ExportAssetStatus } from '@/lib/actions/exports';
import { RoomwiseMoodboardGallery } from '@/features/moodboard/components/RoomwiseMoodboardGallery';

interface MoodboardStageProps {
  projectId: string;
  onStageChange?: (stage: string) => void;
}

// Status badge component
function StatusBadge({ status, jobId, startTime }: { status: string; jobId?: string; startTime?: number }) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    if (status === 'GENERATING' || status === 'QUEUED') {
      const interval = setInterval(() => {
        if (startTime) {
          setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [status, startTime]);
  
  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };
  
  switch (status) {
    case 'GENERATED':
      return (
        <Chip
          icon={<CheckCircle sx={{ fontSize: 16 }} />}
          label="Ready"
          size="small"
          color="success"
          variant="outlined"
        />
      );
    case 'GENERATING':
    case 'QUEUED':
      return (
        <Chip
          icon={<HourglassEmpty sx={{ fontSize: 16 }} />}
          label={elapsed > 0 ? `Generating (${formatElapsed(elapsed)})` : 'Generating'}
          size="small"
          color={elapsed > 180 ? 'error' : 'warning'} // Red if > 3 minutes
          variant="outlined"
        />
      );
    case 'FAILED':
      return (
        <Chip
          icon={<ErrorIcon sx={{ fontSize: 16 }} />}
          label="Failed"
          size="small"
          color="error"
          variant="outlined"
        />
      );
    default:
      return (
        <Chip
          label="Pending"
          size="small"
          variant="outlined"
        />
      );
  }
}

export function MoodboardStage({ projectId, onStageChange }: MoodboardStageProps) {
  const dispatch = useAppDispatch();
  const roomGenerationStates = useAppSelector(selectRoomGenerationStates);
  const intentMode = useAppSelector(selectIntentMode); // Detect intent mode
  
  // If ROOM mode, render the room-wise gallery
  if (intentMode === 'ROOM') {
    return <RoomwiseMoodboardGallery projectId={projectId} onStageChange={onStageChange} />;
  }
  
  // Otherwise, render the GLOBAL mode grid view (existing implementation)
  const [moodboards, setMoodboards] = useState<RoomMoodboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMoodboard, setSelectedMoodboard] = useState<RoomMoodboard | null>(null);
  const [regeneratingRoomId, setRegeneratingRoomId] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<Map<string, string>>(new Map()); // roomId -> jobId
  const [jobStartTimes, setJobStartTimes] = useState<Map<string, number>>(new Map()); // jobId -> timestamp
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackContext, setFeedbackContext] = useState<ProjectContext | null>(null);
  const { user } = useUser();
  
  // PDF Export state
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportId, setExportId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportAssetStatus | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportPollRef = useRef<NodeJS.Timeout | null>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadMoodboardsRef = useRef<(() => Promise<void>) | null>(null);
  const refreshMoodboardsRef = useRef<(() => Promise<void>) | null>(null);
  const startJobPollingRef = useRef<((jobs: Map<string, string>, initialJobTimes?: Map<string, number>) => void) | null>(null);
  const isLoadingRef = useRef(false);
  const lastProjectIdRef = useRef<string | null>(null);

  // ============================================
  // DATA LOADING
  // ============================================

  // Internal function to actually load data (no guards)
  // Use refs to avoid dependency issues
  const doLoadMoodboardsRef = useRef<((skipJobCheck?: boolean) => Promise<void>) | null>(null);
  
  const doLoadMoodboards = useCallback(async (skipJobCheck = false) => {
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch existing moodboards
      const result = await getProjectMoodboards(projectId);
      
      if (result.success && result.moodboards) {
        setMoodboards(result.moodboards);
      }

      // Only check for active jobs on initial load, not on refresh
      if (!skipJobCheck) {
        const activeJobsResult = await getProjectActiveJobs(projectId);
        const runningJobs = activeJobsResult.jobs || [];

        if (runningJobs.length > 0) {
          const jobMap = new Map<string, string>();
          
          const jobTimes = new Map<string, number>();
          const now = Date.now();
          
          runningJobs.forEach((job) => {
            if (job.roomId) {
              jobMap.set(job.roomId, job.id);
              
              // Track job start time (use creation time or now if resuming)
              const jobAge = job.createdAt ? Date.now() - new Date(job.createdAt).getTime() : 0;
              jobTimes.set(job.id, now - jobAge);
              
              // Update Redux state for each active job
              dispatch(updateRoomGenerationStatus({
                roomId: job.roomId,
                status: job.status === 'PROCESSING' ? 'GENERATING' : 'QUEUED',
                jobId: job.id,
                progress: job.progress || 0,
              }));
            }
          });

          setActiveJobs(jobMap);
          setJobStartTimes(jobTimes);
          if (startJobPollingRef.current) {
            startJobPollingRef.current(jobMap, jobTimes);
          }
        } else {
          setActiveJobs(new Map());
        }
      }
    } catch (e) {
      setError('Failed to load moodboards');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [projectId, dispatch]);

  // Update ref
  useEffect(() => {
    doLoadMoodboardsRef.current = doLoadMoodboards;
  }, [doLoadMoodboards]);

  // Public function - always load on mount/reload to check for active jobs
  const loadMoodboards = useCallback(async () => {
    // Always load to check for active jobs (graceful reload support)
    lastProjectIdRef.current = projectId;
    if (doLoadMoodboardsRef.current) {
      await doLoadMoodboardsRef.current(false);
    }
  }, [projectId]);

  // Refresh function (no guard, for use after jobs complete)
  const refreshMoodboards = useCallback(async () => {
    if (doLoadMoodboardsRef.current) {
      await doLoadMoodboardsRef.current(true); // Skip job check since we just finished polling
    }
  }, []);

  // Keep refs updated
  useEffect(() => {
    loadMoodboardsRef.current = loadMoodboards;
    refreshMoodboardsRef.current = refreshMoodboards;
  }, [loadMoodboards, refreshMoodboards]);

  // Load once on mount or when projectId changes
  useEffect(() => {
    // Reset when projectId changes
    if (lastProjectIdRef.current !== projectId) {
      lastProjectIdRef.current = null;
    }
    
    // Load moodboards
    if (loadMoodboardsRef.current) {
      loadMoodboardsRef.current();
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [projectId]); // Only depend on projectId

  // ============================================
  // JOB POLLING (Resume on reload)
  // ============================================

  const startJobPolling = useCallback((jobsToWatch: Map<string, string>, initialJobTimes?: Map<string, number>) => {
    // Prevent starting polling if already polling
    if (pollIntervalRef.current) {
      return;
    }

    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout
    const WARNING_MS = 3 * 60 * 1000; // 3 minutes warning threshold
    
    // Initialize job times if not provided
    const startTimes = initialJobTimes || new Map<string, number>();
    if (!initialJobTimes) {
      const now = Date.now();
      jobsToWatch.forEach((jobId) => {
        if (!startTimes.has(jobId)) {
          startTimes.set(jobId, now);
        }
      });
      setJobStartTimes(new Map(startTimes));
    }
    
    pollIntervalRef.current = setInterval(async () => {
      const jobs = Array.from(jobsToWatch.entries());
      const now = Date.now();
      
      if (jobs.length === 0) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        // Refresh moodboards after all jobs complete (skip job check)
        if (refreshMoodboardsRef.current) {
          refreshMoodboardsRef.current();
        }
        return;
      }

      let completedCount = 0;

      for (const [roomId, jobId] of jobs) {
        try {
          // Check for timeout
          const startTime = startTimes.get(jobId);
          if (startTime) {
            const elapsed = now - startTime;
            
            // Warn if taking too long
            if (elapsed > WARNING_MS && elapsed < TIMEOUT_MS) {
              console.warn(`[Moodboard] Job ${jobId} for room ${roomId} has been running for ${Math.round(elapsed / 60000)} minutes`);
            }
            
            // Timeout - mark as failed and suggest retry
            if (elapsed > TIMEOUT_MS) {
              console.error(`[Moodboard] Job ${jobId} for room ${roomId} timed out after ${Math.round(elapsed / 60000)} minutes`);
              dispatch(failRoomGeneration({ 
                roomId, 
                error: 'Generation timed out. Please try regenerating.' 
              }));
              jobsToWatch.delete(roomId);
              startTimes.delete(jobId);
              setJobStartTimes(new Map(startTimes));
              completedCount++;
              continue; // Skip status check for timed-out job
            }
          }
          
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
            }));

            if (job.status === 'COMPLETED') {
              dispatch(completeRoomGeneration({
                roomId,
                moodboardId: job.moodboardId || '',
                moodboardUrl: job.moodboardUrl || '',
                moodboardVersion: 1,
              }));
              
              jobsToWatch.delete(roomId);
              startTimes.delete(jobId);
              setJobStartTimes(new Map(startTimes));
              completedCount++;
            } else if (job.status === 'FAILED') {
              dispatch(failRoomGeneration({ roomId, error: job.error || 'Generation failed' }));
              jobsToWatch.delete(roomId);
              startTimes.delete(jobId);
              setJobStartTimes(new Map(startTimes));
              completedCount++;
            }
          } else {
            // Failed to get job status - might be a backend issue
            console.error(`[Moodboard] Failed to get status for job ${jobId}`);
          }
        } catch (e) {
          console.error('Job poll error:', e);
        }
      }

      // Update local state
      if (completedCount > 0) {
        setActiveJobs(new Map(jobsToWatch));
      }

      // If all done, stop polling and refresh
      if (jobsToWatch.size === 0) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        if (refreshMoodboardsRef.current) {
          refreshMoodboardsRef.current();
        }
      }
    }, 3000); // Poll every 3 seconds
  }, [dispatch]);

  // Keep ref updated
  useEffect(() => {
    startJobPollingRef.current = startJobPolling;
  }, [startJobPolling]);

  // Merge Redux state with loaded moodboards
  const mergedRoomStates = Object.entries(roomGenerationStates).map(([roomId, state]) => {
    const existingMoodboard = moodboards.find(m => m.roomId === roomId);
    const jobId = activeJobs.get(roomId);
    const startTime = jobId ? jobStartTimes.get(jobId) : undefined;
    
    return {
      roomId,
      roomName: state.roomName || existingMoodboard?.roomName || 'Unknown Room',
      status: state.generationStatus,
      progress: state.progress,
      moodboardUrl: state.moodboardUrl || existingMoodboard?.imageUrl,
      s3Key: existingMoodboard?.s3Key, // Include s3Key for direct S3 access
      moodboardVersion: state.moodboardVersion || existingMoodboard?.version || 1,
      generatedAt: existingMoodboard?.generatedAt,
      error: state.error,
      jobId,
      startTime,
    };
  });

  // If we have moodboards but no Redux state, use moodboards
  const displayRooms = mergedRoomStates.length > 0 
    ? mergedRoomStates 
    : moodboards.map(m => ({
        roomId: m.roomId,
        roomName: m.roomName,
        status: 'GENERATED' as const,
        progress: 100,
        moodboardUrl: m.imageUrl,
        s3Key: m.s3Key, // Include s3Key for direct S3 access
        moodboardVersion: m.version,
        generatedAt: m.generatedAt,
        error: undefined,
        jobId: undefined,
        startTime: undefined,
      }));

  // ============================================
  // HANDLERS
  // ============================================

  const handleRegenerate = async (roomId: string) => {
    setRegeneratingRoomId(roomId);
    // TODO: Implement regeneration flow
    // This should open intent form for that room
    setTimeout(() => {
      setRegeneratingRoomId(null);
      // Navigate back to intent stage for that room
      onStageChange?.('intent');
    }, 500);
  };

  const handleDownload = async (url: string, roomName: string, s3Key?: string) => {
    try {
      const filename = `moodboard-${roomName.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      
      // Use backend proxy endpoint which sets Content-Disposition: attachment
      const apiBase = getApiBase();
      const downloadUrl = s3Key
        ? `${apiBase}/public/download?s3Key=${encodeURIComponent(s3Key)}&filename=${encodeURIComponent(filename)}`
        : `${apiBase}/public/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      
      // Use window.location to trigger the browser's native download
      window.location.assign(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
      setError(`Failed to download ${roomName} moodboard`);
    }
  };

  // ===========================================
  // PDF EXPORT HANDLERS
  // ===========================================

  const handleExportPdf = async () => {
    const readyMoodboards = displayRooms.filter(
      (room) => room.status === 'GENERATED' && room.moodboardUrl
    );

    if (readyMoodboards.length === 0) {
      setError('No moodboards available to export');
      return;
    }

    // Check if feedback already exists for this project
    if (user?.id) {
      const feedbackCheck = await checkFeedbackExists(projectId);
      
      // If feedback already exists, skip modal and export directly
      if (feedbackCheck.success && feedbackCheck.exists) {
        startPdfExport();
        return;
      }

      // If feedback doesn't exist, show modal first
      const context = await buildProjectContext(projectId, user.id);
      if (context) {
        setFeedbackContext(context);
        setShowFeedbackModal(true);
        return;
      }
    }

    // Fallback: export directly if context building fails
    startPdfExport();
  };

  const startPdfExport = async () => {
    setExportingPdf(true);
    setExportError(null);
    setExportStatus('PENDING');

    try {
      const result = await createMoodboardPdfExport(projectId, {
        includeDescriptions: true,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create export');
      }

      setExportId(result.data.id);
      setExportStatus(result.data.status);

      // Start polling for export status
      startExportPolling(result.data.id);

    } catch (err) {
      console.error('Export failed:', err);
      setExportError(err instanceof Error ? err.message : 'Failed to create export');
      setExportingPdf(false);
      setExportStatus(null);
    }
  };

  const startExportPolling = (expId: string) => {
    // Clear any existing poll
    if (exportPollRef.current) {
      clearInterval(exportPollRef.current);
    }

    exportPollRef.current = setInterval(async () => {
      try {
        const result = await getExportStatus(expId);

        if (result.success && result.data) {
          setExportStatus(result.data.status);

          if (result.data.status === 'COMPLETED') {
            // Stop polling
            if (exportPollRef.current) {
              clearInterval(exportPollRef.current);
              exportPollRef.current = null;
            }

            // Download the PDF
            if (result.data.s3Key) {
              downloadExportedPdf(result.data.s3Key, result.data.filename || 'design-moodboard.pdf');
            }

            setExportingPdf(false);
          } else if (result.data.status === 'FAILED') {
            // Stop polling
            if (exportPollRef.current) {
              clearInterval(exportPollRef.current);
              exportPollRef.current = null;
            }

            setExportError(result.data.error || 'Export failed');
            setExportingPdf(false);
          }
        }
      } catch (err) {
        console.error('Export poll error:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const downloadExportedPdf = async (s3Key: string, filename: string) => {
    try {
      const apiBase = getApiBase();
      const downloadUrl = `${apiBase}/public/download?s3Key=${encodeURIComponent(s3Key)}&filename=${encodeURIComponent(filename)}`;

      // Use window.location to trigger the browser's native download
      // The backend sets Content-Disposition: attachment
      window.location.assign(downloadUrl);
    } catch (err) {
      console.error('PDF download failed:', err);
      setError('Failed to download PDF');
    }
  };

  // Cleanup export polling on unmount
  useEffect(() => {
    return () => {
      if (exportPollRef.current) {
        clearInterval(exportPollRef.current);
      }
    };
  }, []);

  const handleFeedbackComplete = () => {
    setShowFeedbackModal(false);
    // Now perform the actual export
    startPdfExport();
  };

  const handleFeedbackCancel = () => {
    setShowFeedbackModal(false);
    // User cancelled feedback, proceed with export anyway
    startPdfExport();
  };

  // ============================================
  // RENDER
  // ============================================

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Moodboards
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Error state
  if (error && displayRooms.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadMoodboards} startIcon={<Refresh />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // Empty state
  if (displayRooms.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            backgroundColor: alpha('#5C6BC0', 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <CollectionsBookmark sx={{ fontSize: 50, color: 'primary.main' }} />
        </Box>
        <Typography variant="h6" gutterBottom>
          No Moodboards Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
          Complete the Design Intent stage to generate moodboards for your rooms.
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
    <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
      {/* Export Error Alert */}
      {exportError && (
        <Alert 
          severity="error" 
          onClose={() => setExportError(null)}
          sx={{ mb: 2 }}
        >
          {exportError}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Moodboards
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI-generated design moodboards for each room
          </Typography>
        </Box>
        {displayRooms.filter((r) => r.status === 'GENERATED' && r.moodboardUrl).length > 0 && (
          <Button
            variant="contained"
            startIcon={exportingPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />}
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

      {/* Stats Summary */}
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
            {displayRooms.filter(r => r.status === 'GENERATED').length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Moodboards Ready
          </Typography>
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700} color="warning.main">
            {displayRooms.filter(r => r.status === 'GENERATING' || r.status === 'QUEUED').length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            In Progress
          </Typography>
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {displayRooms.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Rooms
          </Typography>
        </Box>
      </Paper>

      {/* Moodboard Grid */}
      <Grid
        container
        spacing={3}
        component={motion.div}
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {displayRooms.map((room) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={3}
            key={room.roomId}
            component={motion.div}
            variants={staggerItemVariants}
          >
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
              {/* Image Area */}
              {room.moodboardUrl ? (
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    image={room.moodboardUrl}
                    alt={`${room.roomName} moodboard`}
                    sx={{
                      height: 200,
                      objectFit: 'cover',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedMoodboard({
                      id: room.roomId,
                      roomId: room.roomId,
                      roomName: room.roomName,
                      version: room.moodboardVersion,
                      imageUrl: room.moodboardUrl!,
                      generatedAt: room.generatedAt || new Date().toISOString(),
                    })}
                  />
                  
                  {/* Zoom overlay */}
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
                        onClick={() => setSelectedMoodboard({
                          id: room.roomId,
                          roomId: room.roomId,
                          roomName: room.roomName,
                          version: room.moodboardVersion,
                          imageUrl: room.moodboardUrl!,
                          generatedAt: room.generatedAt || new Date().toISOString(),
                        })}
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
                        onClick={() => handleDownload(room.moodboardUrl!, room.roomName, room.s3Key)}
                      >
                        <Download fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Version badge */}
                  <Chip
                    label={`v${room.moodboardVersion}`}
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
                  {(room.status === 'GENERATING' || room.status === 'QUEUED') ? (
                    <>
                      <CircularProgress size={40} sx={{ mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Generating...
                      </Typography>
                      {room.progress !== undefined && (
                        <Box sx={{ width: '80%' }}>
                          <LinearProgress
                            variant="determinate"
                            value={room.progress}
                            sx={{ borderRadius: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            {room.progress}%
                          </Typography>
                        </Box>
                      )}
                    </>
                  ) : room.status === 'FAILED' ? (
                    <>
                      <ErrorIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                      <Typography variant="body2" color="error">
                        Generation Failed
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                        {room.error || 'Unknown error'}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <CollectionsBookmark sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No moodboard yet
                      </Typography>
                    </>
                  )}
                </Box>
              )}

              {/* Content */}
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {room.roomName}
                  </Typography>
                  <StatusBadge status={room.status} jobId={room.jobId} startTime={room.startTime} />
                </Box>
                {room.generatedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Generated {new Date(room.generatedAt).toLocaleDateString()}
                  </Typography>
                )}
              </CardContent>

              {/* Actions */}
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  size="small"
                  startIcon={regeneratingRoomId === room.roomId ? <CircularProgress size={14} /> : <Refresh />}
                  onClick={() => handleRegenerate(room.roomId)}
                  disabled={regeneratingRoomId === room.roomId || room.status === 'GENERATING' || room.status === 'QUEUED'}
                  sx={{ textTransform: 'none' }}
                >
                  {room.status === 'GENERATED' ? 'Regenerate' : 'Retry'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Continue Button */}
      {displayRooms.every(r => r.status === 'GENERATED') && displayRooms.length > 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={async () => {
              // Navigate to elevation stage - generation will start there
              onStageChange?.('elevation');
            }}
            endIcon={<ArrowForward />}
            sx={{ textTransform: 'none', px: 4 }}
          >
            Continue to Elevations
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Elevations will be generated from floor plan geometry using moodboard style
          </Typography>
        </Box>
      )}

      {/* Feedback Modal */}
      {feedbackContext && (
        <FeedbackModal
          open={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onCancel={handleFeedbackCancel}
          onComplete={handleFeedbackComplete}
          context={feedbackContext}
          allowSkip={false} // TODO: Check if user is admin
        />
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedMoodboard}
        onClose={() => setSelectedMoodboard(null)}
        maxWidth="lg"
        fullWidth
      >
        {selectedMoodboard && (
          <>
            <DialogTitle>
              <Box>
                <Typography variant="h6" component="div">
                  {selectedMoodboard.roomName} Moodboard
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Version {selectedMoodboard.version}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box
                component="img"
                src={selectedMoodboard.imageUrl}
                alt={`${selectedMoodboard.roomName} moodboard`}
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 2,
                }}
              />
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
