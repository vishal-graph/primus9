/**
 * TatvaOps Vision - Room Intent Form
 * 
 * Per-room design intent form for "Room-wise Themes" flow.
 * Streamlined version of GlobalIntentForm with room-specific context.
 * 
 * Sequential flow: Room 1 → Room 2 → Room 3...
 * Form locks on "Create Moodboard" click.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Slider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  alpha,
  CircularProgress,
  OutlinedInput,
  SelectChangeEvent,
  ListItemText,
  ListItemIcon,
  ListSubheader,
  Checkbox,
} from '@mui/material';
import {
  Lock,
  Palette,
  Chair,
  Lightbulb,
  ArrowForward,
  ArrowBack,
  CheckCircle,
  HourglassEmpty,
  Error as ErrorIcon,
  Close,
  Check,
  Done,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectSelectedRoomIds,
  selectCurrentRoomIndex,
  selectRoomIntents,
  selectRoomGenerationStates,
  updateRoomIntent,
  lockRoomIntent,
  advanceToNextRoom,
  goToRoom,
  IntentPayload,
  GenerationStatus,
} from '@/store/slices/intentSlice';
import {
  INTERIOR_STYLES,
  MOOD_OPTIONS,
  COLOR_PALETTES,
  ACCENT_COLORS,
  MATERIALS,
  TEXTURES,
  FURNITURE_STYLES,
  STORAGE_PREFERENCES,
  LIGHTING_STYLES,
  LIGHT_TEMPERATURE,
  ROOM_TYPE_DEFAULTS,
} from '@/constants/intent-options';

interface RoomIntentFormProps {
  projectId: string;
  room: {
    id: string;
    name: string;
    type: string;
  };
  onSubmit: (roomId: string, payload: Partial<IntentPayload>) => Promise<void>;
  onComplete: () => void;
  isSubmitting?: boolean;
}

// Status icon component
function StatusIcon({ status }: { status: GenerationStatus }) {
  switch (status) {
    case 'GENERATED':
      return <CheckCircle sx={{ color: 'success.main' }} />;
    case 'GENERATING':
    case 'QUEUED':
      return <HourglassEmpty sx={{ color: 'warning.main' }} />;
    case 'FAILED':
      return <ErrorIcon sx={{ color: 'error.main' }} />;
    default:
      return null;
  }
}

// Color palette for chips - visually distinct colors
const CHIP_COLORS = [
  { bg: '#E3F2FD', text: '#1565C0', border: '#90CAF9' }, // Blue
  { bg: '#F3E5F5', text: '#7B1FA2', border: '#CE93D8' }, // Purple
  { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' }, // Green
  { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' }, // Orange
  { bg: '#FCE4EC', text: '#C2185B', border: '#F48FB1' }, // Pink
  { bg: '#E0F7FA', text: '#00838F', border: '#80DEEA' }, // Cyan
  { bg: '#FFF8E1', text: '#F57F17', border: '#FFE082' }, // Amber
  { bg: '#EFEBE9', text: '#4E342E', border: '#BCAAA4' }, // Brown
];

// Multi-select component with improved UX
function MultiSelectChips({
  label,
  options,
  value,
  onChange,
  disabled,
  maxSelection,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  maxSelection?: number;
}) {
  const [open, setOpen] = useState(false);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const val = event.target.value;
    const newValue = typeof val === 'string' ? val.split(',') : val;
    if (maxSelection && newValue.length > maxSelection) {
      return;
    }
    onChange(newValue);
  };

  const handleDelete = (valueToDelete: string) => (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(value.filter((v) => v !== valueToDelete));
  };

  const handleClose = () => {
    setOpen(false);
  };

  const getChipColor = (index: number) => {
    return CHIP_COLORS[index % CHIP_COLORS.length];
  };

  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        open={open}
        onOpen={() => setOpen(true)}
        onClose={handleClose}
        value={value}
        onChange={handleChange}
        input={<OutlinedInput label={label} />}
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: 350,
              '& .MuiList-root': {
                pb: 0,
              },
            },
          },
        }}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Select options...
              </Typography>
            ) : (
              selected.map((val, index) => {
                const color = getChipColor(index);
                return (
                  <Chip
                    key={val}
                    label={options.find((o) => o.value === val)?.label || val}
                    size="small"
                    onDelete={disabled ? undefined : handleDelete(val)}
                    deleteIcon={
                      <Close
                        sx={{
                          fontSize: 16,
                          color: `${color.text} !important`,
                          '&:hover': { color: `${color.text} !important` },
                        }}
                      />
                    }
                    sx={{
                      backgroundColor: color.bg,
                      color: color.text,
                      border: `1px solid ${color.border}`,
                      fontWeight: 500,
                      '& .MuiChip-deleteIcon': {
                        color: color.text,
                      },
                      '&:hover': {
                        backgroundColor: alpha(color.bg, 0.8),
                      },
                    }}
                  />
                );
              })
            )}
          </Box>
        )}
      >
        {/* Header with selection count and Done button */}
        <ListSubheader
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            py: 1,
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {value.length} selected{maxSelection ? ` (max ${maxSelection})` : ''}
          </Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<Done />}
            onClick={handleClose}
            sx={{ 
              minWidth: 80,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            Done
          </Button>
        </ListSubheader>

        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const color = isSelected ? getChipColor(value.indexOf(option.value)) : null;
          const isDisabledOption = !!(maxSelection && !isSelected && value.length >= maxSelection);

          return (
            <MenuItem
              key={option.value}
              value={option.value}
              disabled={isDisabledOption}
              sx={{
                py: 1.5,
                px: 2,
                backgroundColor: isSelected ? alpha(color?.bg || '#E3F2FD', 0.5) : 'transparent',
                borderLeft: isSelected ? `3px solid ${color?.text || '#1565C0'}` : '3px solid transparent',
                '&:hover': {
                  backgroundColor: isSelected 
                    ? alpha(color?.bg || '#E3F2FD', 0.7) 
                    : 'action.hover',
                },
                '&.Mui-disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  checked={isSelected}
                  sx={{
                    color: isSelected ? color?.text : 'text.secondary',
                    '&.Mui-checked': {
                      color: color?.text || 'primary.main',
                    },
                  }}
                />
              </ListItemIcon>
              <ListItemText 
                primary={option.label}
                primaryTypographyProps={{
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? color?.text : 'text.primary',
                }}
              />
              {isSelected && (
                <Check sx={{ color: color?.text, fontSize: 20 }} />
              )}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
}

export function RoomIntentForm({
  projectId,
  room,
  onSubmit,
  onComplete,
  isSubmitting = false,
}: RoomIntentFormProps) {
  const dispatch = useAppDispatch();
  const selectedRoomIds = useAppSelector(selectSelectedRoomIds);
  const currentRoomIndex = useAppSelector(selectCurrentRoomIndex);
  const roomIntents = useAppSelector(selectRoomIntents);
  const roomGenerationStates = useAppSelector(selectRoomGenerationStates);

  const intent = roomIntents[room.id];
  const generationState = roomGenerationStates[room.id];
  const isLocked = intent?.status === 'LOCKED';
  const isGenerating = generationState?.generationStatus === 'QUEUED' || 
                       generationState?.generationStatus === 'GENERATING';
  const isGenerated = generationState?.generationStatus === 'GENERATED';
  const hasFailed = generationState?.generationStatus === 'FAILED';

  // Get room-specific defaults
  const roomDefaults = ROOM_TYPE_DEFAULTS[room.type] || {};

  // Local form state
  const [formData, setFormData] = useState<Partial<IntentPayload>>({
    interiorStyles: intent?.payload.interiorStyles || [],
    mood: intent?.payload.mood || roomDefaults.mood || '',
    primaryColorPalette: intent?.payload.primaryColorPalette || '',
    secondaryAccents: intent?.payload.secondaryAccents || '',
    preferredMaterials: intent?.payload.preferredMaterials || [],
    textures: intent?.payload.textures || '',
    furnitureStyle: intent?.payload.furnitureStyle || '',
    storagePreference: (intent?.payload.storagePreference || roomDefaults.storagePreference || 'medium') as 'low' | 'medium' | 'high',
    artificialLightingStyle: intent?.payload.artificialLightingStyle || roomDefaults.lightingStyle || '',
    lightTemperature: (intent?.payload.lightTemperature || 'warm') as 'warm' | 'cool' | 'neutral',
  });

  // Update local state when room changes
  useEffect(() => {
    const roomIntent = roomIntents[room.id];
    const defaults = ROOM_TYPE_DEFAULTS[room.type] || {};

    const storageKey = `intent-room-${projectId}-${room.id}`;
    let savedPayload: Partial<IntentPayload> = {};
    try {
      const raw = localStorage.getItem(storageKey);
      savedPayload = raw ? (JSON.parse(raw) as Partial<IntentPayload>) : {};
    } catch {
      savedPayload = {};
    }

    const hasRoomIntent = roomIntent?.payload && Object.keys(roomIntent.payload).length > 0;
    const payload = hasRoomIntent ? roomIntent?.payload : savedPayload;

    setFormData({
      interiorStyles: payload?.interiorStyles || [],
      mood: payload?.mood || defaults.mood || '',
      primaryColorPalette: payload?.primaryColorPalette || '',
      secondaryAccents: payload?.secondaryAccents || '',
      preferredMaterials: payload?.preferredMaterials || [],
      textures: payload?.textures || '',
      furnitureStyle: payload?.furnitureStyle || '',
      storagePreference: (payload?.storagePreference || defaults.storagePreference || 'medium') as 'low' | 'medium' | 'high',
      artificialLightingStyle: payload?.artificialLightingStyle || defaults.lightingStyle || '',
      lightTemperature: (payload?.lightTemperature || 'warm') as 'warm' | 'cool' | 'neutral',
    });

    if (!hasRoomIntent && Object.keys(savedPayload).length > 0) {
      dispatch(updateRoomIntent({ roomId: room.id, payload: savedPayload }));
    }
  }, [room.id, roomIntents, projectId, dispatch, room.type]);

  const handleFieldChange = useCallback(<K extends keyof IntentPayload>(
    field: K,
    value: IntentPayload[K]
  ) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    dispatch(updateRoomIntent({ roomId: room.id, payload: { [field]: value } }));
    try {
      localStorage.setItem(`intent-room-${projectId}-${room.id}`, JSON.stringify(next));
    } catch {
      // Ignore storage failures
    }
  }, [dispatch, room.id, formData, projectId]);

  const handleCreateMoodboard = async () => {
    try {
      localStorage.setItem(`intent-room-${projectId}-${room.id}`, JSON.stringify(formData));
    } catch {
      // Ignore storage failures
    }
    dispatch(lockRoomIntent(room.id));
    await onSubmit(room.id, formData);
  };

  const handleNextRoom = () => {
    if (currentRoomIndex < selectedRoomIds.length - 1) {
      dispatch(advanceToNextRoom());
    } else {
      // All rooms done
      onComplete();
    }
  };

  const handleStepClick = (index: number) => {
    // Only allow clicking on completed or current room
    const roomId = selectedRoomIds[index];
    const state = roomGenerationStates[roomId];
    if (state?.generationStatus === 'GENERATED' || index === currentRoomIndex) {
      dispatch(goToRoom(index));
    }
  };

  const disabled = isLocked || isGenerating || isSubmitting;
  const isLastRoom = currentRoomIndex === selectedRoomIds.length - 1;

  return (
    <Box>
      {/* Progress Stepper */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Stepper activeStep={currentRoomIndex} alternativeLabel>
          {selectedRoomIds.map((roomId, index) => {
            const state = roomGenerationStates[roomId];
            const completed = state?.generationStatus === 'GENERATED';
            const hasError = state?.generationStatus === 'FAILED';
            
            return (
              <Step key={roomId} completed={completed}>
                <StepButton
                  onClick={() => handleStepClick(index)}
                  disabled={!completed && index !== currentRoomIndex}
                >
                  <StepLabel
                    error={hasError}
                    icon={
                      completed ? <CheckCircle sx={{ color: 'success.main' }} /> :
                      hasError ? <ErrorIcon sx={{ color: 'error.main' }} /> :
                      undefined
                    }
                  >
                    {state?.roomName || `Room ${index + 1}`}
                  </StepLabel>
                </StepButton>
              </Step>
            );
          })}
        </Stepper>
      </Paper>

      {/* Room Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Design Intent for {room.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Room {currentRoomIndex + 1} of {selectedRoomIds.length}
        </Typography>
      </Box>

      {/* Generation Progress */}
      {isGenerating && (
        <Alert 
          severity="info"
          icon={<CircularProgress size={20} />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            Generating moodboard for {room.name}... {generationState?.progress || 0}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={generationState?.progress || 0}
            sx={{ mt: 1 }}
          />
        </Alert>
      )}

      {/* Generated Success */}
      {isGenerated && (
        <Alert 
          severity="success"
          icon={<CheckCircle />}
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleNextRoom}
              endIcon={<ArrowForward />}
            >
              {isLastRoom ? 'View Moodboards' : 'Next Room'}
            </Button>
          }
        >
          <Typography variant="body2">
            Moodboard generated successfully for {room.name}!
          </Typography>
        </Alert>
      )}

      {/* Error State */}
      {hasFailed && (
        <Alert 
          severity="error"
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            Failed to generate moodboard: {generationState?.error || 'Unknown error'}
          </Typography>
        </Alert>
      )}

      {/* Locked Notice */}
      {isLocked && !isGenerating && !isGenerated && !hasFailed && (
        <Alert severity="info" icon={<Lock />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            Intent is locked. Generation will start shortly.
          </Typography>
        </Alert>
      )}

      {/* Form Content */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          mb: 3,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Grid container spacing={3}>
          {/* Style Section */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Palette sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Style & Colors
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <MultiSelectChips
              label="Interior Styles"
              options={INTERIOR_STYLES}
              value={formData.interiorStyles || []}
              onChange={(vals) => handleFieldChange('interiorStyles', vals.slice(0, 2))}
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Mood / Vibe</InputLabel>
              <Select
                value={formData.mood || ''}
                onChange={(e) => handleFieldChange('mood', e.target.value)}
                label="Mood / Vibe"
              >
                {MOOD_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Color Palette</InputLabel>
              <Select
                value={formData.primaryColorPalette || ''}
                onChange={(e) => handleFieldChange('primaryColorPalette', e.target.value)}
                label="Color Palette"
              >
                {COLOR_PALETTES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Accent Colors</InputLabel>
              <Select
                value={formData.secondaryAccents || ''}
                onChange={(e) => handleFieldChange('secondaryAccents', e.target.value)}
                label="Accent Colors"
              >
                {ACCENT_COLORS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Furniture Section */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
              <Chair sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Furniture & Materials
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Furniture Style</InputLabel>
              <Select
                value={formData.furnitureStyle || ''}
                onChange={(e) => handleFieldChange('furnitureStyle', e.target.value)}
                label="Furniture Style"
              >
                {FURNITURE_STYLES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Storage Preference</InputLabel>
              <Select
                value={formData.storagePreference || 'medium'}
                onChange={(e) => handleFieldChange('storagePreference', e.target.value as 'low' | 'medium' | 'high')}
                label="Storage Preference"
              >
                {STORAGE_PREFERENCES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <MultiSelectChips
              label="Materials"
              options={MATERIALS}
              value={formData.preferredMaterials || []}
              onChange={(vals) => handleFieldChange('preferredMaterials', vals)}
              disabled={disabled}
            />
          </Grid>

          {/* Lighting Section */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
              <Lightbulb sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Lighting
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Lighting Style</InputLabel>
              <Select
                value={formData.artificialLightingStyle || ''}
                onChange={(e) => handleFieldChange('artificialLightingStyle', e.target.value)}
                label="Lighting Style"
              >
                {LIGHTING_STYLES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" gutterBottom>
              Light Temperature
            </Typography>
            <RadioGroup
              row
              value={formData.lightTemperature || 'warm'}
              onChange={(e) => handleFieldChange('lightTemperature', e.target.value as 'warm' | 'neutral' | 'cool')}
            >
              {LIGHT_TEMPERATURE.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  value={opt.value}
                  control={<Radio size="small" disabled={disabled} />}
                  label={opt.label}
                />
              ))}
            </RadioGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => dispatch(goToRoom(currentRoomIndex - 1))}
          disabled={currentRoomIndex === 0}
          sx={{ textTransform: 'none' }}
        >
          Previous Room
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {isGenerated ? (
            <Button
              variant="contained"
              onClick={handleNextRoom}
              endIcon={<ArrowForward />}
              sx={{ textTransform: 'none' }}
            >
              {isLastRoom ? 'View All Moodboards' : 'Next Room'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleCreateMoodboard}
              disabled={disabled || isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Lock />}
              sx={{ textTransform: 'none', px: 3 }}
            >
              {isSubmitting ? 'Creating...' : 'Create Moodboard'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

