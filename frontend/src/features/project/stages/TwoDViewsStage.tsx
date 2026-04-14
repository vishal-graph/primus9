/**
 * TatvaOps Vision - 3D Views Stage
 *
 * Single corner bird's-eye view per room (~280–300° from one corner; moodboard primary, elevation secondary).
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
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Refresh, ZoomIn, Download, CheckCircle } from '@mui/icons-material';
import { getProjectData } from '@/lib/actions/floor-plan';
import {
  getProject2DViews,
  triggerRoom2DViewsGeneration,
  getActiveTwoDViewsJobs,
  Room2DView,
} from '@/lib/actions/two-d-views';
import { triggerComponentExtraction } from '@/lib/actions/component-extraction';
import { getJobs } from '@/lib/actions/ai-job';
import {
  TwoDViewsShoppableOverlay,
  parseShoppableHotspots,
} from './TwoDViewsShoppableOverlay';

interface TwoDViewsStageProps {
  projectId: string;
  projectSlug?: string;
  onStageChange?: (stage: string) => void;
}

/** Any BIRD_VIEW exists (for tabs / generate-all). */
function roomHasBirdView(views: Room2DView[]): boolean {
  return views.some((v) => v.viewType === 'BIRD_VIEW');
}

function birdViewsDescending(views: Room2DView[]): Room2DView[] {
  return views
    .filter((v) => v.viewType === 'BIRD_VIEW')
    .sort((a, b) => b.version - a.version);
}

