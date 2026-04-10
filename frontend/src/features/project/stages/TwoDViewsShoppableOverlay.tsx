'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Button, Stack, Fade } from '@mui/material';
import { ArrowOutward } from '@mui/icons-material';
import {
  getCatalogProductPrice,
  type CatalogPricePayload,
} from '@/lib/actions/catalog-price';

export interface ShoppableHotspot {
  x: number;
  y: number;
  catalogTable: string;
  catalogId: string | number;
  label?: string;
}

export function parseShoppableHotspots(
  metadata?: Record<string, unknown> | null
): ShoppableHotspot[] {
  if (!metadata) return [];
  const raw = metadata.shoppableHotspots;
  if (!Array.isArray(raw)) return [];
  const out: ShoppableHotspot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const x = typeof o.x === 'number' ? o.x : parseFloat(String(o.x));
    const y = typeof o.y === 'number' ? o.y : parseFloat(String(o.y));
    const catalogTable = typeof o.catalogTable === 'string' ? o.catalogTable : '';
    const catalogId = o.catalogId;
    if (
      !catalogTable ||
      (typeof catalogId !== 'number' && typeof catalogId !== 'string') ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      continue;
    }
    out.push({
      x,
      y,
      catalogTable,
      catalogId,
      label: typeof o.label === 'string' ? o.label : undefined,
    });
  }
  return out;
}

