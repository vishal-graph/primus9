/**
 * Admin Dashboard - /krsna
 * 
 * Internal observability dashboard for @tatvaops.com admins
 * 
 * Features:
 * - Tab-based navigation (Overview, Users, Feedback)
 * - Read-only access
 * - Comprehensive platform metrics
 * - User anomaly detection
 * - Feedback insights
 */

'use client';

import { useState } from 'react';
import {
  Container,
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import {
  Dashboard,
  People,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import OverviewTab from '@/components/admin/OverviewTab';
import UsersTab from '@/components/admin/UsersTab';
import FeedbackTab from '@/components/admin/FeedbackTab';

type TabValue = 'overview' | 'users' | 'feedback';

interface TabPanelProps {
  children?: React.ReactNode;
  value: TabValue;
  currentValue: TabValue;
}

function TabPanel({ children, value, currentValue }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== currentValue}
      sx={{ display: value === currentValue ? 'block' : 'none', py: 3 }}
    >
      {value === currentValue && children}
    </Box>
  );
}

export default function AdminDashboardPage() {
  const [currentTab, setCurrentTab] = useState<TabValue>('overview');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            Admin Dashboard
          </Typography>
          <Chip
            label="READ-ONLY"
            size="small"
            sx={{
              bgcolor: '#4caf50',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.6875rem',
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Platform observability and monitoring • No mutations allowed
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9375rem',
                minHeight: 56,
              },
            }}
          >
            <Tab
              value="overview"
              label="Overview"
              icon={<Dashboard sx={{ fontSize: 20 }} />}
              iconPosition="start"
            />
            <Tab
              value="users"
              label="Users"
              icon={<People sx={{ fontSize: 20 }} />}
              iconPosition="start"
            />
            <Tab
              value="feedback"
              label="Feedback"
              icon={<FeedbackIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <Box sx={{ bgcolor: 'white', minHeight: 600 }}>
          <TabPanel value="overview" currentValue={currentTab}>
            <Box sx={{ px: 3 }}>
              <OverviewTab />
            </Box>
          </TabPanel>

          <TabPanel value="users" currentValue={currentTab}>
            <Box sx={{ px: 3 }}>
              <UsersTab />
            </Box>
          </TabPanel>

          <TabPanel value="feedback" currentValue={currentTab}>
            <Box sx={{ px: 3 }}>
              <FeedbackTab />
            </Box>
          </TabPanel>
        </Box>
      </Paper>

      {/* Footer Notice */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          bgcolor: '#fff3e0',
          border: '1px solid #ffb74d',
          borderRadius: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
          <strong>Notice:</strong> This dashboard is for internal monitoring only. All data is read-only.
          No user data can be modified from this interface. All admin actions are logged for audit purposes.
        </Typography>
      </Box>
    </Container>
  );
}