export function TwoDViewsStage({ projectId, onStageChange }: TwoDViewsStageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [viewsByRoom, setViewsByRoom] = useState<Record<string, Room2DView[]>>({});
  const [generatingRoomId, setGeneratingRoomId] = useState<string | null>(null);
  const [generatingRoomIds, setGeneratingRoomIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [showProductTags, setShowProductTags] = useState(true);
  /** Rooms with in-flight COMPONENT_EXTRACTION jobs (maps catalog → bird-view dots). */
  const [priceTagExtractionRoomIds, setPriceTagExtractionRoomIds] = useState<Set<string>>(
    () => new Set()
  );
  /** null = show latest version for that room */
  const [pickedBirdVersion, setPickedBirdVersion] = useState<number | null>(null);
  const wasGeneratingThisRoomRef = useRef(false);
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
  const birdViews = useMemo(() => birdViewsDescending(roomViews), [roomViews]);
  const maxBirdVersion = birdViews[0]?.version ?? 0;
  const effectiveVersion = pickedBirdVersion ?? maxBirdVersion;
  const activeView =
    birdViews.find((v) => v.version === effectiveVersion) ?? birdViews[0];
  const shoppableHotspots = activeView
    ? parseShoppableHotspots(activeView.metadata ?? null)
    : [];
  const hotspotsSource =
    activeView?.metadata && typeof activeView.metadata === 'object'
      ? String((activeView.metadata as Record<string, unknown>).hotspotsSource || '')
      : '';
  const priceTagDiagRaw =
    activeView?.metadata && typeof activeView.metadata === 'object'
      ? (activeView.metadata as Record<string, unknown>).priceTagDiagnostics
      : null;
  const priceTagDiagMessage =
    priceTagDiagRaw &&
    typeof priceTagDiagRaw === 'object' &&
    typeof (priceTagDiagRaw as Record<string, unknown>).message === 'string'
      ? String((priceTagDiagRaw as Record<string, unknown>).message)
      : null;

  const syncPriceTagExtractionJobs = useCallback(async () => {
    const jobs = await getJobs({ projectId, type: 'COMPONENT_EXTRACTION', limit: 50 });
    const activeRoomIds = new Set<string>();
    for (const job of jobs.data || []) {
      if (job.status === 'QUEUED' || job.status === 'PROCESSING') {
        const payload = job.payload as { roomId?: string };
        if (payload?.roomId) activeRoomIds.add(payload.roomId);
      }
    }
    setPriceTagExtractionRoomIds(activeRoomIds);
  }, [projectId]);

  useEffect(() => {
    void syncPriceTagExtractionJobs();
  }, [projectId, syncPriceTagExtractionJobs]);

  useEffect(() => {
    setPickedBirdVersion(null);
  }, [activeRoom?.id]);

  useEffect(() => {
    if (
      pickedBirdVersion != null &&
      !birdViews.some((v) => v.version === pickedBirdVersion)
    ) {
      setPickedBirdVersion(null);
    }
  }, [birdViews, pickedBirdVersion]);

  useEffect(() => {
    const generating = Boolean(activeRoom && generatingRoomId === activeRoom.id);
    if (wasGeneratingThisRoomRef.current && !generating) {
      setPickedBirdVersion(null);
    }
    wasGeneratingThisRoomRef.current = generating;
  }, [generatingRoomId, activeRoom?.id]);

  const completedRoomIds = rooms
    .filter((room) => roomHasBirdView(viewsByRoom[room.id] || []))
    .map((r) => r.id);

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

  /** Poll while component extraction may be updating bird-view metadata. */
  useEffect(() => {
    if (priceTagExtractionRoomIds.size === 0) return;
    const t = setInterval(async () => {
      await syncPriceTagExtractionJobs();
      await loadAllViews();
    }, 12_000);
    return () => clearInterval(t);
  }, [priceTagExtractionRoomIds.size, syncPriceTagExtractionJobs, loadAllViews]);

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

  const handleGeneratePriceTags = async () => {
    if (!activeRoom) return;
    setError(null);
    setPriceTagExtractionRoomIds((prev) => new Set(prev).add(activeRoom.id));
    const res = await triggerComponentExtraction(projectId, activeRoom.id);
    if (!res.success) {
      setPriceTagExtractionRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(activeRoom.id);
        return next;
      });
      setError(res.error || 'Failed to start component extraction');
      return;
    }
    void syncPriceTagExtractionJobs();
  };

  const handleGenerateAll = async () => {
    if (!rooms.length) return;
    setError(null);
    setGeneratingAll(true);
    try {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      for (const room of rooms) {
        const hasView = roomHasBirdView(viewsByRoom[room.id] || []);
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
      link.download = `${activeRoom?.name || 'room'}-bird-view-v${view.version}.jpg`;
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
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
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

      <Paper
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, bgcolor: 'background.paper' }}
      >
        <Tabs
          value={activeRoomIndex}
          onChange={(_, newValue) => setActiveRoomIndex(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {rooms.map((room) => {
            const isComplete = completedRoomIds.includes(room.id);
            const isGenerating = generatingRoomIds.has(room.id);
            const isPriceTagBusy = priceTagExtractionRoomIds.has(room.id);
            return (
              <Tab
                key={room.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isGenerating || isPriceTagBusy ? (
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
            sx={(theme) => ({
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              minHeight: 480,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor:
                theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.06)
                  : theme.palette.grey[100],
              position: 'relative',
            })}
          >
            {activeView ? (
              <>
                <Box sx={{ width: '100%', p: 2, position: 'relative' }}>
                  <TwoDViewsShoppableOverlay
                    hotspots={shoppableHotspots}
                    showTags={showProductTags}
                    onNavigateToBreakdown={() => onStageChange?.('component')}
                  >
                    <Box
                      component="img"
                      src={activeView.imageUrl}
                      alt={`${activeRoom?.name} bird's-eye view`}
                      sx={{ width: '100%', height: 'auto', maxHeight: 'min(70vh, 720px)', objectFit: 'contain' }}
                    />
                  </TwoDViewsShoppableOverlay>
                </Box>
                <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1 }}>
                  <Tooltip title="View full size">
                    <IconButton
                      sx={(theme) => ({
                        bgcolor: alpha(theme.palette.background.paper, 0.92),
                        boxShadow: 1,
                        '&:hover': { bgcolor: theme.palette.background.paper },
                      })}
                    >
                      <ZoomIn />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton
                      sx={(theme) => ({
                        bgcolor: alpha(theme.palette.background.paper, 0.92),
                        boxShadow: 1,
                        '&:hover': { bgcolor: theme.palette.background.paper },
                      })}
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
          <Paper
            elevation={0}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, bgcolor: 'background.paper' }}
          >
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Status
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {activeView
                  ? birdViews.length > 1
                    ? `Viewing version ${activeView.version} of ${maxBirdVersion}. Regenerate adds a new version.`
                    : 'Bird\'s-eye view generated for this room. Regenerate creates version history.'
                  : 'Generate a corner bird\'s-eye view for this room.'}
              </Typography>
              {birdViews.length > 1 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Version
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={effectiveVersion}
                    onChange={(_, v) => {
                      if (v != null) setPickedBirdVersion(v);
                    }}
                    sx={{ flexWrap: 'wrap', gap: 0.5 }}
                  >
                    {birdViews
                      .slice()
                      .sort((a, b) => a.version - b.version)
                      .map((v) => (
                        <ToggleButton key={v.id} value={v.version} sx={{ textTransform: 'none' }}>
                          v{v.version}
                          {v.version === maxBirdVersion ? ' (latest)' : ''}
                        </ToggleButton>
                      ))}
                  </ToggleButtonGroup>
                </Box>
              )}
              {activeView && shoppableHotspots.length > 0 && (
                <>
                  {hotspotsSource === 'component_extraction' && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                      Tags mapped from component extraction + catalog (re-run below to refresh).
                    </Typography>
                  )}
                  {hotspotsSource === 'two_d_views' && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Tags from bird-view generation (moodboard catalog). Use extraction to refine.
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Hover or click dots to view product details, dynamic price, and quick CTAs.
                  </Typography>
                  <FormControlLabel
                    sx={{ mt: 1, mb: 0.5 }}
                    control={
                      <Switch
                        size="small"
                        checked={showProductTags}
                        onChange={(_, checked) => setShowProductTags(checked)}
                      />
                    }
                    label="Show product tags"
                  />
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onStageChange?.('component')}
                    sx={{ textTransform: 'none', px: 0 }}
                  >
                    View full room breakdown
                  </Button>
                </>
              )}
              {activeView && shoppableHotspots.length === 0 && priceTagDiagMessage && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Last price-tag run did not produce dots on this image
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {priceTagDiagMessage}
                  </Typography>
                </Alert>
              )}
              {activeView && shoppableHotspots.length === 0 && (
                <Box
                  sx={(theme) => ({
                    mt: 1.5,
                    p: 1.5,
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    bgcolor:
                      theme.palette.mode === 'dark'
                        ? alpha(theme.palette.primary.main, 0.12)
                        : alpha(theme.palette.primary.main, 0.06),
                  })}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Product tags need catalog-backed mapping on this image. Run component extraction here
                    to link extracted items to your moodboard catalog SKUs and place hover dots.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleGeneratePriceTags}
                      disabled={priceTagExtractionRoomIds.has(activeRoom.id)}
                      sx={{ textTransform: 'none' }}
                    >
                      {priceTagExtractionRoomIds.has(activeRoom.id)
                        ? 'Mapping…'
                        : 'Generate price tags'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onStageChange?.('component')}
                      sx={{ textTransform: 'none' }}
                    >
                      Room breakdown
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      onClick={handleGenerate}
                      disabled={generatingRoomId === activeRoom?.id}
                      sx={{ textTransform: 'none' }}
                    >
                      {generatingRoomId === activeRoom?.id ? 'Regenerating...' : 'Regenerate view'}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
            {activeView && (
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={
                  generatingRoomId === activeRoom?.id ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Refresh />
                  )
                }
                onClick={handleGenerate}
                disabled={generatingRoomId === activeRoom?.id}
                sx={{ mb: 1, textTransform: 'none' }}
              >
                {generatingRoomId === activeRoom?.id
                  ? 'Regenerating...'
                  : 'Regenerate (new version)'}
              </Button>
            )}
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
