/**
 * TatvaOps Vision - App Sidebar
 * 
 * Persistent navigation sidebar with:
 * - Stage navigation (7 stages)
 * - Stage status indicators
 * - Locked/completed states
 * - Project switcher
 * 
 * Design: Calm, minimal, Apple-like restraint
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  UploadFile,
  Palette,
  CollectionsBookmark,
  ViewInAr,
  Videocam,
  PlayCircle,
  Tune,
  Download,
  CheckCircle,
  Lock,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { useAppSelector } from '@/store';
import { selectCurrentProject } from '@/store/projectSlice';
import type { ProjectStage } from '@/types/project';

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  variant: 'persistent' | 'temporary';
  width: number;
}

// Stage configuration
interface StageItem {
  stage: ProjectStage;
  label: string;
  icon: React.ReactElement;
  description: string;
  comingSoon?: boolean;
}

const STAGES: StageItem[] = [
  {
    stage: 'FLOOR_PLAN',
    label: 'Floor Plan',
    icon: <UploadFile />,
    description: 'Upload & analyze',
  },
  {
    stage: 'INTENT',
    label: 'Design Intent',
    icon: <Palette />,
    description: 'Define preferences',
  },
  {
    stage: 'MOODBOARD',
    label: 'Moodboard',
    icon: <CollectionsBookmark />,
    description: 'AI-generated designs',
  },
  {
    stage: 'ELEVATION',
    label: 'Elevations',
    icon: <ViewInAr />,
    description: 'Wall layouts',
  },
  {
    stage: 'TWO_D_VIEWS',
    label: '3D Views',
    icon: <ViewInAr />,
    description: 'Room wall views',
  },
  {
    stage: 'COMPONENT',
    label: 'Components',
    icon: <Tune />,
    description: 'Fine-tune elements',
  },
  {
    stage: 'ROOM_WALKTHROUGH',
    label: 'Walkthrough',
    icon: <PlayCircle />,
    description: 'Room walkthrough videos',
  },
  {
    stage: 'INTERIOR',
    label: 'Interior Views',
    icon: <Videocam />,
    description: '3D visualizations',
    comingSoon: true,
  },
  {
    stage: 'EXPORT',
    label: 'Export',
    icon: <Download />,
    description: 'Download package',
    comingSoon: true,
  },
];

export function AppSidebar({ open, onClose, variant, width }: AppSidebarProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const currentProject = useAppSelector(selectCurrentProject);

  const projectId = currentProject?.id;
  const currentStage = currentProject?.currentStage || 'FLOOR_PLAN';

  const getStageStatus = (stage: ProjectStage, comingSoon?: boolean): 'completed' | 'current' | 'locked' | 'available' => {
    if (comingSoon) return 'locked'; // Coming soon stages are always locked
    if (!currentProject) return 'locked';
    
    const stageIndex = STAGES.findIndex(s => s.stage === stage);
    const currentIndex = STAGES.findIndex(s => s.stage === currentStage);
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    if (stageIndex === currentIndex + 1) return 'available';
    return 'locked';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />;
      case 'current':
        return <RadioButtonUnchecked sx={{ fontSize: 20, color: 'primary.main' }} />;
      case 'locked':
        return <Lock sx={{ fontSize: 20, color: 'action.disabled' }} />;
      default:
        return <RadioButtonUnchecked sx={{ fontSize: 20, color: 'action.disabled' }} />;
    }
  };

  const handleStageClick = (stage: ProjectStage, comingSoon?: boolean) => {
    if (!projectId) return;
    if (comingSoon) return; // Disable navigation for coming soon stages
    
    const status = getStageStatus(stage, comingSoon);
    if (status === 'locked') return;
    
    const slug = currentProject?.slug || projectId;
    const pathStage = stage.toLowerCase().replace('_', '-');
    router.push(`/project/${slug}/${pathStage}`);
    
    if (variant === 'temporary') {
      onClose();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'transparent',
      }}
    >
      {/* Logo / Brand */}
      <Box
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            letterSpacing: '-0.01em',
          }}
        >
          TatvaOps Vision
        </Typography>
        {currentProject && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              mt: 0.5,
            }}
          >
            {currentProject.name}
          </Typography>
        )}
      </Box>

      {/* Stage Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 2 }}>
        {!currentProject ? (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Select a project to view stages
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {STAGES.map((stageItem, index) => {
              const status = getStageStatus(stageItem.stage, stageItem.comingSoon);
              const isActive = pathname?.includes(stageItem.stage.toLowerCase());
              const isDisabled = status === 'locked' || stageItem.comingSoon;

              return (
                <ListItem key={stageItem.stage} disablePadding sx={{ px: 2, mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleStageClick(stageItem.stage, stageItem.comingSoon)}
                    disabled={isDisabled}
                    selected={isActive && !stageItem.comingSoon}
                    sx={{
                      borderRadius: 1,
                      py: 1.5,
                      opacity: stageItem.comingSoon ? 0.6 : 1,
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      },
                      '&.Mui-disabled': {
                        opacity: 0.4,
                      },
                    }}
                  >
                    {/* Stage Icon */}
                    <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                      {stageItem.icon}
                    </ListItemIcon>

                    {/* Stage Label & Description */}
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isActive ? 600 : 500,
                              color: isDisabled ? 'text.disabled' : 'text.primary',
                            }}
                          >
                            {stageItem.label}
                          </Typography>
                          {stageItem.comingSoon && (
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
                      secondary={stageItem.description}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        color: isDisabled ? 'text.disabled' : 'text.secondary',
                      }}
                    />

                    {/* Status Indicator */}
                    <Box sx={{ ml: 1 }}>
                      {getStatusIcon(status)}
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            textAlign: 'center',
          }}
        >
          © 2024 TatvaOps
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: width,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

