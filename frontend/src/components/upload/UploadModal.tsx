'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Chip,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import { UploadDropzone } from './UploadDropzone';
import { UploadProgressRing } from './UploadProgressRing';
import { uploadFloorPlan, triggerFloorPlanAnalysis } from '@/lib/actions/floor-plan';
import { useAuth } from '@clerk/nextjs';
import { Check, Star } from '@mui/icons-material';

export interface PlanOption {
  code: string;
  name: string;
  maxProjects: number;
  maxRoomsPerProject: number;
  regenerationLimit: number;
  features: Record<string, boolean>;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadStarted?: () => void;
  onUploadFailed?: () => void;
  onSuccess: (projectId: string, jobId: string) => void;
  isInternal?: boolean;
  plans?: PlanOption[];
}

export function UploadModal({
  open,
  onClose,
  onUploadStarted,
  onUploadFailed,
  onSuccess,
  isInternal = false,
  plans = [],
}: UploadModalProps) {
  const { getToken } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [showPlanStep, setShowPlanStep] = useState(false);

  const handleClose = () => {
    if (isUploading) return;
    onClose();
    setFile(null);
    setProjectName('');
    setUploadError(null);
    setUploadProgress(0);
    setShowCheckmark(false);
    setShowPlanStep(false);
    setSelectedPlan('');
  };

  const handleUploadClick = () => {
    if (!file) return;
    setUploadError(null);
    if (isInternal && plans.length > 0) {
      setShowPlanStep(true);
      return;
    }
    startUpload();
  };

  const handlePlanSubmit = () => {
    if (!selectedPlan) return;
    startUpload();
  };

  const startUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setShowCheckmark(false);
    onUploadStarted?.();

    try {
      let projectId: string;
      let imageUrl: string;

      if (isInternal && selectedPlan) {
        const token = await getToken();
        if (!token) {
          setUploadError('Authentication required. Please sign in again.');
          setIsUploading(false);
          return;
        }
        const name = projectName.trim() || `Floor Plan - ${new Date().toLocaleDateString()}`;
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, planCode: selectedPlan }),
        });
        const data = await res.json();
        if (!data.success || !data.data?.id) {
          throw new Error(data.error?.message || 'Failed to create project');
        }
        projectId = data.data.id;
        setUploadProgress(20);
        const formData = new FormData();
        formData.set('file', file);
        const uploadResult = await uploadFloorPlan(projectId, formData);
        if (!uploadResult.success || !uploadResult.imageUrl) {
          throw new Error(uploadResult.error || 'Upload failed');
        }
        imageUrl = uploadResult.imageUrl;
      } else {
        setUploadProgress(10);
        const formData = new FormData();
        formData.set('file', file);
        const name = projectName.trim() || `Floor Plan - ${new Date().toLocaleDateString()}`;
        const uploadResult = await uploadFloorPlan('new', formData, name);
        if (!uploadResult.success || !uploadResult.projectId || !uploadResult.imageUrl) {
          throw new Error(uploadResult.error || 'Upload failed');
        }
        projectId = uploadResult.projectId;
        imageUrl = uploadResult.imageUrl;
      }

      setUploadProgress(60);
      const triggerResult = await triggerFloorPlanAnalysis(projectId, imageUrl);
      if (!triggerResult.success || !triggerResult.jobId) {
        throw new Error(triggerResult.error || 'Failed to start analysis');
      }
      setUploadProgress(100);
      setShowCheckmark(true);
      await new Promise((r) => setTimeout(r, 800));
      onSuccess(projectId, triggerResult.jobId);
      handleClose();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      onUploadFailed?.();
      setIsUploading(false);
    } finally {
      setIsUploading(false);
    }
  };

  const renderContent = () => {
    if (showPlanStep && isInternal && plans.length > 0) {
      return (
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
            Select Plan for this Project
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={600}>
              Internal TatvaOps Project — No payment required
            </Typography>
          </Alert>
          <RadioGroup value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
            <Grid container spacing={2}>
              {plans.map((plan) => (
                <Grid item xs={12} sm={6} key={plan.code}>
                  <Card
                    sx={{
                      border: selectedPlan === plan.code ? 2 : 1,
                      borderColor: selectedPlan === plan.code ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => setSelectedPlan(plan.code)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <FormControlLabel value={plan.code} control={<Radio />} label="" sx={{ mr: 1 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={600}>
                            {plan.name}
                          </Typography>
                          {plan.code === 'PREMIUM' && (
                            <Chip label="Best Value" size="small" color="primary" icon={<Star />} sx={{ mt: 0.5 }} />
                          )}
                        </Box>
                      </Box>
                      <List dense sx={{ py: 0 }}>
                        <ListItem sx={{ px: 0, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <Check fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText primary={`${plan.maxProjects} Project(s)`} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                        <ListItem sx={{ px: 0, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <Check fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText primary={`Up to ${plan.maxRoomsPerProject} Rooms`} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </RadioGroup>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setShowPlanStep(false)} sx={{ textTransform: 'none' }}>
              Back
            </Button>
            <Button variant="contained" onClick={handlePlanSubmit} disabled={!selectedPlan} sx={{ textTransform: 'none' }}>
              Upload & Continue
            </Button>
          </Box>
        </Box>
      );
    }

    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" fontWeight={600} sx={{ fontFamily: 'Inter, sans-serif', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            Upload Floor Plan
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: '#FFFFFF', opacity: 0.7, '&:hover': { opacity: 1 } }} size="small">
            <Close fontSize="medium" />
          </IconButton>
        </Box>
        <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.9)', mb: 2 }}>
          Add your floor plan to generate room-wise design options.
        </Typography>

        <UploadDropzone
          file={file}
          onFileSelect={setFile}
          onReplace={() => { setFile(null); setUploadError(null); }}
          onError={setUploadError}
          disabled={isUploading}
          error={uploadError}
        />

        {(isUploading || showCheckmark) && file && (
          <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', mb: 2, height: 54 }}>
            <UploadProgressRing
              progress={uploadProgress}
              size={54}
              strokeWidth={2.5}
              hasError={!!uploadError}
              showCheckmark={showCheckmark}
            />
            {isUploading && uploadProgress < 100 && (
              <Typography
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13,
                  color: '#FFFFFF',
                  opacity: 0.75,
                }}
              >
                {uploadProgress}%
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography component="label" sx={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.95)', display: 'block', mb: 1 }}>
            Project Name (Optional)
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isUploading}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.08)',
                color: '#FFFFFF',
                borderRadius: '10px',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.6)', opacity: 1 },
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2 }}>
          <Button
            onClick={handleClose}
            disabled={isUploading}
            sx={{
              textTransform: 'none',
              bgcolor: 'rgba(255,255,255,0.04)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.10)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadClick}
            disabled={!file || isUploading}
            sx={{
              textTransform: 'none',
              bgcolor: !file || isUploading ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.25)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.35)',
              '&:hover': { bgcolor: !file || isUploading ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.32)' },
            }}
          >
            {isUploading ? (
              <>
                <CircularProgress size={18} sx={{ color: '#FFFFFF', mr: 1 }} />
                Uploading…
              </>
            ) : (
              'Upload & Continue'
            )}
          </Button>
        </Box>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 520,
          maxWidth: '95vw',
          background: '#1e1e1e',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          p: 3,
          opacity: isUploading ? 0.98 : 1,
        },
      }}
      slotProps={{ backdrop: { sx: { background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' } } }}
    >
      <DialogContent sx={{ p: 0, '&.MuiDialogContent-root': { pt: 0 } }}>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