function formatPrice(n: number | null, currency: string): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function TwoDViewsShoppableOverlay({
  hotspots,
  showTags,
  onNavigateToBreakdown,
  children,
}: {
  hotspots: ShoppableHotspot[];
  showTags: boolean;
  onNavigateToBreakdown?: () => void;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [payload, setPayload] = useState<CatalogPricePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [cardPosition, setCardPosition] = useState<{ left: number; top: number } | null>(null);
  const cacheRef = useRef<Map<string, CatalogPricePayload | null>>(new Map());
  const inflightRef = useRef<Map<string, Promise<CatalogPricePayload | null>>>(new Map());
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cacheKey = (h: ShoppableHotspot) => `${h.catalogTable}:${h.catalogId}`;
  const active = useMemo(
    () => (activeIndex == null ? null : hotspots[activeIndex] ?? null),
    [activeIndex, hotspots]
  );

  const clearTimers = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const closeCard = useCallback(() => {
    clearTimers();
    setActiveIndex(null);
    setPayload(null);
    setLoading(false);
    setRequestError(null);
    setCardPosition(null);
  }, [clearTimers]);

  const fetchPayload = useCallback(async (h: ShoppableHotspot): Promise<CatalogPricePayload | null> => {
    const key = cacheKey(h);
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key) ?? null;
    }
    const existing = inflightRef.current.get(key);
    if (existing) return existing;

    const promise = (async () => {
      const res = await getCatalogProductPrice(h.catalogTable, String(h.catalogId));
      if (res.success && res.data) {
        cacheRef.current.set(key, res.data);
        return res.data;
      }
      cacheRef.current.set(key, null);
      return null;
    })();
    inflightRef.current.set(key, promise);
    try {
      return await promise;
    } finally {
      inflightRef.current.delete(key);
    }
  }, []);

  const openFor = useCallback(
    async (index: number, h: ShoppableHotspot) => {
      clearTimers();
      setActiveIndex(index);
      setRequestError(null);
      const key = cacheKey(h);
      if (cacheRef.current.has(key)) {
        setPayload(cacheRef.current.get(key) ?? null);
        return;
      }
      setLoading(true);
      setPayload(null);
      const data = await fetchPayload(h);
      setLoading(false);
      if (data) {
        setPayload(data);
        return;
      }
      setRequestError('Unable to fetch product details');
      setPayload(null);
    },
    [clearTimers, fetchPayload]
  );

  const scheduleOpen = useCallback(
    (index: number, h: ShoppableHotspot) => {
      clearTimers();
      openTimer.current = setTimeout(() => {
        void openFor(index, h);
      }, 80);
    },
    [clearTimers, openFor]
  );

  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => {
      closeCard();
    }, 180);
  }, [clearTimers, closeCard]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCard();
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      clearTimers();
      window.removeEventListener('keydown', onEsc);
    };
  }, [clearTimers, closeCard]);

  useEffect(() => {
    if (!active || !rootRef.current) {
      setCardPosition(null);
      return;
    }
    const rootRect = rootRef.current.getBoundingClientRect();
    const cardRect = cardRef.current?.getBoundingClientRect();
    const hotspotLeft = (active.x / 100) * rootRect.width;
    const hotspotTop = (active.y / 100) * rootRect.height;
    const cardWidth = cardRect?.width ?? 292;
    const cardHeight = cardRect?.height ?? 166;
    const gap = 16;
    let left = hotspotLeft + gap;
    let top = hotspotTop - cardHeight - gap;

    if (left + cardWidth > rootRect.width - 8) {
      left = hotspotLeft - cardWidth - gap;
    }
    if (left < 8) {
      left = Math.max(8, Math.min(rootRect.width - cardWidth - 8, hotspotLeft - cardWidth / 2));
    }
    if (top < 8) {
      top = hotspotTop + gap;
    }
    if (top + cardHeight > rootRect.height - 8) {
      top = Math.max(8, rootRect.height - cardHeight - 8);
    }
    setCardPosition({ left, top });
  }, [active, payload, loading, requestError]);

  if (hotspots.length === 0) {
    return <>{children}</>;
  }

  return (
    <Box
      ref={rootRef}
      sx={{
        position: 'relative',
        width: '100%',
        display: 'block',
        '& > img': { display: 'block', width: '100%', height: 'auto', verticalAlign: 'top' },
      }}
    >
      {children}
      {showTags &&
        hotspots.map((h, i) => (
        <Box
          key={`${cacheKey(h)}-${i}`}
          component="button"
          type="button"
          onMouseEnter={() => scheduleOpen(i, h)}
          onClick={() => void openFor(i, h)}
          onMouseLeave={scheduleClose}
          onFocus={() => scheduleOpen(i, h)}
          onBlur={scheduleClose}
          sx={{
            position: 'absolute',
            left: `${h.x}%`,
            top: `${h.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.95)',
            backgroundColor: activeIndex === i ? 'rgba(39, 127, 255, 0.85)' : 'rgba(0,0,0,0.35)',
            cursor: 'pointer',
            p: 0,
            zIndex: activeIndex === i ? 4 : 2,
            opacity: activeIndex != null && activeIndex !== i ? 0.45 : 1,
            boxShadow:
              activeIndex === i
                ? '0 0 0 6px rgba(39,127,255,0.25), 0 8px 22px rgba(0,0,0,0.28)'
                : '0 1px 4px rgba(0,0,0,0.25)',
            transition: 'transform 0.15s, background-color 0.15s, box-shadow 0.2s, opacity 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.55)',
              transform: 'translate(-50%, -50%) scale(1.08)',
            },
          }}
          aria-label={h.label || 'Product'}
        />
      ))}
      <Fade in={Boolean(active && cardPosition)} timeout={170} unmountOnExit>
        <Box
          ref={cardRef}
          onMouseEnter={clearTimers}
          onMouseLeave={scheduleClose}
          sx={{
            position: 'absolute',
            left: cardPosition?.left ?? 0,
            top: cardPosition?.top ?? 0,
            width: 292,
            maxWidth: 'calc(100% - 16px)',
            borderRadius: 2,
            p: 1.75,
            backgroundColor: '#fff',
            zIndex: 5,
            boxShadow: '0 20px 46px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.12)',
            border: '1px solid rgba(15,23,42,0.08)',
            transformOrigin: 'top left',
          }}
        >
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {!loading && payload && (
            <Stack spacing={1.25}>
              <Typography
                variant="overline"
                sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.35 }}
              >
                {payload.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', minHeight: 20 }}>
                {payload.subtitle || active?.label || 'Curated catalog option'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {formatPrice(payload.price, payload.currency) || 'Explore'}
              </Typography>
              {payload.materialNote && (
                <Typography variant="caption" color="text.secondary">
                  {payload.materialNote}
                </Typography>
              )}
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={onNavigateToBreakdown}>
                  View
                </Button>
                <Button size="small" variant="text" disabled={!payload.hasPrice}>
                  Add
                </Button>
                <Button size="small" variant="text" endIcon={<ArrowOutward />} onClick={onNavigateToBreakdown}>
                  {payload.ctaHint === 'EXPLORE' ? 'Explore' : 'Navigate'}
                </Button>
              </Stack>
            </Stack>
          )}
          {!loading && !payload && active && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {requestError || 'Could not load catalog details right now.'}
              </Typography>
              <Button size="small" variant="text" onClick={() => void openFor(activeIndex ?? 0, active)}>
                Retry
              </Button>
            </Stack>
          )}
        </Box>
      </Fade>
    </Box>
  );
}
