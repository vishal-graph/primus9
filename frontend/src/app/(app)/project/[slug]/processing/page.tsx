/**
 * TatvaOps Vision - Processing Stage
 * 
 * Route: /project/[slug]/processing
 * Shows real-time progress of AI analysis
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  alpha,
  Card,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  AddPhotoAlternate,
  AutoFixHigh,
  Foundation,
  CheckCircle,
  RadioButtonUnchecked,
  ViewInAr,
  Check,
  Warning,
} from '@mui/icons-material';
import { pageFadeVariants } from '@/motion/pageTransitions';

interface ProcessingPageProps {
  params: {
    slug: string;
  };
}

// Processing steps based on backend worker pipeline
const PROCESSING_STEPS = [
  { id: 'upload', label: 'Processing Upload', icon: <AddPhotoAlternate />, desc: 'Saving high-resolution blueprint' },
  { id: 'vision', label: 'AI Vision Analysis', icon: <AutoFixHigh />, desc: 'Extracting walls, doors, and windows' },
  { id: 'geometry', label: 'Geometry Generation', icon: <Foundation />, desc: 'Building 2D spatial representation' },
  { id: 'rooms', label: 'Room Identification', icon: <ViewInAr />, desc: 'Detecting distinct functional areas' },
];

export default function ProcessingPage({ params }: ProcessingPageProps) {
  const router = useRouter();
  const { slug } = params;
  
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<'PROCESSING' | 'COMPLETED' | 'FAILED'>('PROCESSING');
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [roomCount, setRoomCount] = useState(0);
  const [projectData, setProjectData] = useState<any>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Resolve slug to projectId
  useEffect(() => {
    const resolveProject = async () => {
      try {
        const res = await fetch(`/api/projects/${slug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.id) {
            setProjectId(data.data.id);
            setProjectData(data.data);
            
            // If already complete, redirect immediately
            const isCompleted = data.data.rooms && data.data.rooms.length > 0 && (!data.data.aiJobs || data.data.aiJobs.length === 0);
            
            if (isCompleted) {
              router.replace(`/project/${slug}/floor-plan`);
            } else if (data.data.aiJobs?.[0]?.status === 'FAILED') {
              setStatus('FAILED');
              setError('Floor plan analysis failed during previous attempt.');
            }
          } else {
            router.replace('/dashboard');
          }
        }
      } catch (err) {
        // Ignore API failures and let it retry or fail gracefully
      }
    };
    
    resolveProject();
  }, [slug, router]);

  // 2. Poll for status while processing
  useEffect(() => {
    if (!projectId || status === 'COMPLETED' || status === 'FAILED') return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const project = data.data;
            
            const isCompleted = project.rooms && project.rooms.length > 0 && (!project.aiJobs || project.aiJobs.length === 0);
            
            if (isCompleted) {
              setStatus('COMPLETED');
              setProgress(100);
              setCurrentStepIndex(PROCESSING_STEPS.length); // All complete
              setRoomCount(project.rooms?.length || 0);
              clearInterval(pollIntervalRef.current!);
              
              // Redirect to floor-plan tab after short delay
              setTimeout(() => {
                router.replace(`/project/${slug}/floor-plan`);
              }, 2000);
            } else if (project.aiJobs?.[0]?.status === 'FAILED') {
              setStatus('FAILED');
              clearInterval(pollIntervalRef.current!);
              setError('Analysis failed. The floor plan image might be too complex or illegible.');
            } else {
              // Estimate progress based on current step
              // Real implementation would get progress from backend (e.g., project.progress)
              // For now, simulate progress stepping if backend doesn't provide granular progress
              setProgress((prev) => {
                const newProgress = Math.min(prev + (Math.random() * 5), 85);
                
                // Update step based on mocked progress
                if (newProgress < 20) setCurrentStepIndex(0);
                else if (newProgress < 50) setCurrentStepIndex(1);
                else if (newProgress < 75) setCurrentStepIndex(2);
                else setCurrentStepIndex(3);
                
                return newProgress;
              });
            }
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [projectId, status, slug, router]);

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <motion.div
        variants={pageFadeVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {projectData?.name ? `Analyzing ${projectData.name}` : 'Analyzing Floor Plan'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Our AI is constructing a 2D model from your floor plan image.
          </Typography>
        </Box>

        <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 4, mb: 4 }}>
          {status === 'FAILED' ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Warning sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" color="error.main" gutterBottom>
                Analysis Failed
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                {error || 'We encountered an error while analyzing your floor plan.'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Typography
                  component="a"
                  href="/dashboard"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Return to Dashboard
                </Typography>
              </Box>
            </Box>
          ) : (
            <Grid container spacing={6}>
              {/* Left Column: Progress Steps */}
              <Grid item xs={12} md={7}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Analysis Progress
                </Typography>
                
                <Box sx={{ mb: 4, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      {status === 'COMPLETED' ? 'Complete!' : `${Math.round(progress)}%`}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant={status === 'COMPLETED' ? "determinate" : "buffer"} 
                    value={progress} 
                    valueBuffer={progress + 10}
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: alpha('#6366f1', 0.1),
                    }} 
                  />
                </Box>

                <List sx={{ pt: 2 }}>
                  {PROCESSING_STEPS.map((step, index) => {
                    const isCompleted = index < currentStepIndex || status === 'COMPLETED';
                    const isCurrent = index === currentStepIndex && status !== 'COMPLETED';
                    
                    return (
                      <ListItem key={step.id} sx={{ px: 0, py: 2 }}>
                        <ListItemIcon sx={{ minWidth: 48 }}>
                          {isCompleted ? (
                            <CheckCircle color="success" />
                          ) : isCurrent ? (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                            >
                              <Box sx={{ color: 'primary.main' }}>
                                {step.icon}
                              </Box>
                            </motion.div>
                          ) : (
                            <RadioButtonUnchecked color="disabled" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography 
                              variant="body1" 
                              fontWeight={isCurrent ? 600 : 400}
                              color={isCompleted || isCurrent ? 'text.primary' : 'text.disabled'}
                            >
                              {step.label}
                            </Typography>
                          }
                          secondary={
                            <Typography 
                              variant="body2" 
                              color={isCurrent ? 'primary.main' : 'text.secondary'}
                              sx={{ 
                                opacity: isCompleted ? 0.6 : isCurrent ? 1 : 0.4,
                                mt: 0.5
                              }}
                            >
                              {step.desc}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Grid>

              {/* Right Column: Dynamic Insights */}
              <Grid item xs={12} md={5}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    height: '100%', 
                    backgroundColor: 'background.default',
                    borderRadius: 2,
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}
                >
                  <Fade in={status === 'COMPLETED'}>
                    <Box>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          borderRadius: '50%', 
                          bgcolor: alpha('#4caf50', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 3
                        }}
                      >
                        <Check sx={{ fontSize: 40, color: 'success.main' }} />
                      </Box>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Analysis Complete
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Successfully identified {roomCount} rooms and spaces.
                        Preparing your workspace...
                      </Typography>
                    </Box>
                  </Fade>

                  <Fade in={status === 'PROCESSING'} unmountOnExit={false}>
                    <Box sx={{ display: status === 'PROCESSING' ? 'block' : 'none' }}>
                      <CircularProgress size={48} thickness={2} sx={{ mb: 3 }} />
                      <Typography variant="body2" color="text.secondary">
                        This usually takes 1-2 minutes depending on the complexity of your floor plan.
                      </Typography>
                    </Box>
                  </Fade>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Card>
      </motion.div>
    </Container>
  );
}
