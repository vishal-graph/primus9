/**
 * TatvaOps Vision - Project Workspace (Clean URL)
 *
 * Route: /project/[slug]/[stage]
 * Heavy stage panels are loaded with `next/dynamic` to reduce first-load JS.
 */

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
  Skeleton,
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

function StagePlaceholder() {
  return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="rectangular" height={220} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

const FloorPlanStage = dynamic(
  () => import('@/features/project/stages/FloorPlanStage').then((m) => m.FloorPlanStage),
  { loading: () => <StagePlaceholder /> }
);
const IntentStage = dynamic(
  () => import('@/features/project/stages/IntentStage').then((m) => m.IntentStage),
  { loading: () => <StagePlaceholder /> }
);
const MoodboardStage = dynamic(
  () => import('@/features/project/stages/MoodboardStage').then((m) => m.MoodboardStage),
  { loading: () => <StagePlaceholder /> }
);
const ElevationStage = dynamic(
  () => import('@/features/project/stages/ElevationStage').then((m) => m.ElevationStage),
  { loading: () => <StagePlaceholder /> }
);
const TwoDViewsStage = dynamic(
  () => import('@/features/project/stages/TwoDViewsStage').then((m) => m.TwoDViewsStage),
  { loading: () => <StagePlaceholder /> }
);
const ComponentStage = dynamic(
  () => import('@/features/project/stages/ComponentStage').then((m) => m.ComponentStage),
  { loading: () => <StagePlaceholder /> }
);
const WalkthroughStage = dynamic(
  () => import('@/features/project/stages/WalkthroughStage').then((m) => m.WalkthroughStage),
  { loading: () => <StagePlaceholder /> }
);
const ExportStage = dynamic(
  () => import('@/features/project/stages/ExportStage').then((m) => m.ExportStage),
  { loading: () => <StagePlaceholder /> }
);

// Stage slug ↔ internal ID mapping
const SLUG_TO_STAGE: Record<string, string> = {
  'floor-plan': 'floor_plan',
  intent: 'intent',
  moodboard: 'moodboard',
  elevations: 'elevation',
  '2d-views': 'two_d_views',
  components: 'component',
  walkthrough: 'room_walkthrough',
  export: 'export',
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

type StageComponentProps = { projectId: string; onStageChange?: (stage: string) => void };

const STAGE_LAZY: Record<StageId, React.ComponentType<StageComponentProps>> = {
  floor_plan: FloorPlanStage,
  intent: IntentStage,
  moodboard: MoodboardStage,
  elevation: ElevationStage,
  two_d_views: TwoDViewsStage,
  component: ComponentStage,
  room_walkthrough: WalkthroughStage,
  export: ExportStage,
};

interface StageMeta {
  id: StageId;
  label: string;
  icon: React.ReactElement;
  comingSoon?: boolean;
}

const STAGES: StageMeta[] = [
  { id: 'floor_plan', label: 'Floor Plan', icon: <UploadFile /> },
  { id: 'intent', label: 'Intent', icon: <Palette /> },
  { id: 'moodboard', label: 'Moodboard', icon: <CollectionsBookmark /> },
  { id: 'elevation', label: 'Elevations', icon: <ViewInAr /> },
  { id: 'two_d_views', label: '3D Views', icon: <ViewInAr /> },
  { id: 'component', label: 'Components', icon: <Tune /> },
  { id: 'room_walkthrough', label: 'Walkthrough', icon: <Videocam /> },
  { id: 'export', label: 'Export', icon: <Download />, comingSoon: true },
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

  const stageId = (SLUG_TO_STAGE[stageSlug] || 'floor_plan') as StageId;

  const [activeStage, setActiveStage] = useState<StageId>(stageId);
  const [projectId, setProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const resolved = SLUG_TO_STAGE[stageSlug] as StageId | undefined;
    if (resolved) {
      const stage = STAGES.find((s) => s.id === resolved);
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
    const stage = STAGES.find((s) => s.id === newValue);
    if (stage?.comingSoon) return;
    setActiveStage(newValue);
    const newSlug = STAGE_TO_SLUG[newValue] || 'floor-plan';
    router.push(`/project/${slug}/${newSlug}`);
  };

  const handleStageNavigate = (stage: string) => {
    const stageAliases: Record<string, StageId> = { components: 'component' };
    const sid = (stageAliases[stage] ?? stage) as StageId;
    if (STAGES.find((s) => s.id === sid)) {
      setActiveStage(sid);
      const newSlug = STAGE_TO_SLUG[sid] || 'floor-plan';
      router.push(`/project/${slug}/${newSlug}`);
    }
  };

  const ActiveStageComponent = STAGE_LAZY[activeStage] ?? FloorPlanStage;

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (!projectId) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3, height: '100%' }}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={0} sx={{ mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
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
