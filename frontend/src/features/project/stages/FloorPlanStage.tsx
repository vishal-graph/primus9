/**
 * TatvaOps Vision - Floor Plan Stage
 * 
 * Features:
 * - Drag-and-drop upload zone
 * - Image preview
 * - Real AI analysis via backend
 * - Editable room list (table)
 * - Confidence scores and reasoning
 * 
 * Design: Clean, focused, Dropbox-like upload UX
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  LinearProgress,
  Chip,
  alpha,
  Alert,
  Tooltip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  CheckCircle,
  Info,
  Warning,
  Refresh,
  Psychology,
  Add,
} from '@mui/icons-material';
import { slideFromBottomVariants } from '@/motion/pageTransitions';
import {
  uploadFloorPlan,
  triggerFloorPlanAnalysis,
  getJobStatus,
  getJobStreamInfo,
  getProjectData,
  updateRoom,
  deleteRoom,
  type Room,
  type AnalysisResult,
  type ProjectData,
} from '@/lib/actions/floor-plan';
import { getActiveJobs } from '@/lib/actions/ai-job';

interface FloorPlanStageProps {
  projectId: string;
  onStageChange?: (stage: string) => void;
}

// Room type options - must match backend RoomType enum
const ROOM_TYPES = [
  { value: 'LIVING_ROOM', label: 'Living Room' },
  { value: 'BEDROOM', label: 'Bedroom' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'BATHROOM', label: 'Bathroom' },
  { value: 'TOILET', label: 'Toilet' },
  { value: 'DINING', label: 'Dining' },
  { value: 'BALCONY', label: 'Balcony/Deck/Veranda' },
  { value: 'TERRACE', label: 'Terrace/Outdoor' },
  { value: 'UTILITY', label: 'Utility/Laundry' },
  { value: 'STORE', label: 'Storage/Pantry' },
  { value: 'STUDY', label: 'Study/Office' },
  { value: 'PUJA', label: 'Puja Room' },
  { value: 'PASSAGE', label: 'Passage/Corridor' },
  { value: 'STAIRCASE', label: 'Staircase' },
  { value: 'LOBBY', label: 'Lobby' },
  { value: 'FOYER', label: 'Foyer/Entry' },
  { value: 'GARAGE', label: 'Garage/Parking' },
  { value: 'SERVANT_ROOM', label: 'Servant/Maid Room' },
  { value: 'DRESS', label: 'Dressing Room' },
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
];

function bestRoomDisplayLabel(r: Room): string {
  const texts = (r.textDetected || []).filter((t): t is string => typeof t === 'string');
  const fromText = texts.find(
    (t) =>
      /^[A-Za-z]/.test(t) &&
      t.length < 48 &&
      !/^\d+[''-]/.test(t) &&
      !/\d+\s*[xX×]\s*\d+/.test(t)
  );
  if (fromText) return fromText.trim();
  if (r.name?.trim()) return r.name.trim();
  const opt = ROOM_TYPES.find((x) => x.value === r.type);
  return opt?.label || r.type.replace(/_/g, ' ');
}

/** Remove PDF multi-page prefix from reasoning (e.g. "[Page 1] …") */
function displayReasoning(reasoning: string | undefined | null): string {
  if (!reasoning) return '';
  return reasoning.replace(/^\[Page\s*\d+\]\s*/i, '').trim();
}

type EnrichmentRoomRef = { id?: string; name?: string };

function extractEnrichmentRoomList(
  spatialEnrichment: ProjectData['spatialEnrichment']
): EnrichmentRoomRef[] | null {
  const r = spatialEnrichment?.rooms;
  return Array.isArray(r) && r.length > 0 ? (r as EnrichmentRoomRef[]) : null;
}

/** Map from spatial enrichment snapshot: room_2 → "Kitchen", etc. */
function buildEnrichmentIdToLabelMap(list: EnrichmentRoomRef[] | null | undefined): Map<string, string> {
  const m = new Map<string, string>();
  if (!list?.length) return m;
  for (const er of list) {
    const id = er.id?.trim();
    const name = er.name?.trim();
    if (!id) continue;
    const label = name || id;
    m.set(id, label);
    m.set(id.toLowerCase(), label);
  }
  return m;
}

