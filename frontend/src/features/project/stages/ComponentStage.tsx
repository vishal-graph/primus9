'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
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
import { Download, AutoAwesome } from '@mui/icons-material';
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

interface ComponentStageProps {
  projectId: string;
}

export function ComponentStage({ projectId }: ComponentStageProps) {
  const rooms = useAppSelector(selectRooms);
  const { getToken } = useAuth();
  const [roomList, setRoomList] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [roomTables, setRoomTables] = useState<RoomComponentTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingRoomIds, setGeneratingRoomIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);

  const renderBuyLinks = (
    links: RoomComponentTable['rows'][number]['suggestedBuyLinks']
  ) => {
    if (Array.isArray(links)) {
      return links.map((link, index) => (
        <Box key={`${link.url}-${index}`}>
          <a href={link.url} target="_blank" rel="noreferrer">
            {link.label || link.url}
          </a>
          {link.note ? ` (${link.note})` : ''}
        </Box>
      ));
    }

    if (!links) return null;

    return String(links)
      .split('|')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry, index) => {
        const urlMatch = entry.match(/https?:\/\/\S+/);
        const url = urlMatch?.[0] || '';
        const label = url ? entry.replace(url, '').replace(/[-–|]/g, '').trim() : entry;
        return (
          <Box key={`${url || entry}-${index}`}>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer">
                {label || url}
              </a>
            ) : (
              label
            )}
          </Box>
        );
      });
  };

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

  const loadComponents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getProjectComponents(projectId);
    if (!result.success) {
      setError(result.error || 'Failed to load components');
      setLoading(false);
      return;
    }
    setRoomTables(result.data?.rooms || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

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

  useEffect(() => {
    if (generatingRoomIds.size === 0) return;

    const interval = setInterval(async () => {
      await syncActiveComponentJobs();
      await loadComponents();
    }, 8000);

    return () => clearInterval(interval);
  }, [generatingRoomIds.size, loadComponents, projectId, syncActiveComponentJobs]);

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
      const token = await getToken();
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
              label={room.name}
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
              Buy links are AI-suggested (no live search). Use as best-match references.
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
                  <TableCell>Approx Size</TableCell>
                  <TableCell>Placement</TableCell>
                  <TableCell>Wall Location</TableCell>
                  <TableCell>Suggested Buy Links</TableCell>
                  <TableCell>Confidence</TableCell>
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
                    <TableCell>{row.approximateSize}</TableCell>
                    <TableCell>{row.placement}</TableCell>
                    <TableCell>{row.wallLocation}</TableCell>
                    <TableCell>{renderBuyLinks(row.suggestedBuyLinks)}</TableCell>
                    <TableCell>{row.confidence}</TableCell>
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

