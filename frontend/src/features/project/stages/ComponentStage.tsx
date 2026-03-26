'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAccessToken } from '@/lib/auth-client';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from '@mui/material';
import { Download, AutoAwesome, ShoppingCart, Receipt } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { selectRooms } from '@/store/projectSlice';
import { getRooms } from '@/lib/actions/project';
import type { Room } from '@/types/room';
import { getApiBase } from '@/lib/api-base';
import {
  getProjectComponents,
  triggerComponentExtraction,
  type RoomComponentTable,
} from '@/lib/actions/component-extraction';
import { getJobs } from '@/lib/actions/ai-job';
import { getProjectComponentOrders } from '@/lib/actions/component-orders';

interface ComponentStageProps {
  projectId: string;
  projectSlug?: string;
}

function formatInrCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** Renders `**bold**` segments as <strong> (used for approximate size emphasis). */
function renderApproximateSizeText(text: string): ReactNode {
  if (!text.includes('**')) return text;
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    parts.push(<strong key={key++}>{m[1]}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts.length > 0 ? <>{parts}</> : text;
}

export function ComponentStage({ projectId, projectSlug }: ComponentStageProps) {
  const router = useRouter();
  const rooms = useAppSelector(selectRooms);
  // Removed useAuth
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [roomTables, setRoomTables] = useState<RoomComponentTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingRoomIds, setGeneratingRoomIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [roomOrderIds, setRoomOrderIds] = useState<Map<string, string>>(new Map());

  const selectedRoomTable = useMemo(
    () => roomTables.find((table) => table.roomId === selectedRoomId) || null,
    [roomTables, selectedRoomId]
  );

  useEffect(() => {
    if (rooms.length > 0) {
      setRoomList(rooms);
    }
  }, [rooms]);

  useEffect(() => {
    if (rooms.length === 0) {
      getRooms(projectId).then((fetchedRooms) => {
        if (fetchedRooms.length > 0) {
          setRoomList(fetchedRooms);
        }
      });
    }
  }, [projectId, rooms.length]);

  useEffect(() => {
    if (!selectedRoomId && roomList.length > 0) {
      setSelectedRoomId(roomList[0].id);
    }
  }, [roomList, selectedRoomId]);

  /**
   * Load component tables. Use `silent: true` for background polls so the page does not
   * flash the full-screen spinner every few seconds while extraction jobs run.
   */
  const loadComponents = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    const result = await getProjectComponents(projectId);
    if (!result.success) {
      setError(result.error || 'Failed to load components');
      if (!silent) setLoading(false);
      return;
    }
    setRoomTables(result.data?.rooms || []);
    setError(null);
    if (!silent) setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  useEffect(() => {
    getProjectComponentOrders(projectId).then((res) => {
      if (res.success && res.data.length > 0) {
        const latestByRoom = new Map<string, string>();
        for (const o of res.data) {
          if (!latestByRoom.has(o.roomId)) latestByRoom.set(o.roomId, o.orderId);
        }
        setRoomOrderIds(latestByRoom);
      }
    });
  }, [projectId]);

  const syncActiveComponentJobs = useCallback(async () => {
    const jobs = await getJobs({ projectId, type: 'COMPONENT_EXTRACTION', limit: 50 });
    const activeRoomIds = new Set<string>();
    for (const job of jobs.data || []) {
      if (job.status === 'QUEUED' || job.status === 'PROCESSING') {
        const payload = job.payload as { roomId?: string };
        if (payload?.roomId) {
          activeRoomIds.add(payload.roomId);
        }
      }
    }
    setGeneratingRoomIds(activeRoomIds);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    syncActiveComponentJobs();
  }, [projectId, syncActiveComponentJobs]);

  // While any room has QUEUED/PROCESSING extraction, poll quietly (no full-page loading).
  const POLL_MS = 12_000;
  useEffect(() => {
    if (generatingRoomIds.size === 0) return;

    const interval = setInterval(async () => {
      await syncActiveComponentJobs();
      await loadComponents({ silent: true });
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [generatingRoomIds.size, loadComponents, syncActiveComponentJobs]);

  const handleGenerateRoom = async (roomId: string) => {
    setGeneratingRoomIds((prev) => new Set(prev).add(roomId));
    const result = await triggerComponentExtraction(projectId, roomId);
    if (!result.success) {
      setError(result.error || 'Failed to start extraction');
      setGeneratingRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
      return;
    }
  };

  const handleGenerateAll = async () => {
    const roomIdsToGenerate = roomList
      .filter((room) => room && !roomTables.find((table) => table.roomId === room.id))
      .map((r) => r.id);
    if (roomIdsToGenerate.length === 0) return;
    setGeneratingAll(true);
    setGeneratingRoomIds((prev) => {
      const next = new Set(prev);
      roomIdsToGenerate.forEach((id) => next.add(id));
      return next;
    });
    for (const roomId of roomIdsToGenerate) {
      const result = await triggerComponentExtraction(projectId, roomId);
      if (!result.success) {
        setError(result.error || 'Failed to start extraction');
        setGeneratingRoomIds((prev) => {
          const next = new Set(prev);
          roomIdsToGenerate.forEach((id) => next.delete(id));
          return next;
        });
        setGeneratingAll(false);
        return;
      }
    }
    setGeneratingAll(false);
  };

  const downloadFile = async (format: 'csv' | 'xlsx') => {
    try {
      const apiBase = getApiBase();
      const token = getAccessToken();
      const response = await fetch(`${apiBase}/api/projects/${projectId}/components?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `components-${projectId}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError((downloadError as Error).message);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex' }}>
      <Box sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Component & Material Extraction
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Room-wise component tables derived from moodboards, elevations, and 2D views
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {projectSlug && selectedRoomId && (
              <>
                {roomOrderIds.has(selectedRoomId) ? (
                  <Button
                    variant="contained"
                    startIcon={<Receipt />}
                    onClick={() =>
                      router.push(
                        `/project/${projectSlug}/components/checkout/success?orderId=${roomOrderIds.get(selectedRoomId)}&projectId=${projectId}`
                      )
                    }
                    sx={{
                      bgcolor: '#22c55e',
                      color: '#fff',
                      '&:hover': { bgcolor: '#16a34a' },
                    }}
                  >
                    View Receipt
                  </Button>
                ) : (
                  selectedRoomTable &&
                  selectedRoomTable.rows.length > 0 && (
                    <Button
                      variant="contained"
                      startIcon={<ShoppingCart />}
                      onClick={() =>
                        router.push(`/project/${projectSlug}/components/checkout?roomId=${selectedRoomTable.roomId}`)
                      }
                      sx={{
                        background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)',
                        color: '#fff',
                        '&:hover': { background: 'linear-gradient(90deg, #7e22ce 0%, #a855f7 100%)' },
                      }}
                    >
                      Order from Room
                    </Button>
                  )
                )}
              </>
            )}
            <Button variant="outlined" startIcon={<Download />} onClick={() => downloadFile('csv')}>
              Download CSV
            </Button>
            <Button variant="outlined" startIcon={<Download />} onClick={() => downloadFile('xlsx')}>
              Download Excel
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          {roomList.map((room) => (
            <Chip
              key={room.id}
              label={
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {room.name}
                  {roomOrderIds.has(room.id) && (
                    <Box
                      component="span"
                      sx={{
                        fontSize: '0.65rem',
                        bgcolor: 'rgba(34, 197, 94, 0.3)',
                        color: '#22c55e',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 1,
                      }}
                    >
                      Ordered
                    </Box>
                  )}
                </Box>
              }
              onClick={() => setSelectedRoomId(room.id)}
              color={selectedRoomId === room.id ? 'primary' : 'default'}
              variant={selectedRoomId === room.id ? 'filled' : 'outlined'}
              icon={generatingRoomIds.has(room.id) ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AutoAwesome />}
            onClick={() => selectedRoomId && handleGenerateRoom(selectedRoomId)}
            disabled={!selectedRoomId || generatingRoomIds.has(selectedRoomId)}
          >
            {selectedRoomId && generatingRoomIds.has(selectedRoomId)
              ? 'Generating...'
              : 'Generate for Room'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleGenerateAll}
            disabled={generatingAll || roomList.length === 0}
          >
            {generatingAll ? 'Generating All...' : 'Generate All Rooms'}
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : roomList.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No rooms found for this project yet.
            </Typography>
          </Paper>
        ) : !selectedRoomTable ? (
          <Paper sx={{ p: 3 }}>
            {selectedRoomId && generatingRoomIds.has(selectedRoomId) ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Extracting components for this room...
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No component extraction found for this room yet.
              </Typography>
            )}
          </Paper>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {selectedRoomTable.roomType ? (
                <>
                  Room type: <strong>{selectedRoomTable.roomType.replace(/_/g, ' ')}</strong>.{' '}
                </>
              ) : null}
              Tables combine{' '}
              <strong>visual component extraction</strong> (materials, placement, sizes) with optional{' '}
              <strong>BOQ-style costs</strong> (material + labour). Areas are shown in <strong>sq ft</strong>{' '}
              first; furniture uses <strong>ft / in</strong> where applicable—derived from plan + renders, all{' '}
              <strong>approximate</strong>; verify on site before ordering or fabrication.
            </Typography>
            <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Component Category</TableCell>
                  <TableCell>Component Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Material</TableCell>
                  <TableCell>Finish / Color</TableCell>
                  <TableCell>Approx. size (sq ft / ft)</TableCell>
                  <TableCell>Placement</TableCell>
                  <TableCell>Material (₹)</TableCell>
                  <TableCell>Labour (₹)</TableCell>
                  <TableCell>Total (₹)</TableCell>
                  <TableCell>Calculation</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(selectedRoomTable.rows || []).map((row, index) => (
                  <TableRow key={`${row.componentName}-${index}`}>
                    <TableCell>{row.componentCategory}</TableCell>
                    <TableCell>{row.componentName}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.material}</TableCell>
                    <TableCell>{row.finishColor}</TableCell>
                    <TableCell>{renderApproximateSizeText(row.approximateSize)}</TableCell>
                    <TableCell>{row.placement}</TableCell>
                    <TableCell>{formatInrCell(row.materialCost)}</TableCell>
                    <TableCell>{formatInrCell(row.labourCost)}</TableCell>
                    <TableCell>{formatInrCell(row.totalCost)}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>{row.calculation || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>{row.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </Box>
  );
}

