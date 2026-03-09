/**
 * Users Tab
 * 
 * Comprehensive users table with:
 * - Pagination
 * - Search (email, name, ID)
 * - Filters (plan, anomalies, high regen)
 * - Anomaly flags with severity colors
 * - Click to open user profile drawer
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Pagination,
  Skeleton,
  Alert,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Stack,
} from '@mui/material';
import {
  Search,
  Refresh as RefreshIcon,
  ContentCopy,
  Warning,
} from '@mui/icons-material';
import { getAdminUsers, AdminUser, AnomalyFlag } from '@/lib/actions/admin';
import UserProfileDrawer from './UserProfileDrawer';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [filterAnomalies, setFilterAnomalies] = useState(false);
  const [filterHighRegen, setFilterHighRegen] = useState(false);

  // User profile drawer
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const filter = filterAnomalies ? 'anomaly' : filterHighRegen ? 'high_regen' : 'all';

    const result = await getAdminUsers({
      page,
      limit,
      search: debouncedSearch || undefined,
      filter,
      plan: planFilter !== 'all' ? planFilter : undefined,
    });

    if (result.success && result.data) {
      setUsers(result.data.data);
      setTotalPages(result.data.pagination.totalPages);
      setTotal(result.data.pagination.total);
    } else {
      setError(result.error || 'Failed to load users');
    }

    setIsLoading(false);
  }, [page, limit, debouncedSearch, planFilter, filterAnomalies, filterHighRegen]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, planFilter, filterAnomalies, filterHighRegen]);

  const handleRowClick = (userId: string) => {
    setSelectedUserId(userId);
    setDrawerOpen(true);
  };

  const handleCopyId = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(id);
  };

  const getAnomalySeverityColor = (severity: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (severity) {
      case 'LOW':
        return '#FFA726';
      case 'MEDIUM':
        return '#FF7043';
      case 'HIGH':
        return '#EF5350';
      default:
        return '#9e9e9e';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box>
      {/* Filters and Search */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          {/* Search */}
          <TextField
            placeholder="Search by email, name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, maxWidth: { md: 400 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Plan Filter */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Plan</InputLabel>
            <Select
              value={planFilter}
              label="Plan"
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <MenuItem value="all">All Plans</MenuItem>
              <MenuItem value="FREE">Free</MenuItem>
              <MenuItem value="STARTER">Starter</MenuItem>
              <MenuItem value="PROFESSIONAL">Professional</MenuItem>
              <MenuItem value="ENTERPRISE">Enterprise</MenuItem>
              <MenuItem value="NEW_YEAR_UNLIMITED_2025">NY Unlimited 2025</MenuItem>
            </Select>
          </FormControl>

          {/* Refresh Button */}
          <IconButton onClick={fetchUsers} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Stack>

        {/* Checkbox Filters */}
        <Stack direction="row" spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filterAnomalies}
                onChange={(e) => setFilterAnomalies(e.target.checked)}
                size="small"
              />
            }
            label="Has Anomalies"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={filterHighRegen}
                onChange={(e) => setFilterHighRegen(e.target.checked)}
                size="small"
              />
            }
            label="High Regen Users"
          />
        </Stack>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider' }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>User ID</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Plan</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Projects</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Gens</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Regens</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Signup</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Anomalies</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No users found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              // User rows
              users.map((user) => (
                <TableRow
                  key={user.id}
                  hover
                  onClick={() => handleRowClick(user.id)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                    },
                  }}
                >
                  {/* User ID */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          maxWidth: 80,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {user.id.slice(0, 8)}...
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleCopyId(user.id, e)}
                        sx={{ p: 0.25 }}
                      >
                        <ContentCopy sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  </TableCell>

                  {/* Name */}
                  <TableCell>
                    <Typography variant="body2">
                      {user.name || '-'}
                    </Typography>
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {user.email}
                    </Typography>
                  </TableCell>

                  {/* Plan */}
                  <TableCell>
                    <Chip
                      label={user.plan}
                      size="small"
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>

                  {/* Projects */}
                  <TableCell align="right">
                    <Typography variant="body2">
                      {user.totalProjects}
                    </Typography>
                  </TableCell>

                  {/* Generations */}
                  <TableCell align="right">
                    <Typography variant="body2">
                      {user.totalGenerations}
                    </Typography>
                  </TableCell>

                  {/* Regenerations */}
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={user.totalRegenerations > 10 ? 'error' : 'text.primary'}
                      fontWeight={user.totalRegenerations > 10 ? 600 : 400}
                    >
                      {user.totalRegenerations}
                    </Typography>
                  </TableCell>

                  {/* Signup Date */}
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                      {formatDate(user.accountCreatedAt)}
                    </Typography>
                  </TableCell>

                  {/* Anomaly Flags */}
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {user.anomalyFlags.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      ) : (
                        user.anomalyFlags.map((flag, idx) => (
                          <Tooltip
                            key={idx}
                            title={
                              <Box>
                                <Typography variant="caption" fontWeight={600}>
                                  {flag.type.replace(/_/g, ' ')}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {flag.details}
                                </Typography>
                              </Box>
                            }
                            arrow
                          >
                            <Chip
                              icon={<Warning sx={{ fontSize: 14 }} />}
                              label={flag.severity}
                              size="small"
                              sx={{
                                bgcolor: `${getAnomalySeverityColor(flag.severity)}20`,
                                color: getAnomalySeverityColor(flag.severity),
                                fontWeight: 600,
                                fontSize: '0.6875rem',
                                height: 22,
                                '& .MuiChip-icon': {
                                  color: 'inherit',
                                },
                              }}
                            />
                          </Tooltip>
                        ))
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {!isLoading && users.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} users
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* User Profile Drawer */}
      <UserProfileDrawer
        userId={selectedUserId}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedUserId(null);
        }}
      />
    </Box>
  );
}

function getAnomalySeverityColor(severity: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (severity) {
    case 'LOW':
      return '#FFA726';
    case 'MEDIUM':
      return '#FF7043';
    case 'HIGH':
      return '#EF5350';
    default:
      return '#9e9e9e';
  }
}

