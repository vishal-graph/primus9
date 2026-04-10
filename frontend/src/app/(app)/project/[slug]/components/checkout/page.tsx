'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { ChevronRight, ShoppingCart } from '@mui/icons-material';
import { getProject } from '@/lib/actions/project';
import { getProjectComponents } from '@/lib/actions/component-extraction';
import { placeComponentOrder } from '@/lib/actions/component-orders';
import type { ComponentExtractionRow } from '@/lib/actions/component-extraction';
const glassCardSx = {
  background: 'rgba(24, 24, 27, 0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '1rem',
  p: 3,
  transition: 'border-color 0.3s ease',
  '&:hover': { borderColor: 'rgba(168, 85, 247, 0.3)' },
};

function formatInr(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function parseCost(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export default function ComponentCheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <ComponentCheckoutContent />
    </Suspense>
  );
}

function CheckoutFallback() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f0f12' }}>
      <CircularProgress sx={{ color: '#a855f7' }} />
    </Box>
  );
}

function ComponentCheckoutContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const roomId = searchParams.get('roomId') || '';

  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [items, setItems] = useState<ComponentExtractionRow[]>([]);
  const [roomName, setRoomName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactNotes, setContactNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!slug || !roomId) {
      setLoading(false);
      if (!roomId) setError('Room ID is required');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const proj = await getProject(slug);
        if (!proj) {
          setError('Project not found');
          setLoading(false);
          return;
        }
        setProject(proj);

        const result = await getProjectComponents(proj.id);
        if (!result.success || !result.data) {
          setError(result.error || 'Failed to load components');
          setLoading(false);
          return;
        }

        const roomTable = result.data.rooms.find((r) => r.roomId === roomId);
        if (!roomTable || !roomTable.rows.length) {
          setError('No components found for this room. Generate components first.');
          setLoading(false);
          return;
        }

        setRoomName(roomTable.roomName);
        setItems(roomTable.rows);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, roomId]);

  const totalMaterial = items.reduce((sum, r) => sum + parseCost(r.materialCost), 0);
  const totalLabour = items.reduce((sum, r) => sum + parseCost(r.labourCost), 0);
  const grandTotal = totalMaterial + totalLabour;

  const handlePlaceRequest = async () => {
    if (!project || items.length === 0) return;
    setPlacing(true);
    try {
      const result = await placeComponentOrder(project.id, roomId, items, {
        contactNotes: contactNotes.trim() || undefined,
      });
      if (result.success) {
        router.push(`/project/${slug}/components/checkout/success?orderId=${result.data.orderId}&projectId=${project.id}`);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f0f12' }}>
        <CircularProgress sx={{ color: '#a855f7' }} />
      </Box>
    );
  }

  if (error && (!project || items.length === 0)) {
    return (
      <Box sx={{ bgcolor: '#0f0f12', minHeight: '100vh', py: 8 }}>
        <Container maxWidth="sm">
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button component={Link} href={`/project/${slug}/components`}>
            Back to Components
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#0f0f12', color: '#fafafa', minHeight: '100vh' }}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '60%',
            background: 'rgba(88, 28, 135, 0.2)',
            borderRadius: '50%',
            filter: 'blur(120px)',
          }}
        />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 4, fontSize: '0.875rem', color: '#9ca3af' }}>
          <Box component={Link} href={`/project/${slug}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#c084fc' } }}>
            {project?.name || 'Project'}
          </Box>
          <ChevronRight sx={{ fontSize: '1rem', color: '#6b7280' }} />
          <Box component={Link} href={`/project/${slug}/components`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#c084fc' } }}>
            Components
          </Box>
          <ChevronRight sx={{ fontSize: '1rem', color: '#6b7280' }} />
          <Typography component="span" sx={{ color: '#a855f7' }}>Order Components</Typography>
          {roomName && (
            <>
              <ChevronRight sx={{ fontSize: '1rem', color: '#6b7280' }} />
              <Typography component="span" sx={{ color: '#fff', fontWeight: 600 }}>Room: {roomName}</Typography>
            </>
          )}
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>
          Request Quote
        </Typography>
        <Box sx={{ color: '#e5e7eb', fontSize: '1rem', mb: 3 }}>
          {project?.name}{' '}
          <Box component="span" sx={{ color: '#a855f7', fontWeight: 600 }}>— Room: {roomName}</Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          <Box>
            <Box sx={{ ...glassCardSx, mb: 2 }}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', mb: 2 }}>
                Order Summary
                {roomName && (
                  <Box component="span" sx={{ color: '#a855f7', fontWeight: 500, fontSize: '1rem', ml: 1 }}>
                    (Room: {roomName})
                  </Box>
                )}
              </Typography>
              <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ borderColor: '#3f3f46' }}>
                      <TableCell sx={{ color: '#9ca3af', fontWeight: 600, borderColor: '#3f3f46' }}>Component</TableCell>
                      <TableCell sx={{ color: '#9ca3af', fontWeight: 600, borderColor: '#3f3f46' }}>Material</TableCell>
                      <TableCell sx={{ color: '#9ca3af', fontWeight: 600, borderColor: '#3f3f46' }}>Finish</TableCell>
                      <TableCell sx={{ color: '#9ca3af', fontWeight: 600, borderColor: '#3f3f46' }}>Size</TableCell>
                      <TableCell sx={{ color: '#9ca3af', fontWeight: 600, borderColor: '#3f3f46' }}>Placement</TableCell>
                      <TableCell align="right" sx={{ color: '#9ca3af', fontWeight: 600, borderColor: '#3f3f46' }}>Material ₹</TableCell>
                      <TableCell align="right" sx={{ color: '#9ca3af', fontWeight: 600, borderColor: '#3f3f46' }}>Labour ₹</TableCell>
                      <TableCell align="right" sx={{ color: '#9ca3af', fontWeight: 600, borderColor: '#3f3f46' }}>Total ₹</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((row, i) => (
                      <TableRow key={i} sx={{ borderColor: '#27272a' }}>
                        <TableCell sx={{ color: '#e5e7eb', borderColor: '#3f3f46' }}>{row.componentName}</TableCell>
                        <TableCell sx={{ color: '#9ca3af', borderColor: '#3f3f46' }}>{row.material || '—'}</TableCell>
                        <TableCell sx={{ color: '#9ca3af', borderColor: '#3f3f46' }}>{row.finishColor || '—'}</TableCell>
                        <TableCell sx={{ color: '#9ca3af', borderColor: '#3f3f46' }}>{row.approximateSize || '—'}</TableCell>
                        <TableCell sx={{ color: '#9ca3af', borderColor: '#3f3f46' }}>{row.placement || '—'}</TableCell>
                        <TableCell align="right" sx={{ color: '#e5e7eb', borderColor: '#3f3f46' }}>{formatInr(row.materialCost)}</TableCell>
                        <TableCell align="right" sx={{ color: '#e5e7eb', borderColor: '#3f3f46' }}>{formatInr(row.labourCost)}</TableCell>
                        <TableCell align="right" sx={{ color: '#fff', fontWeight: 600, borderColor: '#3f3f46' }}>{formatInr(row.totalCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={glassCardSx}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: '#fff', mb: 2 }}>
                Contact notes (optional)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Delivery address, special instructions, etc."
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#18181b',
                    color: '#fff',
                    '& fieldset': { borderColor: '#3f3f46' },
                    '&:hover fieldset': { borderColor: '#52525b' },
                    '&.Mui-focused fieldset': { borderColor: '#a855f7' },
                  },
                }}
              />
            </Box>
          </Box>

          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 32 }, alignSelf: 'start' }}>
            <Box sx={glassCardSx}>
              {roomName && (
                <Box sx={{ fontSize: '0.875rem', color: '#a855f7', fontWeight: 600, mb: 1 }}>
                  Room: {roomName}
                </Box>
              )}
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', pb: 2, mb: 2, borderBottom: '1px solid #3f3f46' }}>
                Totals
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <Typography component="span">Subtotal Material</Typography>
                  <Typography component="span" sx={{ color: '#e5e7eb' }}>{formatInr(totalMaterial)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <Typography component="span">Subtotal Labour</Typography>
                  <Typography component="span" sx={{ color: '#e5e7eb' }}>{formatInr(totalLabour)}</Typography>
                </Box>
              </Box>
              <Box sx={{ borderTop: '1px dashed #52525b', pt: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 600, color: '#fff' }}>Grand Total</Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{formatInr(grandTotal)}</Typography>
                </Box>
              </Box>
              <Button
                fullWidth
                variant="contained"
                startIcon={<ShoppingCart />}
                disabled={placing}
                onClick={handlePlaceRequest}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)',
                  color: '#fff',
                  '&:hover': { background: 'linear-gradient(90deg, #7e22ce 0%, #a855f7 100%)' },
                }}
              >
                {placing ? 'Placing…' : 'Place Request'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
