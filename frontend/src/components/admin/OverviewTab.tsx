/**
 * Overview Tab
 * 
 * Dashboard metrics and statistics overview
 * Refreshes every 60 seconds
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Alert,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Folder,
  AutoAwesome,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { getAdminStats, AdminStats } from '@/lib/actions/admin';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: string;
}

function MetricCard({ title, value, icon, trend, color = '#1976d2' }: MetricCardProps) {
  const trendIsPositive = trend && trend.value > 0;
  const trendIsNegative = trend && trend.value < 0;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: color,
          boxShadow: `0 4px 12px rgba(0,0,0,0.08)`,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color: color,
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: trendIsPositive ? '#4caf5015' : trendIsNegative ? '#f4433615' : '#9e9e9e15',
                color: trendIsPositive ? '#4caf50' : trendIsNegative ? '#f44336' : '#9e9e9e',
              }}
            >
              {trendIsPositive && <TrendingUp sx={{ fontSize: 16 }} />}
              {trendIsNegative && <TrendingDown sx={{ fontSize: 16 }} />}
              <Typography variant="caption" fontWeight={600}>
                {trend.value > 0 ? '+' : ''}{trend.value}
              </Typography>
            </Box>
          )}
        </Box>

        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          {title}
        </Typography>

        {trend && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {trend.label}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);

    const result = await getAdminStats();

    if (result.success && result.data) {
      setStats(result.data);
      setLastRefresh(new Date());
    } else {
      setError(result.error || 'Failed to load statistics');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    fetchStats();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={fetchStats}>
            <RefreshIcon />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Platform Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {mounted && lastRefresh ? lastRefresh.toLocaleTimeString() : '--:--:--'}
          </Typography>
        </Box>
        <IconButton onClick={fetchStats} disabled={isLoading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={3}>
        {/* Total Users */}
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
          ) : (
            <MetricCard
              title="Total Users"
              value={stats?.totalUsers || 0}
              icon={<People />}
              trend={{
                value: stats?.trends.users24h || 0,
                label: 'in last 24h',
              }}
              color="#1976d2"
            />
          )}
        </Grid>

        {/* Active Users (7d) */}
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
          ) : (
            <MetricCard
              title="Active Users (7d)"
              value={stats?.activeUsers7d || 0}
              icon={<People />}
              color="#4caf50"
            />
          )}
        </Grid>

        {/* Total Projects */}
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
          ) : (
            <MetricCard
              title="Total Projects"
              value={stats?.totalProjects || 0}
              icon={<Folder />}
              trend={{
                value: stats?.trends.projects7d || 0,
                label: 'in last 7d',
              }}
              color="#ff9800"
            />
          )}
        </Grid>

        {/* Total Generations */}
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
          ) : (
            <MetricCard
              title="Total Generations"
              value={stats?.totalGenerations || 0}
              icon={<AutoAwesome />}
              color="#9c27b0"
            />
          )}
        </Grid>

        {/* Total Regenerations */}
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
          ) : (
            <MetricCard
              title="Total Regenerations"
              value={stats?.totalRegenerations || 0}
              icon={<RefreshIcon />}
              color="#f44336"
            />
          )}
        </Grid>

        {/* Avg Projects/User */}
        <Grid item xs={12} sm={6} md={3}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
          ) : (
            <MetricCard
              title="Avg Projects per User"
              value={stats?.avgProjectsPerUser?.toFixed(1) || '0.0'}
              icon={<Folder />}
              color="#607d8b"
            />
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

