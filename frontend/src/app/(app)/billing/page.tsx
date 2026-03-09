'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Receipt,
  Download,
  CheckCircle,
  Pending,
  Cancel,
  Refresh,
  TrendingUp,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface PlanDetails {
  code: string;
  name: string;
  priceInr: number;
  maxProjects: number;
  maxRoomsPerProject: number;
  regenerationLimit: number;
}

interface UserPlanStatus {
  activePlan: PlanDetails | null;
  projectsUsed: number;
  projectsRemaining: number;
  regenerationsLeft: Record<string, number>;
}

interface Invoice {
  id: string;
  planName: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'PENDING' | 'FAILED';
  paymentDate: Date;
  razorpayPaymentId: string;
  razorpayOrderId: string;
}

export default function BillingPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planStatus, setPlanStatus] = useState<UserPlanStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetchBillingData();
  }, [getToken]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Fetch user's current plan status
      const planRes = await fetch('/api/plans/me', { headers });
      const planData = await planRes.json();
      if (planData.success) {
        setPlanStatus(planData.data);
      }

      // Fetch invoices (subscriptions)
      const invoicesRes = await fetch('/api/billing/invoices', { headers });
      const invoicesData = await invoicesRes.json();
      if (invoicesData.success) {
        setInvoices(invoicesData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const token = await getToken();
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`/api/billing/invoices/${invoiceId}/download`, { headers });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'ACTIVE':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string): JSX.Element | undefined => {
    switch (status) {
      case 'PAID':
      case 'ACTIVE':
        return <CheckCircle fontSize="small" />;
      case 'PENDING':
        return <Pending fontSize="small" />;
      case 'FAILED':
      case 'CANCELLED':
        return <Cancel fontSize="small" />;
      default:
        return undefined;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount / 100); // Convert paise to rupees
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Receipt sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={700}>
              Billing & Invoices
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Manage your subscription, view usage, and download invoices
          </Typography>
        </Box>

        {/* Current Plan Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Current Plan
                </Typography>
                {planStatus?.activePlan ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Chip
                        label={planStatus.activePlan.name}
                        color="primary"
                        size="medium"
                        sx={{ fontSize: '1.1rem', fontWeight: 600, px: 2, py: 3 }}
                      />
                      <Typography variant="h4" fontWeight={700} color="primary.main">
                        {formatCurrency(planStatus.activePlan.priceInr)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        / one-time
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Projects
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant="h6" fontWeight={600}>
                              {planStatus.projectsUsed} / {planStatus.activePlan.maxProjects}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              used
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(planStatus.projectsUsed / planStatus.activePlan.maxProjects) * 100}
                            sx={{ mt: 1, height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Max Rooms per Project
                          </Typography>
                          <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>
                            {planStatus.activePlan.maxRoomsPerProject}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Regenerations per Stage
                          </Typography>
                          <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>
                            {planStatus.activePlan.regenerationLimit}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No active plan. Visit the{' '}
                    <Button
                      size="small"
                      onClick={() => router.push('/pricing')}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      pricing page
                    </Button>{' '}
                    to select a plan.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccountBalanceWallet color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Quick Actions
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<TrendingUp />}
                    onClick={() => router.push('/pricing')}
                    sx={{ textTransform: 'none', py: 1.5 }}
                  >
                    Upgrade Plan
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Refresh />}
                    onClick={fetchBillingData}
                    sx={{ textTransform: 'none', py: 1.5 }}
                  >
                    Refresh Data
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Invoices Table */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
              Payment History
            </Typography>

            {invoices.length === 0 ? (
              <Alert severity="info">
                No payment history found. Your invoices will appear here after purchasing a plan.
              </Alert>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Plan</strong></TableCell>
                      <TableCell><strong>Amount</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Payment ID</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} hover>
                        <TableCell>{formatDate(invoice.paymentDate)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {invoice.planName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {formatCurrency(invoice.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.status}
                            color={getStatusColor(invoice.status)}
                            icon={getStatusIcon(invoice.status)}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {invoice.razorpayPaymentId.substring(0, 20)}...
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Download Invoice">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadInvoice(invoice.id)}
                              disabled={invoice.status !== 'PAID'}
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Support Note */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Need help?</strong> For billing inquiries, contact us at{' '}
            <strong>billing@tatvaops.com</strong>
          </Typography>
        </Alert>
      </motion.div>
    </Container>
  );
}