function resolveOneAdjacentRef(
  s: string,
  enrichmentById: Map<string, string>,
  enrichmentList: EnrichmentRoomRef[] | null | undefined,
  tempIdToLabel: Map<string, string>,
  idToLabel: Map<string, string>,
  allRooms: Room[]
): string {
  const norm = s.trim();
  if (!norm) return '';

  let label =
    enrichmentById.get(norm) ??
    enrichmentById.get(norm.toLowerCase()) ??
    tempIdToLabel.get(norm) ??
    tempIdToLabel.get(norm.toLowerCase()) ??
    idToLabel.get(norm);

  // room_12 → enrichment list position (often matches analysis order)
  const roomIdxMatch = /^room_(\d+)$/i.exec(norm);
  if (!label && roomIdxMatch && enrichmentList?.length) {
    const n = parseInt(roomIdxMatch[1], 10);
    if (n >= 1 && n <= enrichmentList.length) {
      const er = enrichmentList[n - 1];
      label = er?.name?.trim() || er?.id || '';
    }
  }

  // circulation_1 → passage / lobby / corridor rooms by stable order
  const circMatch = /^circulation_(\d+)$/i.exec(norm);
  if (!label && circMatch) {
    const n = parseInt(circMatch[1], 10);
    const circTypes = new Set(['PASSAGE', 'LOBBY', 'CORRIDOR', 'STAIRCASE']);
    const circRooms = [...allRooms]
      .filter((r) => circTypes.has(r.type))
      .sort((a, b) => a.id.localeCompare(b.id));
    if (n >= 1 && n <= circRooms.length) {
      label = bestRoomDisplayLabel(circRooms[n - 1]);
    }
  }

  // Last resort: room_N → Nth room in top-to-bottom, left-to-right order (matches many floor-plan reads)
  if (!label || /^room_\d+$/i.test(label)) {
    const roomIdxMatch2 = /^room_(\d+)$/i.exec(norm);
    if (roomIdxMatch2 && allRooms.length > 0) {
      const n = parseInt(roomIdxMatch2[1], 10);
      const ordered = [...allRooms].sort((a, b) => {
        const ay = a.geometry?.boundingBox?.y ?? 0;
        const by = b.geometry?.boundingBox?.y ?? 0;
        if (Math.abs(ay - by) > 15) return ay - by;
        const ax = a.geometry?.boundingBox?.x ?? 0;
        const bx = b.geometry?.boundingBox?.x ?? 0;
        return ax - bx;
      });
      if (n >= 1 && n <= ordered.length) {
        label = bestRoomDisplayLabel(ordered[n - 1]);
      }
    }
  }

  if (!label) {
    label = norm;
  }
  return label;
}

/** Turn adjacent ids (room_2, circulation_1) into Kitchen, Foyer, etc. */
function resolveAdjacentDisplayNames(
  raw: string[],
  current: Room,
  allRooms: Room[],
  enrichmentRooms?: EnrichmentRoomRef[] | null
): string[] {
  if (!raw.length) return [];

  const enrichmentById = buildEnrichmentIdToLabelMap(enrichmentRooms);
  const tempIdToLabel = new Map<string, string>();
  const idToLabel = new Map<string, string>();
  for (const r of allRooms) {
    const L = bestRoomDisplayLabel(r);
    idToLabel.set(r.id, L);
    if (r.detectionTempId) {
      tempIdToLabel.set(r.detectionTempId, L);
      tempIdToLabel.set(r.detectionTempId.toLowerCase(), L);
    }
  }

  const selfKey = bestRoomDisplayLabel(current).toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];

  for (const ref of raw) {
    const s = String(ref).trim();
    if (!s) continue;
    const label = resolveOneAdjacentRef(
      s,
      enrichmentById,
      enrichmentRooms ?? null,
      tempIdToLabel,
      idToLabel,
      allRooms
    );
    const k = label.toLowerCase();
    if (!label || seen.has(k) || k === selfKey) continue;
    seen.add(k);
    out.push(label);
    if (out.length >= 8) break;
  }
  return out;
}

