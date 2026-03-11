/**
 * TatvaOps Vision - Elevation Stage
 * 
 * ============================================================
 * ❗ ISOMETRIC FLOOR ELEVATION (NEW SOURCE OF TRUTH) ❗
 * ============================================================
 * 
 * Full-floor isometric / bird's-eye interior elevation
 * One image = entire floor (no room-wise views)
 * 
 * Features:
 * - Single "Generate Isometric View" button
 * - Full floor visualization in one image
 * - Zoom and pan controls
 * - Version history
 * - Download option
 * 
 * ============================================================
 * ❗ FLOOR PLAN GEOMETRY IS LAW ❗
 * ❗ MOODBOARDS ARE STYLE ONLY ❗
 * ============================================================
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Card,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  LinearProgress,
  Paper,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Refresh,
  Download,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  Error as ErrorIcon,
  PlayArrow,
  HourglassEmpty,
  ViewInAr,
  History,
  FullscreenExit,
  Fullscreen,
  Stop,
} from '@mui/icons-material';
import { imageFadeVariants } from '@/motion/pageTransitions';
import {
  getIsometricElevation,
  getAllIsometricElevations,
  triggerIsometricGeneration,
  getActiveIsometricJobs,
  cancelIsometricJob,
  IsometricElevation,
  IsometricJob,
} from '@/lib/actions/elevation';
import { getProjectData } from '@/lib/actions/floor-plan';
import { getApiBase } from '@/lib/api-base';

interface ElevationStageProps {
  projectId: string;
}

export function ElevationStage({ projectId }: ElevationStageProps) {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Elevation data
  const [currentElevation, setCurrentElevation] = useState<IsometricElevation | null>(null);
  const [allVersions, setAllVersions] = useState<IsometricElevation[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  
  // Room stats
  const [roomCount, setRoomCount] = useState(0);
  const [roomsWithMoodboards, setRoomsWithMoodboards] = useState(0);
  
  // Active job
  const [activeJob, setActiveJob] = useState<IsometricJob | null>(null);
  
  // Zoom
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Polling ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===========================================
  // Load Data
  // ===========================================
  
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load project data for room stats
      const projectResult = await getProjectData(projectId);
      if (projectResult.success && projectResult.data) {
        setRoomCount(projectResult.data.rooms?.length || 0);
        const withMoodboards = projectResult.data.rooms?.filter(
          (r: any) => r.moodboards && r.moodboards.length > 0
        ).length || 0;
        setRoomsWithMoodboards(withMoodboards);
      }

      // Load isometric elevation
      const elevationResult = await getIsometricElevation(projectId, 1);
      if (elevationResult.success) {
        setCurrentElevation(elevationResult.elevation || null);
        if (elevationResult.elevation) {
          setSelectedVersion(elevationResult.elevation.version);
        }
      }

      // Load all versions
      const allResult = await getAllIsometricElevations(projectId);
      if (allResult.success) {
        setAllVersions(allResult.elevations || []);
      }

      // Check for active jobs
      const jobsResult = await getActiveIsometricJobs(projectId);
      if (jobsResult.success && jobsResult.jobs && jobsResult.jobs.length > 0) {
        setActiveJob(jobsResult.jobs[0]);
        setIsGenerating(true);
        startPolling();
      }
    } catch (err) {
      console.error('Failed to load elevation data:', err);
      setError('Failed to load elevation data');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [loadData]);

  // ===========================================
  // Polling for Job Status
  // ===========================================
  
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      const result = await getActiveIsometricJobs(projectId);
      
      if (result.success) {
        if (!result.jobs || result.jobs.length === 0) {
          // Job completed
          setIsGenerating(false);
          setActiveJob(null);
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          
          // Reload data
          loadData();
        } else {
          setActiveJob(result.jobs[0]);
        }
      }
    }, 3000); // Poll every 3 seconds
  }, [projectId, loadData]);

  // ===========================================
  // Generate Elevation
  // ===========================================
  
  const handleGenerate = async () => {
    if (roomCount === 0) {
      setError('No rooms found. Complete floor plan analysis first.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Determine next version
      const nextVersion = allVersions.length > 0 
        ? Math.max(...allVersions.map(v => v.version)) + 1 
        : 1;

      const result = await triggerIsometricGeneration(projectId, 1, nextVersion);
      
      if (result.success && result.jobId) {
        setActiveJob({
          jobId: result.jobId,
          projectId,
          floor: 1,
          status: 'QUEUED',
        });
        startPolling();
      } else {
        setError(result.error || 'Failed to start generation');
        setIsGenerating(false);
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError('Failed to start generation');
      setIsGenerating(false);
    }
  };

  // ===========================================
  // Stop (Cancel Current Job)
  // ===========================================
  
  const handleStop = async () => {
    setError(null);

    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Cancel current job if exists
    if (activeJob?.jobId) {
      try {
        const cancelResult = await cancelIsometricJob(activeJob.jobId);
        if (cancelResult.success) {
          console.log('Job cancelled successfully');
        } else if (activeJob.status === 'PROCESSING') {
          console.warn('Cannot cancel processing job');
          setError('Cannot stop a job that is currently processing. Please wait for it to complete.');
          return;
        }
      } catch (err) {
        console.error('Error cancelling job:', err);
        setError('Failed to cancel job');
      }
    }

    // Clear current job state
    setActiveJob(null);
    setIsGenerating(false);
  };

  // ===========================================
  // Regenerate (Start New Generation)
  // ===========================================
  
  const handleRegenerate = async () => {
    if (roomCount === 0) {
      setError('No rooms found. Complete floor plan analysis first.');
      return;
    }

    setError(null);

    // If currently generating, stop first
    if (isGenerating && activeJob?.jobId) {
      await handleStop();
    }

    // Start new generation
    await handleGenerate();
  };

  // ===========================================
  // Version Selection
  // ===========================================
  
  const handleVersionSelect = (version: number) => {
    setSelectedVersion(version);
    const selected = allVersions.find(v => v.version === version);
    if (selected) {
      setCurrentElevation(selected);
    }
  };

  // ===========================================
  // Zoom Controls
  // ===========================================
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  // ===========================================
  // Download
  // ===========================================
  
  const handleDownload = async () => {
    if (!currentElevation?.imageUrl) return;
    
    try {
      const filename = `isometric-floor-v${currentElevation.version}.jpg`;
      
      // Use backend proxy endpoint which sets Content-Disposition: attachment
      const apiBase = getApiBase();
      const s3Key = currentElevation.s3Key;
      const downloadUrl = s3Key
        ? `${apiBase}/public/download?s3Key=${encodeURIComponent(s3Key)}&filename=${encodeURIComponent(filename)}`
        : `${apiBase}/public/download?url=${encodeURIComponent(currentElevation.imageUrl)}&filename=${encodeURIComponent(filename)}`;
      
      // Use window.location to trigger the browser's native download
      window.location.assign(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // ===========================================
  // Render
  // ===========================================
  
  if (isLoading) {
    return (
      <Card sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading elevation data...
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <ViewInAr sx={{ fontSize: 24, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Isometric Floor Elevation
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Bird's-eye view of your entire floor plan with all room styling applied
            </Typography>
          </Box>
          
          {/* Actions & Stats */}
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Stop Button - Only visible when generating */}
            {isGenerating && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Stop />}
                onClick={handleStop}
                color="error"
              >
                Stop
              </Button>
            )}
            
            {/* Regenerate Button - Always visible */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={handleRegenerate}
              disabled={roomCount === 0 || isLoading}
              color="primary"
            >
              Regenerate
            </Button>
            
            {/* Stats */}
            <Stack direction="row" spacing={1}>
              <Chip 
                label={`${roomCount} Rooms`} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                label={`${roomsWithMoodboards} Styled`} 
                size="small" 
                color={roomsWithMoodboards === roomCount ? 'success' : 'warning'}
                variant="outlined"
              />
            </Stack>
          </Stack>
        </Stack>
      </Box>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              sx={{ borderRadius: 0 }}
            >
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {isGenerating ? (
          /* Generating State */
          <Box
            sx={{
              height: 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'background.default',
              borderRadius: 2,
            }}
          >
            <CircularProgress size={64} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Generating Isometric Elevation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Creating a bird's-eye view of your entire floor plan...
            </Typography>
            <Chip 
              icon={<HourglassEmpty />}
              label={activeJob?.status === 'PROCESSING' ? 'Processing...' : 'Queued'}
              color="primary"
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
              This may take 1-2 minutes for complex floor plans
            </Typography>
          </Box>
        ) : currentElevation ? (
          /* Display Elevation */
          <Box>
            {/* Toolbar */}
            <Stack 
              direction="row" 
              justifyContent="space-between" 
              alignItems="center"
              sx={{ mb: 2 }}
            >
              {/* Version Selector */}
              <Stack direction="row" spacing={1} alignItems="center">
                <History sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Version:
                </Typography>
                {allVersions.map(v => (
                  <Chip
                    key={v.id}
                    label={`v${v.version}`}
                    size="small"
                    color={v.version === selectedVersion ? 'primary' : 'default'}
                    onClick={() => handleVersionSelect(v.version)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>

              {/* Controls */}
              <Stack direction="row" spacing={1}>
                <Tooltip title="Zoom Out">
                  <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                    <ZoomOut fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Chip 
                  label={`${Math.round(zoom * 100)}%`} 
                  size="small" 
                  onClick={handleResetZoom}
                  sx={{ cursor: 'pointer' }}
                />
                <Tooltip title="Zoom In">
                  <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 3}>
                    <ZoomIn fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download">
                  <IconButton size="small" onClick={handleDownload}>
                    <Download fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Regenerate">
                  <IconButton size="small" onClick={handleRegenerate} disabled={isLoading}>
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Image Container */}
            <Paper
              variant="outlined"
              sx={{
                height: 500,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'grey.50',
              }}
            >
              <motion.div
                key={currentElevation.id}
                variants={imageFadeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentElevation.imageUrl}
                  alt={`Isometric Floor Elevation v${currentElevation.version}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 500 / zoom,
                    objectFit: 'contain',
                  }}
                />
              </motion.div>
            </Paper>

            {/* Metadata */}
            <Stack 
              direction="row" 
              spacing={2} 
              sx={{ mt: 2 }}
              justifyContent="center"
            >
              <Typography variant="caption" color="text.secondary">
                {currentElevation.roomCount} rooms visualized
              </Typography>
              {currentElevation.deviationEstimate !== undefined && (
                <Typography variant="caption" color="text.secondary">
                  Geometric accuracy: {((1 - currentElevation.deviationEstimate) * 100).toFixed(1)}%
                </Typography>
              )}
              {currentElevation.architecturalAccuracy !== undefined && (
                <Typography variant="caption" color="text.secondary">
                  Architectural accuracy: {(currentElevation.architecturalAccuracy * 100).toFixed(1)}%
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                Generated: {new Date(currentElevation.createdAt).toLocaleDateString()}
              </Typography>
            </Stack>
          </Box>
        ) : (
          /* No Elevation - Generate Button */
          <Box
            sx={{
              height: 500,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'background.default',
              borderRadius: 2,
            }}
          >
            <ViewInAr sx={{ fontSize: 80, color: 'text.disabled', mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Generate Isometric Floor Elevation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 400 }}>
              Create a professional bird's-eye view of your entire floor plan with all room styling applied from your moodboards.
            </Typography>
            
            {roomsWithMoodboards === 0 && roomCount > 0 && (
              <Alert severity="info" sx={{ mb: 3, maxWidth: 400 }}>
                No moodboards found. The elevation will use default styling for all rooms.
              </Alert>
            )}
            
            {roomsWithMoodboards > 0 && roomsWithMoodboards < roomCount && (
              <Alert severity="warning" sx={{ mb: 3, maxWidth: 400 }}>
                {roomCount - roomsWithMoodboards} rooms don't have moodboards. They will use default styling.
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={handleGenerate}
              disabled={roomCount === 0 || isGenerating}
            >
              Generate Isometric View
            </Button>
            
            {roomCount === 0 && (
              <Typography variant="caption" color="error" sx={{ mt: 2 }}>
                Complete floor plan analysis first
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
}
