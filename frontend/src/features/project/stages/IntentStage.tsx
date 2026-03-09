/**
 * TatvaOps Vision - Design Intent Stage (ORCHESTRATOR)
 * 
 * Entry point for design intent collection.
 * Orchestrates:
 * 1. Intent mode selection (Global vs Room-wise)
 * 2. Global intent form (single-theme flow)
 * 3. Room selection + per-room forms (room-wise flow)
 * 4. Moodboard generation trigger and status
 * 
 * PERSISTENCE BEHAVIOR:
 * - On load, checks for existing moodboards
 * - If moodboards exist, shows locked intent with "Redo" button
 * - If generation in progress, resumes polling
 * - Survives page reload
 * 
 * Core business logic - no demos, no mocks.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  CircularProgress,
  alpha,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Palette,
  ArrowForward,
  Refresh,
  Lock,
  RestartAlt,
  CheckCircle,
  AutoAwesome,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  initializeIntentFlow,
  resetIntentState,
  loadExistingIntentData,
  selectIntentMode,
  selectShowModeSelector,
  selectGlobalIntent,
  selectSelectedRoomIds,
  selectCurrentRoomIndex,
  selectRoomGenerationStates,
  selectRoomIntents,
  selectAnyRoomGenerating,
  selectAllRoomsGenerated,
  startRoomGeneration,
  completeRoomGeneration,
  failRoomGeneration,
  updateRoomGenerationStatus,
  IntentPayload,
  IntentMode,
  IntentScope,
  IntentStatus,
} from '@/store/slices/intentSlice';
import { getProjectData } from '@/lib/actions/floor-plan';
import {
  triggerMoodboardGeneration,
  triggerGlobalMoodboardGeneration,
  regenerateAllMoodboards,
  getMoodboardJobStatus,
  getProjectMoodboards,
  getProjectActiveJobs,
} from '@/lib/actions/intent';
import { getIntentGraph } from '@/lib/actions/sense';
import { slideFromBottomVariants } from '@/motion/pageTransitions';

// Import sub-components
import { IntentModeSelector } from '@/features/intent/components/IntentModeSelector';
import { GlobalIntentForm } from '@/features/intent/components/GlobalIntentForm';
import { RoomSelectionModal } from '@/features/intent/components/RoomSelectionModal';
import { RoomIntentForm } from '@/features/intent/components/RoomIntentForm';

interface IntentStageProps {
  projectId: string;
  onStageChange?: (stage: string) => void;
}

interface Room {
  id: string;
  name: string;
  type: string;
}

export function IntentStage({ projectId, onStageChange }: IntentStageProps) {
  const dispatch = useAppDispatch();
  
  // Redux state
  const intentMode = useAppSelector(selectIntentMode);
  const showModeSelector = useAppSelector(selectShowModeSelector);
  const globalIntent = useAppSelector(selectGlobalIntent);
  const selectedRoomIds = useAppSelector(selectSelectedRoomIds);
  const currentRoomIndex = useAppSelector(selectCurrentRoomIndex);
  const roomGenerationStates = useAppSelector(selectRoomGenerationStates);
  const roomIntents = useAppSelector(selectRoomIntents);
  const anyRoomGenerating = useAppSelector(selectAnyRoomGenerating);
  const allRoomsGenerated = useAppSelector(selectAllRoomsGenerated);

  // Local state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoomSelection, setShowRoomSelection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJobs, setActiveJobs] = useState<Map<string, string>>(new Map()); // roomId -> jobId
  const [hasMoodboards, setHasMoodboards] = useState(false);
  const [moodboardCount, setMoodboardCount] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [showRemainingFormDialog, setShowRemainingFormDialog] = useState(false);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const activeJobsRef = useRef<Map<string, string>>(new Map()); // Ref to avoid stale closure
  
  // Keep ref in sync with state
  useEffect(() => {
    activeJobsRef.current = activeJobs;
  }, [activeJobs]);

  const normalizeIntentPayload = useCallback((payload: Partial<IntentPayload>) => {
    return {
      ...payload,
      // Enforce single primary theme/style
      interiorStyles: payload.interiorStyles?.length ? [payload.interiorStyles[0]] : [],
      // Keep only one source to avoid conflicting ideas
      inspirationSources: payload.inspirationSources?.length ? [payload.inspirationSources[0]] : undefined,
      referenceImageUrls: payload.referenceImageUrls?.length ? [payload.referenceImageUrls[0]] : undefined,
      pinterestLinks: payload.pinterestLinks?.length ? [payload.pinterestLinks[0]] : undefined,
      instagramLinks: payload.instagramLinks?.length ? [payload.instagramLinks[0]] : undefined,
    } as IntentPayload;
  }, []);

  const getSavedIntentMode = useCallback((): IntentMode | null => {
    try {
      const saved = localStorage.getItem(`intent-mode-${projectId}`);
      return saved === 'ROOM' || saved === 'GLOBAL' ? saved : null;
    } catch {
      return null;
    }
  }, [projectId]);

  const getSavedSelectedRooms = useCallback((): string[] | null => {
    try {
      const saved = localStorage.getItem(`intent-selected-rooms-${projectId}`);
      return saved ? (JSON.parse(saved) as string[]) : null;
    } catch {
      return null;
    }
  }, [projectId]);

  useEffect(() => {
    if (intentMode) {
      try {
        localStorage.setItem(`intent-mode-${projectId}`, intentMode);
      } catch {
        // Ignore storage failures
      }
    }
  }, [intentMode, projectId]);
  
  // Debug: Log Redux state changes
  useEffect(() => {
    console.log('[IntentStage] Redux globalIntent changed:', globalIntent);
  }, [globalIntent]);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    loadProjectData();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [projectId]);

  const loadProjectData = async () => {
    console.log('[IntentStage] 🔄 loadProjectData called for projectId:', projectId);
    setIsLoading(true);
    setError(null);

    try {
      // Fetch project data and rooms
      const result = await getProjectData(projectId);
      
      if (!result.success || !result.data) {
        setError(result.error || 'Failed to load project data');
        return;
      }

      const projectRooms = result.data.rooms.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
      }));
      setRooms(projectRooms);
      console.log('[IntentStage] Found rooms:', projectRooms.length);

      const savedMode = getSavedIntentMode();
      const savedSelectedRooms = getSavedSelectedRooms();

      // Check for existing moodboards
      const moodboardsResult = await getProjectMoodboards(projectId);
      const existingMoodboards = moodboardsResult.moodboards || [];
      setHasMoodboards(existingMoodboards.length > 0);
      setMoodboardCount(existingMoodboards.length);
      console.log('[IntentStage] Existing moodboards:', existingMoodboards.length);

      // Check for active jobs (in progress)
      const activeJobsResult = await getProjectActiveJobs(projectId);
      const runningJobs = activeJobsResult.jobs || [];
      console.log('[IntentStage] Running jobs:', runningJobs.length);

      // If we have active jobs, set up state and resume polling
      if (runningJobs.length > 0) {
        console.log('[IntentStage] 📍 Path: Active jobs found, resuming polling');
        const jobMap = new Map<string, string>();
        const roomStates: Record<string, any> = {};

        runningJobs.forEach((job) => {
          if (job.roomId) {
            jobMap.set(job.roomId, job.id);
            roomStates[job.roomId] = {
              roomId: job.roomId,
              roomName: projectRooms.find(r => r.id === job.roomId)?.name || 'Room',
              generationStatus: job.status === 'PROCESSING' ? 'GENERATING' : 'QUEUED',
              jobId: job.id,
              progress: job.progress || 0,
            };
          }
        });

        setActiveJobs(jobMap);
        
        // Load existing state - generation in progress
        dispatch(loadExistingIntentData({
          intentMode: savedMode || 'GLOBAL',
          roomGenerationStates: roomStates,
          ...(savedMode === 'ROOM' && savedSelectedRooms ? { selectedRoomIds: savedSelectedRooms } : {}),
        }));

        // Start polling for active jobs
        startJobPolling();
      } else if (existingMoodboards.length > 0) {
        console.log('[IntentStage] 📍 Path: Moodboards exist, loading from localStorage');
        // Moodboards exist but no active jobs - show locked state with actual intent data
        const roomStates: Record<string, any> = {};

        projectRooms.forEach((room) => {
          const moodboard = existingMoodboards.find(m => m.roomId === room.id);
          roomStates[room.id] = {
            roomId: room.id,
            roomName: room.name,
            generationStatus: moodboard ? 'GENERATED' : 'IDLE',
            moodboardUrl: moodboard?.imageUrl,
            moodboardVersion: moodboard?.version || 1,
          };
        });

        // Load the saved intent payload from localStorage
        let intentPayload: any = {};
        
        try {
          const storageKey = `intent-payload-${projectId}`;
          const savedPayload = localStorage.getItem(storageKey);
          console.log('[Intent] Checking localStorage for key:', storageKey);
          console.log('[Intent] Raw savedPayload:', savedPayload);
          
          if (savedPayload) {
            intentPayload = JSON.parse(savedPayload);
            console.log('[Intent] ✅ Loaded saved intent payload from localStorage:', intentPayload);
          } else {
            console.log('[Intent] ⚠️ No saved payload found in localStorage');
          }
        } catch (e) {
          console.error('[Intent] ❌ Failed to load saved payload:', e);
        }

        const effectiveMode = savedMode || 'GLOBAL';
        const globalIntentData = {
          intentMode: effectiveMode as IntentMode,
          ...(effectiveMode === 'GLOBAL' ? {
            globalIntent: {
              id: 'existing-intent',
              scope: 'GLOBAL' as IntentScope,
              version: 1,
              status: 'LOCKED' as IntentStatus,
              payload: intentPayload, // Loaded from localStorage!
              createdAt: new Date().toISOString(),
              lockedAt: new Date().toISOString(),
            },
          } : {}),
          ...(effectiveMode === 'ROOM' && savedSelectedRooms ? { selectedRoomIds: savedSelectedRooms } : {}),
          roomGenerationStates: roomStates,
        };
        
        console.log('[Intent] 🚀 Dispatching loadExistingIntentData with:', globalIntentData);
        
        dispatch(loadExistingIntentData(globalIntentData));
        
        console.log('[Intent] ✅ Dispatch completed');
      } else if (!isInitializedRef.current) {
        console.log('[IntentStage] 📍 Path: Fresh start, initializing flow');
        if (savedMode === 'ROOM') {
          const roomStates: Record<string, any> = {};
          projectRooms.forEach((room) => {
            roomStates[room.id] = {
              roomId: room.id,
              roomName: room.name,
              generationStatus: 'IDLE',
            };
          });
          dispatch(loadExistingIntentData({
            intentMode: 'ROOM',
            roomGenerationStates: roomStates,
            selectedRoomIds: savedSelectedRooms || [],
          }));
        } else {
          // Fresh start - initialize intent flow
          dispatch(initializeIntentFlow({
            projectId,
            rooms: projectRooms,
          }));
        }
        isInitializedRef.current = true;
      }
    } catch (e) {
      setError('Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle redo - regenerate ALL rooms with new version
  const handleRedo = useCallback(async () => {
    const confirmRedo = window.confirm(
      'This will regenerate moodboards for ALL rooms as a new version. Continue?'
    );
    
    if (!confirmRedo) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get the saved intent payload
      const savedPayload = localStorage.getItem(`intent-payload-${projectId}`);
      const payload = savedPayload ? JSON.parse(savedPayload) : (globalIntent?.payload || {});
      const normalizedPayload = normalizeIntentPayload(payload);
      
      // Force regenerate all rooms (creates new versions)
      const result = await regenerateAllMoodboards(
        projectId,
        rooms,
        normalizedPayload as IntentPayload
      );
      
      if (result.success && result.jobs) {
        console.log(`[Intent] Regenerating all ${result.jobs.length} rooms with new version`);
        
        const newActiveJobs = new Map<string, string>();
        
        result.jobs.forEach((job) => {
          newActiveJobs.set(job.roomId, job.jobId);
          dispatch(startRoomGeneration({ roomId: job.roomId, jobId: job.jobId }));
        });
        
        setActiveJobs(newActiveJobs);
        activeJobsRef.current = newActiveJobs;
        
        // Navigate to moodboard page to see progress
        onStageChange?.('moodboard');
      } else {
        setError(result.errors?.join(', ') || 'Failed to start regeneration');
      }
    } catch (e) {
      setError('Failed to regenerate moodboards');
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, projectId, rooms, globalIntent, onStageChange]);

  // ============================================
  // JOB POLLING (must be defined before handlers that use it)
  // ============================================

  const startJobPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      // Use ref to avoid stale closure
      const jobs = Array.from(activeJobsRef.current.entries());
      
      if (jobs.length === 0) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        return;
      }

      let completedCount = 0;
      let failedCount = 0;
      const totalJobs = jobs.length;

      for (const [roomId, jobId] of jobs) {
        try {
          const result = await getMoodboardJobStatus(jobId);
          
          if (result.success && result.job) {
            const job = result.job;
            
            dispatch(updateRoomGenerationStatus({
              roomId,
              status: job.status === 'COMPLETED' ? 'GENERATED' : 
                      job.status === 'FAILED' ? 'FAILED' :
                      job.status === 'PROCESSING' ? 'GENERATING' : 'QUEUED',
              progress: job.progress,
              error: job.error,
            }));

            if (job.status === 'COMPLETED') {
              completedCount++;
              dispatch(completeRoomGeneration({
                roomId,
                moodboardId: job.moodboardId || '',
                moodboardUrl: job.moodboardUrl || '',
                moodboardVersion: 1,
              }));
              
              // Remove from active jobs
              setActiveJobs(prev => {
                const newMap = new Map(prev);
                newMap.delete(roomId);
                return newMap;
              });
            } else if (job.status === 'FAILED') {
              failedCount++;
              dispatch(failRoomGeneration({ roomId, error: job.error || 'Generation failed' }));
              
              setActiveJobs(prev => {
                const newMap = new Map(prev);
                newMap.delete(roomId);
                return newMap;
              });
            }
          }
        } catch (e) {
          console.error('Job poll error:', e);
        }
      }

      // If all jobs are done (completed or failed), stop polling
      if (completedCount + failedCount === totalJobs) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        
        // Mark as complete
        if (completedCount > 0) {
          setGenerationComplete(true);
        }
      }
    }, 3000); // Poll every 3 seconds
  }, [dispatch, onStageChange]);

  // ============================================
  // GLOBAL INTENT FLOW
  // ============================================

  const handleGlobalIntentSubmit = useCallback(async (payload: Partial<IntentPayload>) => {
    setIsSubmitting(true);
    setError(null);
    setGenerationComplete(false);

    try {
      const normalizedPayload = normalizeIntentPayload(payload);

      // Save intent payload to localStorage for persistence across reloads
      const storageKey = `intent-payload-${projectId}`;
      localStorage.setItem(storageKey, JSON.stringify(normalizedPayload));
      console.log('[Intent] Saved intent payload to localStorage:', storageKey, normalizedPayload);
      
      // Trigger moodboard generation for all rooms (smart - only generates for rooms without moodboards)
      const result = await triggerGlobalMoodboardGeneration(
        projectId,
        rooms,
        normalizedPayload as IntentPayload
      );

      if (result.success && result.jobs) {
        // Show info if some rooms were skipped (already have moodboards)
        if (result.skipped && result.skipped > 0) {
          console.log(`[Intent] Skipped ${result.skipped} room(s) that already have moodboards`);
        }

        // If all rooms already have moodboards, just navigate
        if (result.jobs.length === 0) {
          console.log('[Intent] All rooms already have moodboards - navigating to moodboard page');
          onStageChange?.('moodboard');
          setIsSubmitting(false);
          return;
        }

        // Track all jobs
        const newActiveJobs = new Map<string, string>();
        
        result.jobs.forEach((job) => {
          newActiveJobs.set(job.roomId, job.jobId);
          dispatch(startRoomGeneration({ roomId: job.roomId, jobId: job.jobId }));
        });
        
        // Update both state and ref immediately
        setActiveJobs(newActiveJobs);
        activeJobsRef.current = newActiveJobs;
        
        // Navigate to moodboard page immediately - it will show generation progress
        onStageChange?.('moodboard');
      } else {
        setError(result.errors?.join(', ') || 'Failed to start generation');
        setIsSubmitting(false);
      }
    } catch (e) {
      setError('Failed to start moodboard generation');
      setIsSubmitting(false);
    }
    // Don't set isSubmitting to false on success - we're navigating away
  }, [projectId, rooms, dispatch, onStageChange]);

  // ============================================
  // ROOM-WISE FLOW
  // ============================================

  const handleRoomSelectionProceed = useCallback((selectedIds: string[]) => {
    try {
      localStorage.setItem(`intent-selected-rooms-${projectId}`, JSON.stringify(selectedIds));
      localStorage.setItem(`intent-mode-${projectId}`, 'ROOM');
    } catch {
      // Ignore storage failures
    }
    setShowRoomSelection(false);
  }, [projectId]);

  const handleRoomIntentSubmit = useCallback(async (
    roomId: string,
    payload: Partial<IntentPayload>
  ) => {
    setIsSubmitting(true);
    setError(null);
    setGenerationComplete(false);

    try {
      const normalizedPayload = normalizeIntentPayload(payload);
      const roomDetails = rooms.find(r => r.id === roomId);

      const result = await triggerMoodboardGeneration(
        projectId,
        roomId,
        normalizedPayload as IntentPayload,
        roomDetails?.name,
        roomDetails?.type
      );

      if (result.success && result.jobId) {
        dispatch(startRoomGeneration({ roomId, jobId: result.jobId }));
        const newMap = new Map(activeJobsRef.current).set(roomId, result.jobId!);
        setActiveJobs(newMap);
        activeJobsRef.current = newMap;
        
        // Navigate to moodboard page immediately - it will show generation progress
        onStageChange?.('moodboard');
      } else {
        setError(result.error || 'Failed to start generation');
        dispatch(failRoomGeneration({ roomId, error: result.error || 'Failed' }));
        setIsSubmitting(false);
      }
    } catch (e) {
      setError('Failed to start moodboard generation');
      dispatch(failRoomGeneration({ roomId, error: 'Network error' }));
      setIsSubmitting(false);
    }
    // Don't set isSubmitting to false on success - we're navigating away
  }, [projectId, dispatch, onStageChange, rooms, normalizeIntentPayload]);

  const handleRoomFlowComplete = useCallback(() => {
    // Navigate to moodboard stage
    onStageChange?.('moodboard');
  }, [onStageChange]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getCurrentRoom = () => {
    const roomId = selectedRoomIds[currentRoomIndex];
    return rooms.find(r => r.id === roomId);
  };

  // ============================================
  // RENDER
  // ============================================

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error && !intentMode) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadProjectData} startIcon={<Refresh />}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // No rooms
  if (rooms.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Rooms Found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please complete floor plan analysis first to detect rooms.
        </Typography>
        <Button
          variant="contained"
          onClick={() => onStageChange?.('floor_plan')}
        >
          Go to Floor Plan
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
      {/* Mode Selector Modal */}
      <IntentModeSelector />

      {/* Room Selection Modal (Room-wise flow) */}
      <RoomSelectionModal
        open={showRoomSelection}
        onClose={() => setShowRoomSelection(false)}
        rooms={rooms}
        onProceed={handleRoomSelectionProceed}
      />

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Design Intent
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {intentMode === 'GLOBAL' 
              ? 'Define your design preferences for the entire home'
              : intentMode === 'ROOM'
              ? 'Customize design preferences for each room'
              : 'Choose how you want to define your design direction'}
          </Typography>
        </Box>
        
        {/* Action buttons - show when intent is locked or moodboards exist */}
        {(hasMoodboards || globalIntent?.status === 'LOCKED') && !anyRoomGenerating && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Show "Generate Remaining" if some rooms don't have moodboards */}
            {moodboardCount < rooms.length && moodboardCount > 0 && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AutoAwesome />}
                  onClick={() => setShowRemainingFormDialog(true)}
                  sx={{ textTransform: 'none' }}
                >
                  Generate Remaining ({rooms.length - moodboardCount} Rooms)
                </Button>
                <Dialog
                  open={showRemainingFormDialog}
                  onClose={() => !isSubmitting && setShowRemainingFormDialog(false)}
                  maxWidth="md"
                  fullWidth
                  PaperProps={{ sx: { borderRadius: 2 } }}
                >
                  <DialogTitle>
                    Configure remaining rooms (whole house)
                  </DialogTitle>
                  <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Fill or adjust design preferences for the {rooms.length - moodboardCount} remaining rooms. These settings will be used to generate moodboards for the whole house.
                    </Typography>
                    <GlobalIntentForm
                      projectId={projectId}
                      isLocked={false}
                      isSubmitting={isSubmitting}
                      onSubmit={async (payload) => {
                        setIsSubmitting(true);
                        setError(null);
                        const result = await triggerGlobalMoodboardGeneration(
                          projectId,
                          rooms,
                          payload as IntentPayload
                        );
                        if (result.success) {
                          setShowRemainingFormDialog(false);
                          if (result.jobs && result.jobs.length > 0) {
                            onStageChange?.('moodboard');
                          }
                        } else {
                          setError(result.errors?.join(', ') || 'Failed to generate remaining rooms');
                        }
                        setIsSubmitting(false);
                      }}
                    />
                  </DialogContent>
                  <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                      onClick={() => setShowRemainingFormDialog(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </DialogActions>
                </Dialog>
              </>
            )}
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAlt />}
              onClick={handleRedo}
              sx={{ textTransform: 'none' }}
            >
              Redo All (New Version)
            </Button>
          </Box>
        )}
      </Box>

      {/* Locked Intent Banner - when moodboards exist */}
      {globalIntent?.status === 'LOCKED' && !anyRoomGenerating && (
        <Alert
          severity="info"
          icon={<Lock />}
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => onStageChange?.('moodboard')}
              endIcon={<ArrowForward />}
            >
              View Moodboards
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={500}>
            Design intent is locked. {moodboardCount > 0 ? `${moodboardCount} moodboard${moodboardCount !== 1 ? 's' : ''} generated.` : 'Moodboard generation is in progress or complete.'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            To make changes, you can regenerate moodboards with updated preferences.
          </Typography>
        </Alert>
      )}

      {/* Generation complete - auto-navigating */}
      {generationComplete && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" fontWeight={500}>
            🎉 Moodboards generated successfully!
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={12} /> Navigating to Moodboards...
          </Typography>
        </Alert>
      )}

      {/* Generation in progress banner */}
      {anyRoomGenerating && !generationComplete && (
        <Alert
          severity="warning"
          icon={<CircularProgress size={20} />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" fontWeight={500}>
            Moodboard generation in progress...
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {Object.values(roomGenerationStates).filter(r => r.generationStatus === 'GENERATING' || r.generationStatus === 'QUEUED').length} room(s) generating. You can safely navigate away - progress will be preserved.
          </Typography>
        </Alert>
      )}

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Content based on mode */}
      {!intentMode && !hasMoodboards && globalIntent?.status !== 'LOCKED' && (
        <Paper
          elevation={0}
          component={motion.div}
          variants={slideFromBottomVariants}
          initial="hidden"
          animate="visible"
          sx={{
            p: 4,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: alpha('#5C6BC0', 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Palette sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" gutterBottom>
            Ready to Define Your Design?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            Choose how you want to set up design preferences for your {rooms.length} detected room{rooms.length !== 1 ? 's' : ''}.
          </Typography>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={() => dispatch(initializeIntentFlow({ projectId, rooms }))}
            sx={{ textTransform: 'none' }}
          >
            Choose Design Mode
          </Button>
        </Paper>
      )}

      {/* Show completed state summary when locked with moodboards */}
      {(hasMoodboards || globalIntent?.status === 'LOCKED') && !anyRoomGenerating && !showModeSelector && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: alpha('#4CAF50', 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ fontSize: 24, color: 'success.main' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Design Intent Complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {moodboardCount} moodboard{moodboardCount !== 1 ? 's' : ''} generated for your rooms
              </Typography>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => onStageChange?.('moodboard')}
              endIcon={<ArrowForward />}
              sx={{ textTransform: 'none' }}
            >
              View Moodboards
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAlt />}
              onClick={handleRedo}
              sx={{ textTransform: 'none' }}
            >
              Start Over
            </Button>
          </Box>
        </Paper>
      )}

      {/* GLOBAL MODE: Single theme form */}
      {intentMode === 'GLOBAL' && (
        <GlobalIntentForm
          projectId={projectId}
          isLocked={globalIntent?.status === 'LOCKED'}
          onSubmit={handleGlobalIntentSubmit}
          isSubmitting={isSubmitting || anyRoomGenerating}
        />
      )}

      {/* ROOM MODE: Per-room form */}
      {intentMode === 'ROOM' && selectedRoomIds.length > 0 && (
        <>
          {getCurrentRoom() && (
            <RoomIntentForm
              projectId={projectId}
              room={getCurrentRoom()!}
              onSubmit={handleRoomIntentSubmit}
              onComplete={handleRoomFlowComplete}
              isSubmitting={isSubmitting}
            />
          )}
        </>
      )}

      {/* ROOM MODE: No rooms selected yet */}
      {intentMode === 'ROOM' && selectedRoomIds.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Select Rooms to Design
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which rooms you want to create moodboards for.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowRoomSelection(true)}
          >
            Select Rooms
          </Button>
        </Paper>
      )}

      {/* All rooms generated - show completion */}
      {allRoomsGenerated && Object.keys(roomGenerationStates).length > 0 && (
        <Alert 
          severity="success"
          sx={{ mt: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => onStageChange?.('moodboard')}
              endIcon={<ArrowForward />}
            >
              View Moodboards
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={500}>
            All moodboards generated successfully!
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