export function FloorPlanStage({ projectId, onStageChange }: FloorPlanStageProps) {
  const searchParams = useSearchParams();
  const projectNameFromUrl = searchParams.get('name');
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isPdfFile, setIsPdfFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('QUEUED');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  /** Project-level spatial enrichment `rooms[]` — maps room_2 / circulation_1 to display names */
  const [enrichmentRoomList, setEnrichmentRoomList] = useState<EnrichmentRoomRef[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Array<{ severity: string; message: string }>>([]);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load existing project data on mount
  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // Cleanup polling/SSE on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [existingFloorPlanUrl, setExistingFloorPlanUrl] = useState<string | null>(null);
  const [actualProjectId, setActualProjectId] = useState<string>(projectId);

  const loadProjectData = async (overrideProjectId?: string, skipActiveJobCheck?: boolean) => {
    const targetProjectId = overrideProjectId || actualProjectId;
    if (targetProjectId === 'new') {
      setIsLoadingRooms(false);
      return;
    }
    
    setIsLoadingRooms(true);
    const result = await getProjectData(targetProjectId);
    if (result.success && result.data) {
      setEnrichmentRoomList(extractEnrichmentRoomList(result.data.spatialEnrichment));
      if (result.data.rooms && result.data.rooms.length > 0) {
        setRooms(result.data.rooms);
        setHasExistingData(true);
      }
      if (result.data.floorPlanUrl) {
        setExistingFloorPlanUrl(result.data.floorPlanUrl);
        setHasExistingData(true);
        // Detect if it's a PDF
        setIsPdfFile(result.data.floorPlanUrl.toLowerCase().endsWith('.pdf'));
      }
    }
    setIsLoadingRooms(false);
    
    // Check for active floor plan analysis jobs and resume polling
    // Skip this if we just completed a job (to avoid double polling)
    if (!skipActiveJobCheck) {
      const activeJobs = await getActiveJobs(targetProjectId);
      const floorPlanJob = activeJobs.find(job => job.type === 'FLOORPLAN_ANALYSIS');
      
      if (floorPlanJob) {
        console.log('[FloorPlan] Found active job, resuming polling:', floorPlanJob.id);
        setIsAnalyzing(true);
        setCurrentJobId(floorPlanJob.id);
        setJobStatus(floorPlanJob.status as 'QUEUED' | 'PROCESSING');
        setAnalysisProgress(floorPlanJob.status === 'QUEUED' ? 10 : 50);
        startPolling(floorPlanJob.id, targetProjectId);
      }
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    // Detect if it's a PDF
    setIsPdfFile(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

    // 1. Upload to S3 (may create project if projectId is "new")
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const uploadResult = await uploadFloorPlan(projectId, formData, projectNameFromUrl || undefined);
    setIsUploading(false);

    if (!uploadResult.success) {
      setError(uploadResult.error || 'Upload failed');
      return;
    }

    // If a new project was created, update state and URL
    const newProjectId = uploadResult.projectId || projectId;
    if (uploadResult.projectId && uploadResult.projectId !== projectId) {
      setActualProjectId(uploadResult.projectId);
      // Redirect to the actual project URL
      window.history.replaceState({}, '', `/project/${uploadResult.projectId}?entry=floorplan`);
    }

    setImageUrl(uploadResult.imageUrl!);

    // 2. Trigger AI analysis
    setIsAnalyzing(true);
    setAnalysisProgress(5);

    const analysisResult = await triggerFloorPlanAnalysis(newProjectId, uploadResult.imageUrl!);

    if (!analysisResult.success) {
      setError(analysisResult.error || 'Analysis failed');
      setIsAnalyzing(false);
      return;
    }

    setCurrentJobId(analysisResult.jobId!);
    
    // 3. Poll for status - pass the actual project ID to avoid stale closure
    startPolling(analysisResult.jobId!, newProjectId);
  }, [projectId]);

  const startPolling = async (jobId: string, projectIdForPolling: string) => {
    // Clear any existing polling/SSE
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Try SSE first for live updates
    const streamInfo = await getJobStreamInfo(jobId);
    
    if (streamInfo.success && streamInfo.streamUrl && streamInfo.token) {
      // Use SSE for real-time updates
      startSSEStream(jobId, streamInfo.streamUrl, streamInfo.token, projectIdForPolling);
    } else {
      // Fallback to polling if SSE is not available
      startPollingFallback(jobId, projectIdForPolling);
    }
  };

  const startSSEStream = (jobId: string, streamUrl: string, token: string, projectIdForPolling: string) => {
    // EventSource doesn't support custom headers, so we use fetch with streaming
    const fetchStream = async () => {
      try {
        const response = await fetch(streamUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream',
          },
        });

        if (!response.ok || !response.body) {
          console.warn('SSE not available, falling back to polling');
          startPollingFallback(jobId, projectIdForPolling);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
          try {
            const { done, value } = await reader.read();
            
            if (done) {
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'progress') {
                    setJobStatus(data.status);
                    if (data.progress !== undefined) {
                      setAnalysisProgress(data.progress);
                    }
                    if (data.stage) {
                      setProgressStage(data.stage);
                    }
                    if (data.message) {
                      setProgressMessage(data.message);
                    }
                    if (data.error) {
                      setError(data.error);
                    }
                  }
                  
                  if (data.type === 'complete' || data.status === 'COMPLETED') {
                    setAnalysisProgress(100);
                    setProgressStage('Complete');
                    setProgressMessage('Analysis finished successfully');
                    setIsAnalyzing(false);
                    // Reload project data with explicit project ID, skip active job check
                    setTimeout(() => loadProjectData(projectIdForPolling, true), 500);
                    return;
                  }
                  
                  if (data.status === 'FAILED') {
                    setIsAnalyzing(false);
                    setError(data.error || 'Analysis failed');
                    return;
                  }
                } catch (parseError) {
                  console.warn('Failed to parse SSE data:', line);
                }
              }
            }

            // Continue reading
            await processStream();
          } catch (readError) {
            console.warn('SSE stream error, falling back to polling:', readError);
            startPollingFallback(jobId, projectIdForPolling);
          }
        };

        await processStream();
      } catch (error) {
        console.warn('SSE connection failed, falling back to polling:', error);
        startPollingFallback(jobId, projectIdForPolling);
      }
    };

    fetchStream();
  };

  const startPollingFallback = (jobId: string, projectIdForPolling: string) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    let networkErrorCount = 0;
    const MAX_NETWORK_ERRORS = 10;

    // Poll for job status
    pollIntervalRef.current = setInterval(async () => {
      const status = await getJobStatus(jobId);

      // Handle network errors gracefully - keep polling
      if (status.networkError) {
        networkErrorCount++;
        if (networkErrorCount >= MAX_NETWORK_ERRORS) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setIsAnalyzing(false);
          setError('Unable to connect to server. Please reload the page and try again.');
          return;
        }
        return;
      }
      
      networkErrorCount = 0;
      setJobStatus(status.status);
      
      // Update progress and stage from backend
      if (status.progress !== undefined && status.progress !== null) {
        setAnalysisProgress(status.progress);
      } else {
        if (status.status === 'QUEUED') {
          setAnalysisProgress(10);
        } else if (status.status === 'PROCESSING') {
          setAnalysisProgress(prev => Math.min(prev + 2, 90));
        }
      }
      
      // Update stage and message if available
      if (status.stage) {
        setProgressStage(status.stage);
      }
      if (status.message) {
        setProgressMessage(status.message);
      }

      // If processing a PDF and we've converted it to images, fetch the converted image
      // This happens when we see "PDF converted to images" in the progress message
      if (isPdfFile && status.message && status.message.includes('Converted PDF')) {
        setTimeout(async () => {
          const projectData = await getProjectData(projectIdForPolling);
          if (projectData.success && projectData.data?.floorPlanUrl) {
            setExistingFloorPlanUrl(projectData.data.floorPlanUrl);
            console.log('[FloorPlan] Converted PDF image loaded:', projectData.data.floorPlanUrl);
          }
        }, 500);
      }

      if (status.status === 'COMPLETED') {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        
        setAnalysisProgress(100);
        setProgressStage('Complete');
        setProgressMessage('Analysis finished successfully');
        setIsAnalyzing(false);
        setJobStatus('COMPLETED');
        
        // Load rooms and floor plan from database with explicit project ID, skip active job check
        await loadProjectData(projectIdForPolling, true);
        
        // Also refresh the floor plan URL to get the converted image (if PDF was uploaded)
        if (isPdfFile) {
          setTimeout(async () => {
            const projectData = await getProjectData(projectIdForPolling);
            if (projectData.success && projectData.data?.floorPlanUrl) {
              setExistingFloorPlanUrl(projectData.data.floorPlanUrl);
              setIsPdfFile(false); // Switch to showing image, not PDF
            }
          }, 1000); // Small delay to ensure S3 upload completes
        }
        
        if (status.warnings) {
          setWarnings(status.warnings);
        }
      } else if (status.status === 'FAILED') {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        
        setIsAnalyzing(false);
        setJobStatus('FAILED');
        
        // Still try to load project data - rooms might have been saved before failure
        const projectData = await getProjectData(projectIdForPolling);
        if (projectData.success && projectData.data?.rooms && projectData.data.rooms.length > 0) {
          setRooms(projectData.data.rooms);
          setEnrichmentRoomList(extractEnrichmentRoomList(projectData.data.spatialEnrichment));
          setHasExistingData(true);
          // Don't show error if rooms were successfully detected
        } else {
          setError(status.error || 'Analysis failed');
        }
      }
    }, 3000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleConfirmRoom = async (roomId: string) => {
    const result = await updateRoom(actualProjectId, roomId, { status: 'CONFIRMED' });
    if (result.success) {
      setRooms(prev =>
        prev.map(room => room.id === roomId ? { ...room, status: 'CONFIRMED' } : room)
      );
    }
  };

  const handleConfirmAllRooms = async () => {
    const pendingRooms = rooms.filter(r => r.status === 'PENDING');
    
    // Confirm all rooms in parallel
    const results = await Promise.all(
      pendingRooms.map(room => updateRoom(actualProjectId, room.id, { status: 'CONFIRMED' }))
    );
    
    // Update local state for successful confirmations
    setRooms(prev =>
      prev.map(room => {
        const resultIndex = pendingRooms.findIndex(p => p.id === room.id);
        if (resultIndex !== -1 && results[resultIndex]?.success) {
          return { ...room, status: 'CONFIRMED' };
        }
        return room;
      })
    );
  };

  const handleRejectRoom = async (roomId: string) => {
    const result = await deleteRoom(actualProjectId, roomId);
    if (result.success) {
      setRooms(prev => prev.filter(room => room.id !== roomId));
    }
  };

  const handleRoomTypeChange = async (roomId: string, newType: string) => {
    const result = await updateRoom(actualProjectId, roomId, { type: newType });
    if (result.success) {
      setRooms(prev =>
        prev.map(room => room.id === roomId ? { ...room, type: newType } : room)
      );
    }
  };

  const handleRetry = () => {
    setError(null);
    setPreviewUrl(null);
    setUploadedFile(null);
    setRooms([]);
    setEnrichmentRoomList(null);
    setWarnings([]);
    setHasExistingData(false);
    setExistingFloorPlanUrl(null);
    setIsPdfFile(false);
  };

  const handleContinueToIntent = async () => {
    // Auto-confirm any pending rooms before proceeding
    const pendingRooms = rooms.filter(r => r.status === 'PENDING');
    if (pendingRooms.length > 0) {
      await handleConfirmAllRooms();
    }
    
    // Navigate to intent stage
    if (onStageChange) {
      onStageChange('intent');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };

  const getRoomTypeLabel = (type: string) => {
    return ROOM_TYPES.find(t => t.value === type)?.label || type;
  };

  /** Find a dimension-like string in textDetected (e.g. "13'-6\" X 10'-2\"") */
  const getDimensionTextFromRoom = (room: Room): string | null => {
    const texts = room.textDetected || [];
    const dimensionPattern = /\d+[''-]?\d*\s*[""]?\s*[xX×]\s*\d+[''-]?\d*\s*[""]?/;
    return texts.find((t) => typeof t === 'string' && dimensionPattern.test(t)) ?? null;
  };

  const handleReload = () => {
    if (window.confirm('Reload the floor plan page? This will refresh all data and clear temporary state.')) {
      window.location.reload();
    }
  };

  const floorPlanImageUrl = previewUrl || existingFloorPlanUrl;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Error Alert - full width */}
      {error && (
        <Alert
          severity="error"
          sx={{ m: 2, flexShrink: 0 }}
          action={<Button color="inherit" size="small" onClick={handleRetry}>Try Again</Button>}
        >
          {error}
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ m: 2, flexShrink: 0 }}>
          {warnings.map((w, i) => (
            <Typography key={i} variant="caption" display="block">• {w.message}</Typography>
          ))}
        </Alert>
      )}

      {isLoadingRooms && (
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      )}

      {/* Upload Zone - no floor plan yet */}
      {!isLoadingRooms && !previewUrl && !hasExistingData ? (
        <Paper
          elevation={0}
          component={motion.div}
          variants={slideFromBottomVariants}
          initial="hidden"
          animate="visible"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          sx={{
            border: 2,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 6,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: alpha('#5C6BC0', 0.02),
            },
          }}
        >
          <CloudUpload sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Drag and drop your floor plan
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            or click to browse files
          </Typography>
          
          <Button
            variant="contained"
            component="label"
            sx={{ textTransform: 'none' }}
          >
            Choose File
            <input
              type="file"
              hidden
              accept="image/*,application/pdf"
              onChange={handleFileInput}
            />
          </Button>

          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
            Supports: PNG, JPG, PDF (max 10MB)
          </Typography>
        </Paper>
      ) : (
        <Box>
          {/* Floor Plan Image - Show preview URL (new upload) OR existing floor plan */}
          {(previewUrl || existingFloorPlanUrl) && (
            <Paper
              elevation={0}
              component={motion.div}
              variants={slideFromBottomVariants}
              initial="hidden"
              animate="visible"
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  backgroundColor: '#f8f9fa',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: isPdfFile ? 200 : 'auto',
                }}
              >
                {isPdfFile ? (
                  <Box sx={{ width: '100%', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 80, height: 100, backgroundColor: '#dc3545', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>PDF</Box>
                    <Typography variant="body1" fontWeight={500}>Floor Plan (PDF)</Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">PDF uploaded successfully. AI is analyzing the floor plan.</Typography>
                    {(existingFloorPlanUrl || previewUrl) && (
                      <Button variant="outlined" size="small" href={existingFloorPlanUrl || previewUrl || '#'} target="_blank" rel="noopener noreferrer" sx={{ textTransform: 'none' }}>View PDF in New Tab</Button>
                    )}
                  </Box>
                ) : (
                  <img src={previewUrl || existingFloorPlanUrl || ''} alt="Floor plan" style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px' }} />
                )}
              </Box>
              {isUploading && (
                <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Uploading floor plan...</Typography>
                  </Box>
                </Box>
              )}
              {isAnalyzing && (
                <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Psychology sx={{ mr: 1, color: 'primary.main', animation: 'pulse 1.5s infinite' }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={500}>{progressStage || (jobStatus === 'QUEUED' ? 'Queued' : 'Floor Plan Analysis')}</Typography>
                      <Typography variant="caption" color="text.secondary">{progressMessage || (jobStatus === 'QUEUED' ? 'Your job is in the queue...' : 'Analyzing floor plan structure...')}</Typography>
                    </Box>
                    <Chip label={`${analysisProgress}%`} size="small" color={analysisProgress >= 90 ? 'success' : 'primary'} sx={{ minWidth: 56 }} />
                  </Box>
                  <LinearProgress variant="determinate" value={analysisProgress} sx={{ height: 10, borderRadius: 5, backgroundColor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 5, background: analysisProgress >= 90 ? 'linear-gradient(90deg, #4caf50, #8bc34a)' : 'linear-gradient(90deg, #2196f3, #21cbf3)' } }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {analysisProgress < 20 && '🔍 Fetching floor plan...'}
                      {analysisProgress >= 20 && analysisProgress < 40 && '🖼️ Preprocessing image...'}
                      {analysisProgress >= 40 && analysisProgress < 70 && '🤖 AI detecting rooms...'}
                      {analysisProgress >= 70 && analysisProgress < 90 && '✅ Validating results...'}
                      {analysisProgress >= 90 && '🎉 Almost done!'}
                    </Typography>
                    <Typography variant="caption" color="primary.main" fontWeight={500}>Live Updates</Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          )}

          {/* Detected Rooms (fallback table) */}
          {rooms.length > 0 && !isAnalyzing && (
            <Box component={motion.div} variants={slideFromBottomVariants} initial="hidden" animate="visible">
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Detected Rooms ({rooms.length})
                </Typography>
              </Box>

              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ border: 1, borderColor: 'divider' }}
              >
                <Table sx={{ tableLayout: 'auto', minWidth: 720 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ width: 160, fontWeight: 700, fontSize: '0.95rem', py: 1.5 }}>Room Type</TableCell>
                      <TableCell sx={{ width: 90, fontWeight: 700, fontSize: '0.95rem', py: 1.5 }} align="center">AI Score</TableCell>
                      <TableCell sx={{ width: 100, fontWeight: 700, fontSize: '0.95rem', py: 1.5 }}>Status</TableCell>
                      <TableCell sx={{ minWidth: 200, fontWeight: 700, fontSize: '0.95rem', py: 1.5 }}>Dimensions</TableCell>
                      <TableCell sx={{ minWidth: 280, fontWeight: 700, fontSize: '0.95rem', py: 1.5 }}>Enrichment</TableCell>
                      <TableCell sx={{ width: 100, fontWeight: 700, fontSize: '0.95rem', py: 1.5 }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rooms.map((room) => {
                      const dimensionText = getDimensionTextFromRoom(room);
                      const adjacentRaw = room.enrichment?.adjacent_to ?? room.adjacentRooms ?? [];
                      const adjacentList = resolveAdjacentDisplayNames(
                        adjacentRaw,
                        room,
                        rooms,
                        enrichmentRoomList
                      );
                      const labels = (room.textDetected || [])
                        .filter(
                          (t) =>
                            typeof t === 'string' &&
                            !/^\d+[''-]?\d*\s*[""]?\s*[xX×]/.test(t)
                        )
                        .map((t) => t.replace(/^\[Page\s*\d+\]\s*/i, '').trim())
                        .filter((t) => t.length > 0 && !/^\[?\s*Page\s*\d+\s*\]?$/i.test(t));
                      const reasoningText = displayReasoning(room.reasoning);
                      return (
                      <TableRow key={room.id} hover>
                        <TableCell sx={{ py: 1.75, verticalAlign: 'top' }}>
                          <FormControl size="small" fullWidth>
                            <Select 
                              value={room.type}
                              onChange={(e) => handleRoomTypeChange(room.id, e.target.value)}
                              size="small"
                              sx={{ fontSize: '0.9375rem' }}
                            >
                              {ROOM_TYPES.map(t => (
                                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.75, verticalAlign: 'top' }}>
                          <Chip
                            label={`${Math.round(room.confidence * 100)}%`}
                            size="medium"
                            color={getConfidenceColor(room.confidence)}
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.875rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.75, verticalAlign: 'top' }}>
                          <Chip
                            label={room.status}
                            size="medium"
                            color={room.status === 'CONFIRMED' ? 'success' : 'default'}
                            sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.75, verticalAlign: 'top' }}>
                          <Box sx={{ lineHeight: 1.5 }}>
                            {room.enrichment?.dimensions?.length_ft != null || room.enrichment?.dimensions?.width_ft != null ? (
                              <>
                                <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1rem' }}>
                                  {room.enrichment.dimensions.length_ft ?? '?'} × {room.enrichment.dimensions.width_ft ?? '?'} ft
                                </Typography>
                                {room.enrichment.area_sqft != null && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.9375rem' }}>
                                    {room.enrichment.area_sqft} sqft
                                  </Typography>
                                )}
                              </>
                            ) : dimensionText ? (
                              <>
                                <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1rem' }}>
                                  {dimensionText}
                                </Typography>
                                {room.area != null && room.area > 0 && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.9375rem' }}>
                                    ~{Math.round(room.area)} {room.areaUnit || 'sqft'}
                                  </Typography>
                                )}
                              </>
                            ) : room.area != null && room.area > 0 ? (
                              <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1rem' }}>
                                ~{Math.round(room.area)} {room.areaUnit || 'sqft'}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.75, verticalAlign: 'top' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: '0.9375rem' }}>
                            {room.enrichment?.position && (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Position</Typography>
                                <Typography variant="body2" fontWeight={500}>{room.enrichment.position}</Typography>
                              </Box>
                            )}
                            {room.enrichment?.openings && (room.enrichment.openings.doors > 0 || room.enrichment.openings.windows > 0) && (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Openings</Typography>
                                <Typography variant="body2" fontWeight={500}>{room.enrichment.openings.doors} door{room.enrichment.openings.doors !== 1 ? 's' : ''}, {room.enrichment.openings.windows} window{room.enrichment.openings.windows !== 1 ? 's' : ''}</Typography>
                              </Box>
                            )}
                            {adjacentList.length > 0 && (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Adjacent ({adjacentList.length})</Typography>
                                <Typography variant="body2" sx={{ mt: 0.25, lineHeight: 1.4 }} component="span">
                                  {adjacentList.length <= 6
                                    ? adjacentList.join(', ')
                                    : (
                                        <Tooltip title={adjacentList.join(', ')}>
                                          <span>{adjacentList.slice(0, 4).join(', ')} +{adjacentList.length - 4} more</span>
                                        </Tooltip>
                                      )}
                                </Typography>
                              </Box>
                            )}
                            {labels.length > 0 && (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Labels on plan</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                                  {labels.slice(0, 6).map((l, i) => (
                                    <Chip key={i} label={String(l)} size="small" variant="outlined" sx={{ fontSize: '0.8125rem', height: 24 }} />
                                  ))}
                                  {labels.length > 6 && (
                                    <Tooltip title={labels.slice(6).join(', ')}>
                                      <Chip label={`+${labels.length - 6}`} size="small" sx={{ fontSize: '0.8125rem', height: 24 }} />
                                    </Tooltip>
                                  )}
                                </Box>
                              </Box>
                            )}
                            {(room.symbolsDetected?.length ?? 0) > 0 && (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Symbols</Typography>
                                <Typography variant="body2" sx={{ mt: 0.25 }}>{(room.symbolsDetected ?? []).join(', ')}</Typography>
                              </Box>
                            )}
                            {reasoningText && (
                              <Tooltip title={reasoningText} enterDelay={400}>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', cursor: 'help' }}>
                                  {reasoningText}
                                </Typography>
                              </Tooltip>
                            )}
                            {!room.enrichment && adjacentList.length === 0 && labels.length === 0 && (room.symbolsDetected?.length ?? 0) === 0 && !reasoningText && (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            {room.status !== 'CONFIRMED' && (
                              <Tooltip title="Confirm room">
                                <IconButton 
                                  size="small" 
                                  color="success"
                                  onClick={() => handleConfirmRoom(room.id)}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Remove room">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleRejectRoom(room.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ); })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Actions Bar */}
              <Box sx={{ mt: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {rooms.filter(r => r.status === 'CONFIRMED').length} of {rooms.length} rooms confirmed
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    You can edit room types using the dropdown before confirming
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {rooms.some(r => r.status === 'PENDING') && (
                    <Button 
                      variant="outlined" 
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={handleConfirmAllRooms}
                      sx={{ textTransform: 'none' }}
                    >
                      Confirm All Rooms
                    </Button>
                  )}
                  <Button 
                    variant="contained" 
                    sx={{ textTransform: 'none' }}
                    disabled={rooms.length === 0}
                    onClick={handleContinueToIntent}
                  >
                    Continue to Intent →
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button 
                  variant="text" 
                  startIcon={<Refresh />}
                  onClick={handleRetry}
                  sx={{ textTransform: 'none' }}
                >
                  Upload New Floor Plan
                </Button>
                <Button variant="outlined" sx={{ textTransform: 'none' }}>
                  Add Room Manually
                </Button>
              </Box>
            </Box>
          )}

          {/* Analysis in progress indicator - show when uploading or analyzing */}
          {(isUploading || isAnalyzing) && !previewUrl && !existingFloorPlanUrl && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                mb: 3,
                textAlign: 'center',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                backgroundColor: alpha('#5C6BC0', 0.02),
              }}
            >
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isUploading ? 'Uploading Floor Plan...' : 'Analyzing Floor Plan...'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {isUploading 
                  ? 'Please wait while we upload your file to the server'
                  : progressMessage || (jobStatus === 'QUEUED'
                    ? 'Your job is in the queue...'
                    : 'AI is analyzing your floor plan...')}
              </Typography>
              {isAnalyzing && (
                <Box sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={500} color="primary.main">
                      {progressStage || 'Processing'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {analysisProgress}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={analysisProgress}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        background: analysisProgress >= 90 
                          ? 'linear-gradient(90deg, #4caf50, #8bc34a)'
                          : 'linear-gradient(90deg, #2196f3, #21cbf3)',
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    🔴 Live progress updates
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {/* No rooms detected state - only show if analysis completed and no rooms found */}
          {rooms.length === 0 && !isAnalyzing && !isUploading && !error && !isLoadingRooms && !previewUrl && !existingFloorPlanUrl && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                No rooms detected. Please upload a floor plan to begin analysis.
              </Typography>
            </Alert>
          )}

          {/* Floor plan uploaded but no rooms - analysis may have failed silently */}
          {rooms.length === 0 && !isAnalyzing && !isUploading && !error && !isLoadingRooms && (previewUrl || existingFloorPlanUrl) && (
            <Alert severity="warning" sx={{ mb: 3 }} icon={<Warning />}>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                No rooms were detected in this floor plan
              </Typography>
              <Typography variant="caption" color="text.secondary">
                The AI couldn&apos;t identify rooms in the uploaded image. This may happen if the floor plan is unclear or in an unsupported format.
                Try uploading a clearer image or a different floor plan.
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={handleRetry} sx={{ textTransform: 'none' }}>
                  Upload Different Floor Plan
                </Button>
              </Box>
            </Alert>
          )}
        </Box>
      )}

      {/* Info Box — same frosted glass as other surfaces */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 2,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Info sx={{ color: 'primary.main', fontSize: 20 }} />
          <Box>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Floor Plan Tips
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • Use high-resolution architectural floor plans for best results<br />
              • AI will automatically detect walls, doors, and room boundaries<br />
              • Rooms with low confidence should be reviewed manually<br />
              • You can manually edit detected rooms before proceeding
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
