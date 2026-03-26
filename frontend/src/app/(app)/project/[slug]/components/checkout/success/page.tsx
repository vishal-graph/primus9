'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Receipt } from '@mui/icons-material';
import { getComponentOrder } from '@/lib/actions/component-orders';
import { getProject } from '@/lib/actions/project';
import type { ComponentOrderReceipt } from '@/lib/actions/component-orders';

function formatInr(value: unknown): string {
  if (value === null || value === undefined || value === '') return '₹0';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '₹0';
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ComponentCheckoutSuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <ComponentCheckoutSuccessContent />
    </Suspense>
  );
}

function SuccessFallback() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f0f12' }}>
      <CircularProgress sx={{ color: '#a855f7' }} />
    </Box>
  );
}

function ComponentCheckoutSuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const orderId = searchParams.get('orderId') || '';
  const projectId = searchParams.get('projectId') || '';

  const [order, setOrder] = useState<ComponentOrderReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      let pid = projectId;
      if (!pid && slug) {
        const proj = await getProject(slug);
        pid = proj?.id;
      }
      if (!pid) {
        setError('Project not found');
        setLoading(false);
        return;
      }
      const res = await getComponentOrder(pid, orderId);
      if (res.success) setOrder(res.data);
      else setError(res.error);
    };
    load().catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }, [orderId, projectId, slug]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f0f12' }}>
        <CircularProgress sx={{ color: '#a855f7' }} />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ bgcolor: '#0f0f12', minHeight: '100vh', py: 8 }}>
        <Container maxWidth="sm">
          <Typography sx={{ color: '#ef4444', mb: 2 }}>{error || 'Order not found'}</Typography>
          <Button component={Link} href={`/project/${slug}/components`} variant="contained">
            Back to Components
          </Button>
        </Container>
      </Box>
    );
  }

  const items = order.items || [];

  return (
    <Box sx={{ bgcolor: '#0f0f12', color: '#fafafa', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        {/* Receipt card */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(24, 24, 27, 0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box sx={{ p: 3, textAlign: 'center', borderBottom: '1px solid rgba(63,63,70,0.5)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <CheckCircle sx={{ color: '#22c55e', fontSize: 28 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>
                Request Placed Successfully
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Receipt sx={{ color: '#a855f7', fontSize: 20 }} />
              <Typography sx={{ color: '#9ca3af', fontSize: '0.875rem' }}>Order Receipt</Typography>
            </Box>
          </Box>

          {/* Order info */}
          <Box sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.2)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Project</Typography>
                <Typography sx={{ fontWeight: 600, color: '#fff' }}>{order.projectName}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Room</Typography>
                <Typography sx={{ fontWeight: 600, color: '#a855f7' }}>{order.roomName}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Order ID</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#9ca3af' }}>{order.orderId}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Date</Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#9ca3af' }}>{formatDate(order.createdAt)}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Items table */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(63,63,70,0.3)' }}>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem' }}>Component</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem' }}>Material</TableCell>
                  <TableCell sx={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem' }}>Size</TableCell>
                  <TableCell align="right" sx={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem' }}>Material ₹</TableCell>
                  <TableCell align="right" sx={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem' }}>Labour ₹</TableCell>
                  <TableCell align="right" sx={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.75rem' }}>Total ₹</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row: Record<string, unknown>, i: number) => (
                  <TableRow key={i} sx={{ borderColor: 'rgba(63,63,70,0.3)' }}>
                    <TableCell sx={{ color: '#e5e7eb', borderColor: 'rgba(63,63,70,0.3)' }}>
                      {String(row.componentName || '—')}
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '0.875rem', borderColor: 'rgba(63,63,70,0.3)' }}>
                      {String(row.material || '—')}
                    </TableCell>
                    <TableCell sx={{ color: '#9ca3af', fontSize: '0.875rem', borderColor: 'rgba(63,63,70,0.3)' }}>
                      {String(row.approximateSize || '—')}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#e5e7eb', borderColor: 'rgba(63,63,70,0.3)' }}>
                      {formatInr(row.materialCost)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#e5e7eb', borderColor: 'rgba(63,63,70,0.3)' }}>
                      {formatInr(row.labourCost)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#fff', fontWeight: 600, borderColor: 'rgba(63,63,70,0.3)' }}>
                      {formatInr(row.totalCost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totals */}
          <Box sx={{ p: 3, borderTop: '1px solid rgba(63,63,70,0.5)', bgcolor: 'rgba(0,0,0,0.2)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Box sx={{ minWidth: 220 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography sx={{ color: '#9ca3af' }}>Subtotal Material</Typography>
                  <Typography sx={{ color: '#e5e7eb' }}>{formatInr(order.totalMaterial)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography sx={{ color: '#9ca3af' }}>Subtotal Labour</Typography>
                  <Typography sx={{ color: '#e5e7eb' }}>{formatInr(order.totalLabour)}</Typography>
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.125rem' }}>Grand Total</Typography>
                  <Typography sx={{ fontWeight: 700, color: '#a855f7', fontSize: '1.25rem' }}>{formatInr(order.grandTotal)}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
          <Button
            component={Link}
            href={`/project/${slug}/components`}
            variant="contained"
            sx={{
              background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)',
              color: '#fff',
              '&:hover': { background: 'linear-gradient(90deg, #7e22ce 0%, #a855f7 100%)' },
            }}
          >
            Back to Components
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
