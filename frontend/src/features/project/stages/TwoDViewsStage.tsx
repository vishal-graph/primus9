/**
 * TatvaOps Vision - 3D Views Stage
 *
 * Single corner bird's-eye view per room (~280–300° from one corner; moodboard primary, elevation secondary).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
} from '@mui/material';
import { Refresh, ZoomIn, Download, CheckCircle } from '@mui/icons-material';
import { getProjectData } from '@/lib/actions/floor-plan';
import {
  getProject2DViews,
  triggerRoom2DViewsGeneration,
  getActiveTwoDViewsJobs,
  Room2DView,
} from '@/lib/actions/two-d-views';

interface TwoDViewsStageProps {
  projectId: string;
  onStageChange?: (stage: string) => void;
}

/** One design per room: prefer BIRD_VIEW; if multiple BIRD_VIEWs, use latest by version. Fallback to latest view for legacy data. */
function getSingleViewForRoom(views: Room2DView[]): Room2DView | undefined {
  const birdViews = views.filter((v) => v.viewType === 'BIRD_VIEW');
  if (birdViews.length > 0) {
    return birdViews.reduce((a, b) => (a.version >= b.version ? a : b));
  }
  if (views.length === 0) return undefined;
  return views.reduce((a, b) => (a.version >= b.version ? a : b));
}

export function TwoDViewsStage({ projectId }: TwoDViewsStageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [viewsByRoom, setViewsByRoom] = useState<Record<string, Room2DView[]>>({});
  const [generatingRoomId, setGeneratingRoomId] = useState<string | null>(null);
  const [generatingRoomIds, setGeneratingRoomIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const loadRooms = useCallback(async () => {
    const result = await getProjectData(projectId);
    if (result.success && result.data) {
      setRooms(result.data.rooms || []);
    }
  }, [projectId]);

  const loadAllViews = useCallback(async () => {
    const result = await getProject2DViews(projectId);
    if (result.success) {
      const grouped: Record<string, Room2DView[]> = {};
      (result.views || []).forEach((view) => {
        if (!grouped[view.roomId]) grouped[view.roomId] = [];
        grouped[view.roomId].push(view);
      });
      setViewsByRoom(grouped);
    } else {
      setError(result.error || 'Failed to load 2D views');
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
    if (rooms.length === 0) return;
    loadAllViews();
  }, [rooms, loadAllViews]);

  const activeRoom = rooms[activeRoomIndex];
  const roomViews = activeRoom ? viewsByRoom[activeRoom.id] || [] : [];
  const activeView = getSingleViewForRoom(roomViews);

  const completedRoomIds = rooms.filter((room) =>
    getSingleViewForRoom(viewsByRoom[room.id] || [])
  ).map((r) => r.id);

  const startPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    pollRef.current = setInterval(async () => {
      const result = await getActiveTwoDViewsJobs(projectId);
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
        await loadAllViews();
      } else if (result.error?.includes('rate')) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }, 15000);
  }, [projectId, activeRoom?.id, loadAllViews]);

  useEffect(() => {
    if (!rooms.length) return;
    let isMounted = true;
    const checkActiveJobs = async () => {
      const result = await getActiveTwoDViewsJobs(projectId);
      if (!isMounted || !result.success) return;
      const roomIds = new Set(
        (result.jobs || []).map((j: any) => j?.payload?.roomId || j?.roomId).filter(Boolean)
      );
      setGeneratingRoomIds(roomIds);
      if (activeRoom?.id && roomIds.has(activeRoom.id)) setGeneratingRoomId(activeRoom.id);
      else if (activeRoom?.id && !roomIds.has(activeRoom.id)) setGeneratingRoomId(null);
      await loadAllViews();
    };
    checkActiveJobs();
    return () => {
      isMounted = false;
    };
  }, [projectId, rooms.length, activeRoom?.id, loadAllViews]);

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
    const result = await triggerRoom2DViewsGeneration(projectId, activeRoom.id);
    if (!result.success) {
      setGeneratingRoomId(null);
      setGeneratingRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(activeRoom.id);
        return next;
      });
      setError(result.error || 'Failed to start generation');
      return;
    }
    startPolling();
  };

  const handleGenerateAll = async () => {
    if (!rooms.length) return;
    setError(null);
    setGeneratingAll(true);
    try {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      for (const room of rooms) {
        const hasView = getSingleViewForRoom(viewsByRoom[room.id] || []);
        if (hasView) continue;
        setGeneratingRoomIds((prev) => new Set(prev).add(room.id));
        const result = await triggerRoom2DViewsGeneration(projectId, room.id);
        if (!result.success) {
          setGeneratingRoomIds((prev) => {
            const next = new Set(prev);
            next.delete(room.id);
            return next;
          });
          setError(result.error || `Failed to start generation for ${room.name}`);
          if (result.error?.toLowerCase().includes('too many requests')) break;
          break;
        }
        await delay(500);
      }
    } finally {
      setGeneratingAll(false);
      startPolling();
    }
  };

  const handleDownload = async (view: Room2DView) => {
    try {
      const response = await fetch(view.imageUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeRoom?.name || 'room'}-bird-view.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download image');
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
          Complete floor plan analysis to enable 2D views.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          3D Views
        </Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Corner bird&apos;s-eye view of each room (~280–300°) — moodboard primary, elevation secondary
          </Typography>
          <Button
            variant="contained"
            onClick={handleGenerateAll}
            disabled={generatingAll}
            sx={{ textTransform: 'none' }}
          >
            {generatingAll ? 'Queueing...' : 'Generate All Rooms'}
          </Button>
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
            {activeView ? (
              <>
                <Box
                  component="img"
                  src={activeView.imageUrl}
                  alt={`${activeRoom?.name} bird's-eye view`}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 2 }}
                />
                <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
                  <Tooltip title="View full size">
                    <IconButton sx={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
                      <ZoomIn />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton
                      sx={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                      onClick={() => handleDownload(activeView)}
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No bird&apos;s-eye view generated yet
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleGenerate}
                  disabled={generatingRoomId === activeRoom?.id}
                >
                  {generatingRoomId === activeRoom?.id ? 'Generating...' : 'Generate Bird\'s-Eye View'}
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
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {activeView
                  ? 'Bird\'s-eye view generated for this room.'
                  : 'Generate a corner bird\'s-eye view for this room.'}
              </Typography>
            </Box>
            {!activeView && (
              <Button
                fullWidth
                variant="contained"
                startIcon={
                  generatingRoomId === activeRoom?.id ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Refresh />
                  )
                }
                onClick={handleGenerate}
                disabled={generatingRoomId === activeRoom?.id}
              >
                {generatingRoomId === activeRoom?.id
                  ? 'Generating...'
                  : 'Generate Bird\'s-Eye View'}
              </Button>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
