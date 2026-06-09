/**
 * TatvaOps Vision - Walkthrough Stage
 *
 * Room-wise walkthrough videos (Runway Gen-4 Turbo).
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Grid,
  IconButton,
  Tooltip,
  alpha,
  Chip,
} from '@mui/material';
import { Refresh, Download, CheckCircle } from '@mui/icons-material';
import { getProjectData } from '@/lib/actions/floor-plan';
import {
  getProjectWalkthroughs,
  getActiveWalkthroughJobs,
  triggerRoomWalkthroughGeneration,
  RoomWalkthroughVideo,
} from '@/lib/actions/walkthrough';

interface WalkthroughStageProps {
  projectId: string;
  onStageChange?: (stage: string) => void;
}

export function WalkthroughStage({ projectId }: WalkthroughStageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [videosByRoom, setVideosByRoom] = useState<Record<string, RoomWalkthroughVideo[]>>({});
  const [generatingRoomId, setGeneratingRoomId] = useState<string | null>(null);
  const [generatingRoomIds, setGeneratingRoomIds] = useState<Set<string>>(new Set());
  const [videoPlaybackError, setVideoPlaybackError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const loadRooms = useCallback(async () => {
    const result = await getProjectData(projectId);
    if (result.success && result.data) {
      setRooms(result.data.rooms || []);
    }
  }, [projectId]);

  const loadAllVideos = useCallback(async () => {
    const result = await getProjectWalkthroughs(projectId);
    if (result.success) {
      const grouped: Record<string, RoomWalkthroughVideo[]> = {};
      (result.videos || []).forEach((video) => {
        if (!grouped[video.roomId]) grouped[video.roomId] = [];
        grouped[video.roomId].push(video);
      });
      setVideosByRoom(grouped);
    } else {
      setError(result.error || 'Failed to load walkthrough videos');
    }
  }, [projectId]);

  const loadAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await loadRooms();
    } finally {
      setIsLoading(false);
    }
  }, [loadRooms]);

  useEffect(() => {
    loadAll();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [loadAll]);

  useEffect(() => {
    if (!rooms.length) return;
    loadAllVideos();
  }, [rooms, loadAllVideos]);

  const activeRoom = rooms[activeRoomIndex];
  const roomVideos = activeRoom ? videosByRoom[activeRoom.id] || [] : [];

  const latestVideo = useMemo(() => {
    if (!roomVideos.length) return undefined;
    return roomVideos.reduce((latest, current) =>
      current.version > latest.version ? current : latest
    );
  }, [roomVideos]);

  useEffect(() => {
    setVideoPlaybackError(null);
  }, [latestVideo?.id, latestVideo?.videoUrl]);

  const completedRoomIds = useMemo(() => {
    return rooms
      .filter((room) => (videosByRoom[room.id] || []).length > 0)
      .map((room) => room.id);
  }, [rooms, videosByRoom]);

  const startPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    pollRef.current = setInterval(async () => {
      const result = await getActiveWalkthroughJobs(projectId);
      if (result.success) {
        const roomIds = new Set(
          (result.jobs || []).map((j: any) => j?.payload?.roomId || j?.roomId).filter(Boolean)
        );
        setGeneratingRoomIds(roomIds);
        if (activeRoom?.id && !roomIds.has(activeRoom.id)) {
          setGeneratingRoomId(null);
        } else if (activeRoom?.id && roomIds.has(activeRoom.id)) {
          setGeneratingRoomId(activeRoom.id);
        }
        await loadAllVideos();
      } else if (result.error?.includes('rate')) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }, 15000);
  }, [projectId, activeRoom?.id, loadAllVideos]);

  useEffect(() => {
    if (!rooms.length) return;
    let isMounted = true;
    const checkActiveJobs = async () => {
      const result = await getActiveWalkthroughJobs(projectId);
      if (!isMounted || !result.success) return;
      const roomIds = new Set(
        (result.jobs || []).map((j: any) => j?.payload?.roomId || j?.roomId).filter(Boolean)
      );
      setGeneratingRoomIds(roomIds);
      if (activeRoom?.id && roomIds.has(activeRoom.id)) {
        setGeneratingRoomId(activeRoom.id);
      } else if (activeRoom?.id && !roomIds.has(activeRoom.id)) {
        setGeneratingRoomId(null);
      }
      await loadAllVideos();
    };
    checkActiveJobs();
    return () => {
      isMounted = false;
    };
  }, [projectId, rooms.length, activeRoom?.id, loadAllVideos]);

  useEffect(() => {
    if (generatingRoomId || generatingRoomIds.size > 0) {
      startPolling();
      return;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [generatingRoomId, generatingRoomIds.size, startPolling]);

  const handleGenerate = async () => {
    if (!activeRoom) return;
    setError(null);
    setGeneratingRoomId(activeRoom.id);
    setGeneratingRoomIds((prev) => new Set(prev).add(activeRoom.id));
    const result = await triggerRoomWalkthroughGeneration(projectId, activeRoom.id);
    if (!result.success) {
      setGeneratingRoomId(null);
      setGeneratingRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(activeRoom.id);
        return next;
      });
      setError(result.error || 'Failed to start walkthrough generation');
      return;
    }
    startPolling();
  };

  const handleDownload = async (video: RoomWalkthroughVideo) => {
    try {
      const response = await fetch(video.videoUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeRoom?.name || 'room'}-walkthrough.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download video');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!rooms.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          No Rooms Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Complete floor plan analysis to enable walkthrough generation.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Room Walkthroughs
        </Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Short cinematic walkthroughs per room (Runway)
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeRoomIndex}
          onChange={(_, newValue) => setActiveRoomIndex(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {rooms.map((room) => {
            const isComplete = completedRoomIds.includes(room.id);
            const isGenerating = generatingRoomIds.has(room.id);
            return (
              <Tab
                key={room.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isGenerating ? (
                      <CircularProgress size={14} sx={{ flexShrink: 0 }} />
                    ) : isComplete ? (
                      <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : null}
                    <Typography variant="body2">{room.name}</Typography>
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Paper>

      <Grid container spacing={3} sx={{ flex: 1 }}>
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              minHeight: 480,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha('#37474F', 0.02),
              position: 'relative',
            }}
          >
            {latestVideo ? (
              <>
                {videoPlaybackError && (
                  <Alert severity="warning" sx={{ position: 'absolute', top: 16, left: 16, right: 64, zIndex: 1 }}>
                    {videoPlaybackError}
                  </Alert>
                )}
                <Box
                  component="video"
                  key={latestVideo.videoUrl}
                  src={latestVideo.videoUrl}
                  controls
                  preload="metadata"
                  playsInline
                  onError={() =>
                    setVideoPlaybackError(
                      'Video failed to load. Try refreshing the page or downloading the file.'
                    )
                  }
                  sx={{ width: '100%', height: '100%', borderRadius: 2 }}
                />
                <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
                  <Tooltip title="Download">
                    <IconButton
                      sx={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                      onClick={() => handleDownload(latestVideo)}
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No walkthrough generated yet
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleGenerate}
                  disabled={generatingRoomId === activeRoom?.id}
                >
                  {generatingRoomId === activeRoom?.id ? 'Generating...' : 'Generate Walkthrough'}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Status
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip
                label={latestVideo ? 'Generated' : 'Not generated'}
                size="small"
                color={latestVideo ? 'success' : 'default'}
                variant={latestVideo ? 'filled' : 'outlined'}
              />
              {latestVideo && (
                <Chip
                  label={`${latestVideo.resolution} · ${latestVideo.duration}s`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            <Button
              fullWidth
              variant="contained"
              startIcon={generatingRoomId === activeRoom?.id ? <CircularProgress size={16} /> : <Refresh />}
              onClick={handleGenerate}
              disabled={generatingRoomId === activeRoom?.id}
            >
              {generatingRoomId === activeRoom?.id ? 'Generating...' : 'Generate Walkthrough'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
