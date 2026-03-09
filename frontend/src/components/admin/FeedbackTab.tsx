/**
 * Feedback Tab
 * 
 * Comprehensive feedback submissions table with:
 * - Pagination
 * - Search (user email, project name)
 * - Sort by date or score
 * - Expandable rows for full feedback JSON
 * - Star ratings display
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
  Collapse,
  Rating,
  Stack,
  Grid,
} from '@mui/material';
import {
  Search,
  Refresh as RefreshIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  ContentCopy,
} from '@mui/icons-material';
import { getAdminFeedback, AdminFeedback } from '@/lib/actions/admin';

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

interface FeedbackRowProps {
  feedback: AdminFeedback;
}

function FeedbackRow({ feedback }: FeedbackRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleCopyId = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(id);
  };

  return (
    <>
      <TableRow
        hover
        onClick={() => setExpanded(!expanded)}
        sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}
      >
        {/* Expand Icon */}
        <TableCell sx={{ width: 50 }}>
          <IconButton size="small">
            {expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>

        {/* Feedback ID */}
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
              {feedback.id.slice(0, 8)}...
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => handleCopyId(feedback.id, e)}
              sx={{ p: 0.25 }}
            >
              <ContentCopy sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </TableCell>

        {/* User Email */}
        <TableCell>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {feedback.userEmail}
          </Typography>
        </TableCell>

        {/* Project Name */}
        <TableCell>
          <Typography variant="body2" fontWeight={500}>
            {feedback.projectName}
          </Typography>
        </TableCell>

        {/* Overall Score */}
        <TableCell>
          <Rating value={feedback.overallScore} readOnly size="small" />
        </TableCell>

        {/* AI Understanding Score */}
        <TableCell>
          <Rating value={feedback.aiUnderstandingScore} readOnly size="small" />
        </TableCell>

        {/* Improvement Vectors */}
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 200 }}>
            {feedback.improvementVectors.slice(0, 2).map((vector, idx) => (
              <Chip
                key={idx}
                label={vector.replace(/_/g, ' ')}
                size="small"
                sx={{ fontSize: '0.6875rem' }}
              />
            ))}
            {feedback.improvementVectors.length > 2 && (
              <Chip
                label={`+${feedback.improvementVectors.length - 2}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.6875rem' }}
              />
            )}
          </Box>
        </TableCell>

        {/* Timestamp */}
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {new Date(feedback.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Typography>
        </TableCell>
      </TableRow>

      {/* Expanded Row - Full Feedback Details */}
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, bgcolor: '#fafafa' }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Full Feedback Data
              </Typography>

              <Grid container spacing={2}>
                {/* All Improvement Vectors */}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    All Improvement Signals
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {feedback.improvementVectors.map((vector, idx) => (
                      <Chip
                        key={idx}
                        label={vector.replace(/_/g, ' ')}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </Grid>

                {/* Business Intent */}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Business Intent
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: 'white',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(feedback.businessIntent, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<AdminFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'overallScore'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getAdminFeedback({
      page,
      limit,
      search: debouncedSearch || undefined,
      sort: sortBy,
      order: sortOrder,
    });

    if (result.success && result.data) {
      setFeedbacks(result.data.data);
      setTotalPages(result.data.pagination.totalPages);
      setTotal(result.data.pagination.total);
    } else {
      setError(result.error || 'Failed to load feedback');
    }

    setIsLoading(false);
  }, [page, limit, debouncedSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortOrder]);

  return (
    <Box>
      {/* Filters and Search */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {/* Search */}
        <TextField
          placeholder="Search by user email or project name..."
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

        {/* Sort By */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'overallScore')}
          >
            <MenuItem value="createdAt">Date</MenuItem>
            <MenuItem value="overallScore">Overall Score</MenuItem>
          </Select>
        </FormControl>

        {/* Sort Order */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Order</InputLabel>
          <Select
            value={sortOrder}
            label="Order"
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          >
            <MenuItem value="desc">Newest First</MenuItem>
            <MenuItem value="asc">Oldest First</MenuItem>
          </Select>
        </FormControl>

        {/* Refresh Button */}
        <IconButton onClick={fetchFeedback} disabled={isLoading}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Feedback Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider' }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa', width: 50 }} />
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Feedback ID</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>User Email</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Project</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Overall</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>AI Score</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Improvements</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: '#fafafa' }}>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : feedbacks.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No feedback submissions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              // Feedback rows
              feedbacks.map((feedback) => (
                <FeedbackRow key={feedback.id} feedback={feedback} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {!isLoading && feedbacks.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} submissions
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
    </Box>
  );
}

