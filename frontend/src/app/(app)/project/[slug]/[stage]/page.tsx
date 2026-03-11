/**
 * TatvaOps Vision - Project Workspace (Clean URL)
 * 
 * Route: /project/[slug]/[stage]
 * e.g. /project/my-living-room/moodboard
 * 
 * Unified workspace with tab navigation for all design stages.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  alpha,
  Chip,
} from '@mui/material';
import {
  UploadFile,
  Palette,
  CollectionsBookmark,
  ViewInAr,
  Videocam,
  Tune,
  Download,
} from '@mui/icons-material';
import { pageFadeVariants } from '@/motion/pageTransitions';

// Import stage components
import { FloorPlanStage } from '@/features/project/stages/FloorPlanStage';
import { IntentStage } from '@/features/project/stages/IntentStage';
import { MoodboardStage } from '@/features/project/stages/MoodboardStage';
import { ElevationStage } from '@/features/project/stages/ElevationStage';
import { TwoDViewsStage } from '@/features/project/stages/TwoDViewsStage';
import { ComponentStage } from '@/features/project/stages/ComponentStage';
import { WalkthroughStage } from '@/features/project/stages/WalkthroughStage';
import { ExportStage } from '@/features/project/stages/ExportStage';

// Stage slug ↔ internal ID mapping
const SLUG_TO_STAGE: Record<string, string> = {
  'floor-plan': 'floor_plan',
  'intent': 'intent',
  'moodboard': 'moodboard',
  'elevations': 'elevation',
  '2d-views': 'two_d_views',
  'components': 'component',
  'walkthrough': 'room_walkthrough',
  'export': 'export',
};

const STAGE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_STAGE).map(([slug, stage]) => [stage, slug])
);

type StageId =
  | 'floor_plan'
  | 'intent'
  | 'moodboard'
  | 'elevation'
  | 'two_d_views'
  | 'component'
  | 'room_walkthrough'
  | 'export';

interface Stage {
  id: StageId;
  label: string;
  icon: React.ReactElement;
  component: React.ComponentType<{ projectId: string; onStageChange?: (stage: string) => void }>;
  comingSoon?: boolean;
}

const STAGES: Stage[] = [
  { id: 'floor_plan', label: 'Floor Plan', icon: <UploadFile />, component: FloorPlanStage },
  { id: 'intent', label: 'Intent', icon: <Palette />, component: IntentStage },
  { id: 'moodboard', label: 'Moodboard', icon: <CollectionsBookmark />, component: MoodboardStage },
  { id: 'elevation', label: 'Elevations', icon: <ViewInAr />, component: ElevationStage },
  { id: 'two_d_views', label: '2D Views', icon: <ViewInAr />, component: TwoDViewsStage },
  { id: 'component', label: 'Components', icon: <Tune />, component: ComponentStage },
  { id: 'room_walkthrough', label: 'Walkthrough', icon: <Videocam />, component: WalkthroughStage },
  { id: 'export', label: 'Export', icon: <Download />, component: ExportStage, comingSoon: true },
];

interface ProjectStagePageProps {
  params: {
    slug: string;
    stage: string;
  };
}

export default function ProjectStagePage({ params }: ProjectStagePageProps) {
  const { slug, stage: stageSlug } = params;
  const router = useRouter();

  // Resolve the URL slug to an internal stage ID
  const stageId = (SLUG_TO_STAGE[stageSlug] || 'floor_plan') as StageId;

  const [activeStage, setActiveStage] = useState<StageId>(stageId);
  // We need the real project UUID for API calls — fetch it from the backend
  const [projectId, setProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch project by slug to get the real UUID
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.id) {
            setProjectId(data.data.id);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [slug]);

  // Sync stage from URL when it changes
  useEffect(() => {
    const resolved = SLUG_TO_STAGE[stageSlug] as StageId | undefined;
    if (resolved) {
      const stage = STAGES.find(s => s.id === resolved);
      if (stage && !stage.comingSoon) {
        setActiveStage(resolved);
      } else {
        router.replace(`/project/${slug}/floor-plan`);
      }
    } else {
      router.replace(`/project/${slug}/floor-plan`);
    }
  }, [stageSlug, slug, router]);

  const handleStageChange = (_event: React.SyntheticEvent, newValue: StageId) => {
    const stage = STAGES.find(s => s.id === newValue);
    if (stage?.comingSoon) return;
    setActiveStage(newValue);
    const newSlug = STAGE_TO_SLUG[newValue] || 'floor-plan';
    router.push(`/project/${slug}/${newSlug}`);
  };

  const handleStageNavigate = (stage: string) => {
    const sid = stage as StageId;
    if (STAGES.find(s => s.id === sid)) {
      setActiveStage(sid);
      const newSlug = STAGE_TO_SLUG[sid] || 'floor-plan';
      router.push(`/project/${slug}/${newSlug}`);
    }
  };

  const ActiveStageComponent = STAGES.find(s => s.id === activeStage)?.component || FloorPlanStage;

  if (loading) return null;
  if (!projectId) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3, height: '100%' }}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Stage Tabs */}
        <Paper
          elevation={0}
          sx={{ mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}
        >
          <Tabs
            value={activeStage}
            onChange={handleStageChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 56,
              '& .MuiTab-root': {
                minHeight: 56,
                textTransform: 'none',
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: 'text.secondary',
                '&.Mui-selected': { color: 'text.primary', fontWeight: 600 },
              },
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            {STAGES.map((stage) => (
              <Tab
                key={stage.id}
                value={stage.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {stage.label}
                    {stage.comingSoon && (
                      <Chip
                        label="Coming Soon"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          backgroundColor: alpha('#6366f1', 0.1),
                          color: '#6366f1',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                }
                icon={stage.icon}
                iconPosition="start"
                disabled={stage.comingSoon}
                sx={{ gap: 1, opacity: stage.comingSoon ? 0.6 : 1 }}
              />
            ))}
          </Tabs>
        </Paper>

        {/* Stage Content */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage}
              variants={pageFadeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ height: '100%' }}
            >
              <Paper
                elevation={0}
                sx={{
                  height: '100%',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'auto',
                }}
              >
                <ActiveStageComponent projectId={projectId} onStageChange={handleStageNavigate} />
              </Paper>
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Container>
  );
}
