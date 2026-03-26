/**
 * TatvaOps Vision - Global Intent Form
 * 
 * Comprehensive design intent form for "Single Theme for Entire House" flow.
 * Collects rich, structured intent data that AI will map to each room.
 * 
 * Form becomes READ-ONLY once generation starts.
 * All fields use dropdowns/controlled inputs for consistent AI prompts.
 */

'use client';

import { useState, useCallback, useEffect, type MouseEvent } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Slider,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Button,
  Alert,
  Tooltip,
  Divider,
  CircularProgress,
  alpha,
  OutlinedInput,
  SelectChangeEvent,
  ListItemText,
  ListItemIcon,
  ListSubheader,
  IconButton,
} from '@mui/material';
import { Close, Check, Done } from '@mui/icons-material';
import {
  Lock,
  Info,
  Palette,
  Chair,
  Lightbulb,
  People,
  AttachMoney,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectGlobalIntent,
  updateGlobalIntent,
  lockGlobalIntent,
  IntentPayload,
} from '@/store/slices/intentSlice';
import {
  INTERIOR_STYLES,
  INTERIOR_STYLE_SUBCATEGORIES,
  MOOD_OPTIONS,
  COLOR_PALETTES,
  ACCENT_COLORS,
  MATERIALS,
  TEXTURES,
  FURNITURE_STYLES,
  LAYOUT_PREFERENCES,
  STORAGE_PREFERENCES,
  LIGHTING_STYLES,
  LIGHT_TEMPERATURE,
  HOUSEHOLD_TYPES,
  ENTERTAINMENT_FOCUS,
  BUDGET_RANGES,
  EXECUTION_PRIORITIES,
  MAINTENANCE_TOLERANCE,
} from '@/constants/intent-options';
import { slideFromBottomVariants } from '@/motion/pageTransitions';

/** Room shape needed to compute BHK for budget default */
interface RoomForBhk {
  type: string;
}

interface GlobalIntentFormProps {
  projectId: string;
  isLocked?: boolean;
  onSubmit: (payload: Partial<IntentPayload>) => Promise<void>;
  isSubmitting?: boolean;
  /** Rooms from floor plan; used to set budget from BHK (≤2 → budget, 3 → moderate, 4+ → luxury) */
  rooms?: RoomForBhk[];
  /** When provided (e.g. in "Generate Remaining" dialog), prefill form with this payload so user can edit */
  initialPayload?: Partial<IntentPayload>;
}

// Form section component
function FormSection({ 
  icon, 
  title, 
  description, 
  children 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      component={motion.div}
      variants={slideFromBottomVariants}
      initial="hidden"
      animate="visible"
      sx={{
        p: 3,
        mb: 3,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 1.5,
            backgroundColor: alpha('#5C6BC0', 0.1),
            color: 'primary.main',
            display: 'flex',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Box>
      {children}
    </Paper>
  );
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
  { bg: '#E8EAF6', text: '#303F9F', border: '#9FA8DA' }, // Indigo
  { bg: '#F1F8E9', text: '#558B2F', border: '#C5E1A5' }, // Light Green
];

// Multi-select chip component with improved UX
function MultiSelectChips({
  label,
  options,
  value,
  onChange,
  disabled,
  tooltip,
  maxSelection,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  tooltip?: string;
  maxSelection?: number;
}) {
  const [open, setOpen] = useState(false);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const val = event.target.value;
    const newValue = typeof val === 'string' ? val.split(',') : val;
    // Apply max selection limit if specified
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

  const handleSelectAll = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    const all = options.map((o) => o.value);
    onChange(maxSelection ? all.slice(0, maxSelection) : all);
  };

  const handleClearAll = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    onChange([]);
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
        {/* Header with selection count, select all / clear, and Done */}
        <ListSubheader
          onMouseDown={(e) => e.stopPropagation()}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            py: 1,
            position: 'sticky',
            top: 0,
            zIndex: 1,
            lineHeight: 1.2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
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
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
            <Button
              size="small"
              variant="text"
              disabled={disabled || options.length === 0}
              onClick={handleSelectAll}
              sx={{ textTransform: 'none', minWidth: 0, px: 0.75 }}
            >
              Select all
            </Button>
            <Typography variant="caption" color="text.disabled">
              ·
            </Typography>
            <Button
              size="small"
              variant="text"
              disabled={disabled || value.length === 0}
              onClick={handleClearAll}
              sx={{ textTransform: 'none', minWidth: 0, px: 0.75 }}
            >
              Clear
            </Button>
          </Box>
        </ListSubheader>

        {options.map((option, index) => {
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
      {tooltip && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {tooltip}
        </Typography>
      )}
    </FormControl>
  );
}

/** Derive default budget from BHK: ≤2 → budget, 3 → moderate, 4+ → luxury */
function getDefaultBudgetFromBhk(rooms?: RoomForBhk[]): string {
  if (!rooms?.length) return '';
  const bhk = rooms.filter((r) => r.type === 'BEDROOM').length;
  if (bhk <= 2) return 'budget';
  if (bhk < 4) return 'moderate';
  return 'luxury';
}

function getFormDefaultsFromPayload(payload: Partial<IntentPayload>, defaultBudget: string) {
  return {
    interiorStyles: payload.interiorStyles || [],
    mood: payload.mood || '',
    culturalInfluence: payload.culturalInfluence || '',
    primaryColorPalette: payload.primaryColorPalette || '',
    secondaryAccents: payload.secondaryAccents || '',
    preferredMaterials: payload.preferredMaterials || [],
    textures: payload.textures || '',
    furnitureStyle: payload.furnitureStyle || '',
    comfortVsAesthetics: payload.comfortVsAesthetics ?? 50,
    layoutPreference: payload.layoutPreference || 'mixed',
    storagePreference: (payload.storagePreference || 'medium') as 'low' | 'medium' | 'high',
    naturalLightImportance: payload.naturalLightImportance ?? 70,
    artificialLightingStyle: payload.artificialLightingStyle || '',
    lightTemperature: (payload.lightTemperature || 'warm') as 'warm' | 'cool' | 'neutral',
    householdType: payload.householdType || 'family',
    hasKids: payload.hasKids || false,
    hasElders: payload.hasElders || false,
    hasPets: payload.hasPets || false,
    workFromHome: payload.workFromHome || false,
    entertainmentFocus: payload.entertainmentFocus || 'medium',
    budgetRange: payload.budgetRange || defaultBudget || '',
    executionPriority: payload.executionPriority || 'design',
    maintenanceTolerance: payload.maintenanceTolerance || 'medium',
  };
}

export function GlobalIntentForm({ 
  projectId, 
  isLocked = false,
  onSubmit,
  isSubmitting = false,
  rooms = [],
  initialPayload,
}: GlobalIntentFormProps) {
  const dispatch = useAppDispatch();
  const globalIntent = useAppSelector(selectGlobalIntent);
  const defaultBudget = getDefaultBudgetFromBhk(rooms);
  // Prefer initialPayload (e.g. from "Generate Remaining" dialog) so form is prefilled with last data
  const payload = initialPayload ?? globalIntent?.payload ?? {};

  // Local form state for controlled inputs — seed from initialPayload or Redux so user sees last filled data
  const [formData, setFormData] = useState<Partial<IntentPayload>>(() =>
    getFormDefaultsFromPayload(payload, defaultBudget || '')
  );

  // Set budget from BHK when rooms available and no budget in payload yet
  useEffect(() => {
    if (!defaultBudget) return;
    setFormData((prev) => (prev.budgetRange ? prev : { ...prev, budgetRange: defaultBudget }));
    if (!payload.budgetRange) dispatch(updateGlobalIntent({ budgetRange: defaultBudget }));
  }, [defaultBudget, payload.budgetRange, dispatch]);

  // Update form when payload changes (e.g., when existing intent is loaded or dialog opens with initialPayload)
  useEffect(() => {
    const source = payload && Object.keys(payload).length > 0 ? payload : null;
    if (source) {
      setFormData(getFormDefaultsFromPayload(source, defaultBudget || ''));
    }
  }, [initialPayload ?? globalIntent?.payload, defaultBudget]);

  const handleFieldChange = useCallback(<K extends keyof IntentPayload>(
    field: K,
    value: IntentPayload[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Also update Redux store
    dispatch(updateGlobalIntent({ [field]: value }));
  }, [dispatch]);

  const handleSubmit = async () => {
    // Lock the intent before starting generation
    dispatch(lockGlobalIntent());
    await onSubmit(formData);
  };

  const disabled = isLocked || isSubmitting;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Locked Notice */}
      {isLocked && (
        <Alert 
          severity="info" 
          icon={<Lock />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            Design intent is locked. Moodboard generation is in progress or complete.
            To make changes, you can regenerate moodboards with updated preferences.
          </Typography>
        </Alert>
      )}

      {/* A. Overall Style Direction */}
      <FormSection
        icon={<Palette />}
        title="Overall Style Direction"
        description="Define the core aesthetic and mood for your home"
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600 }}>
              Interior Style
            </Typography>
            <RadioGroup
              row
              value={formData.interiorStyles?.[0] ?? ''}
              onChange={(e) => handleFieldChange('interiorStyles', e.target.value ? [e.target.value] : [])}
            >
              {INTERIOR_STYLES.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  value={opt.value}
                  control={<Radio size="small" disabled={disabled} />}
                  label={opt.label}
                  sx={{ mr: 3 }}
                />
              ))}
            </RadioGroup>
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
              <InputLabel id="style-subcategory-label" shrink>
                Style sub-category (optional)
              </InputLabel>
              <Select
                labelId="style-subcategory-label"
                value={formData.culturalInfluence || ''}
                onChange={(e) => handleFieldChange('culturalInfluence', e.target.value)}
                label="Style sub-category (optional)"
                displayEmpty
                renderValue={(v) => (v === '' ? 'None' : undefined)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {(() => {
                  const raw = formData.interiorStyles?.flatMap(
                    (s) => INTERIOR_STYLE_SUBCATEGORIES[s] ?? []
                  ) ?? [];
                  const byValue = new Map(raw.map((o) => [o.value, o]));
                  return Array.from(byValue.values());
                })().map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </FormSection>

      {/* B. Color & Material Preferences */}
      <FormSection
        icon={<Palette />}
        title="Color & Material Preferences"
        description="Choose your preferred color palette and materials"
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Primary Color Palette</InputLabel>
              <Select
                value={formData.primaryColorPalette || ''}
                onChange={(e) => handleFieldChange('primaryColorPalette', e.target.value)}
                label="Primary Color Palette"
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
          <Grid item xs={12}>
            <MultiSelectChips
              label="Preferred Materials"
              options={MATERIALS}
              value={formData.preferredMaterials || []}
              onChange={(vals) => handleFieldChange('preferredMaterials', vals)}
              disabled={disabled}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Textures</InputLabel>
              <Select
                value={formData.textures || ''}
                onChange={(e) => handleFieldChange('textures', e.target.value)}
                label="Textures"
              >
                {TEXTURES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </FormSection>

      {/* C. Furniture & Layout Preferences */}
      <FormSection
        icon={<Chair />}
        title="Furniture & Layout Preferences"
        description="Define furniture style and spatial preferences"
      >
        <Grid container spacing={2.5}>
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
            <Typography variant="body2" gutterBottom>
              Comfort vs Aesthetics Priority
            </Typography>
            <Box sx={{ px: 1 }}>
              <Slider
                value={formData.comfortVsAesthetics ?? 50}
                onChange={(_, val) => handleFieldChange('comfortVsAesthetics', val as number)}
                disabled={disabled}
                marks={[
                  { value: 0, label: 'Comfort' },
                  { value: 50, label: 'Balanced' },
                  { value: 100, label: 'Aesthetics' },
                ]}
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" gutterBottom>
              Layout Preference
            </Typography>
            <RadioGroup
              row
              value={formData.layoutPreference || 'mixed'}
              onChange={(e) => handleFieldChange('layoutPreference', e.target.value as 'open' | 'enclosed' | 'mixed')}
            >
              {LAYOUT_PREFERENCES.map((opt) => (
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
      </FormSection>

      {/* D. Lighting Preferences */}
      <FormSection
        icon={<Lightbulb />}
        title="Lighting Preferences"
        description="Natural and artificial lighting preferences"
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Natural Light Importance
            </Typography>
            <Box sx={{ px: 2, pb: 3 }}>
              <Slider
                value={formData.naturalLightImportance ?? 70}
                onChange={(_, val) => handleFieldChange('naturalLightImportance', val as number)}
                disabled={disabled}
                marks={[
                  { value: 0, label: 'Not Important' },
                  { value: 50, label: 'Moderate' },
                  { value: 100, label: 'Very Important' },
                ]}
                sx={{ 
                  mt: 2,
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.75rem',
                    top: 30,
                  },
                }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Artificial Lighting Style</InputLabel>
              <Select
                value={formData.artificialLightingStyle || ''}
                onChange={(e) => handleFieldChange('artificialLightingStyle', e.target.value)}
                label="Artificial Lighting Style"
              >
                {LIGHTING_STYLES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Light Temperature
            </Typography>
            <RadioGroup
              value={formData.lightTemperature || 'warm'}
              onChange={(e) => handleFieldChange('lightTemperature', e.target.value as 'warm' | 'neutral' | 'cool')}
            >
              {LIGHT_TEMPERATURE.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  value={opt.value}
                  control={<Radio size="small" disabled={disabled} />}
                  label={opt.label}
                  sx={{ mb: 0.5 }}
                />
              ))}
            </RadioGroup>
          </Grid>
        </Grid>
      </FormSection>

      {/* E. Lifestyle & Usage */}
      <FormSection
        icon={<People />}
        title="Lifestyle & Usage"
        description="Help AI understand your living situation"
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Household Type</InputLabel>
              <Select
                value={formData.householdType || 'family'}
                onChange={(e) => handleFieldChange('householdType', e.target.value as any)}
                label="Household Type"
              >
                {HOUSEHOLD_TYPES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Entertainment Focus</InputLabel>
              <Select
                value={formData.entertainmentFocus || 'medium'}
                onChange={(e) => handleFieldChange('entertainmentFocus', e.target.value as 'low' | 'medium' | 'high')}
                label="Entertainment Focus"
              >
                {ENTERTAINMENT_FOCUS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" gutterBottom>
              Household Members
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hasKids || false}
                    onChange={(e) => handleFieldChange('hasKids', e.target.checked)}
                    disabled={disabled}
                    size="small"
                  />
                }
                label="Has Children"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hasElders || false}
                    onChange={(e) => handleFieldChange('hasElders', e.target.checked)}
                    disabled={disabled}
                    size="small"
                  />
                }
                label="Has Elderly Members"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hasPets || false}
                    onChange={(e) => handleFieldChange('hasPets', e.target.checked)}
                    disabled={disabled}
                    size="small"
                  />
                }
                label="Has Pets"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.workFromHome || false}
                    onChange={(e) => handleFieldChange('workFromHome', e.target.checked)}
                    disabled={disabled}
                    size="small"
                  />
                }
                label="Work from Home"
              />
            </Box>
          </Grid>
        </Grid>
      </FormSection>

      {/* F. Budget & Practical Constraints */}
      <FormSection
        icon={<AttachMoney />}
        title="Budget & Practical Constraints"
        description="Set realistic expectations for execution"
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Budget Range</InputLabel>
              <Select
                value={formData.budgetRange || ''}
                onChange={(e) => handleFieldChange('budgetRange', e.target.value)}
                label="Budget Range"
              >
                {BUDGET_RANGES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" disabled={disabled}>
              <InputLabel>Maintenance Tolerance</InputLabel>
              <Select
                value={formData.maintenanceTolerance || 'medium'}
                onChange={(e) => handleFieldChange('maintenanceTolerance', e.target.value as 'low' | 'medium' | 'high')}
                label="Maintenance Tolerance"
              >
                {MAINTENANCE_TOLERANCE.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" gutterBottom>
              Execution Priority
            </Typography>
            <RadioGroup
              row
              value={formData.executionPriority || 'design'}
              onChange={(e) => handleFieldChange('executionPriority', e.target.value as 'design' | 'cost' | 'speed')}
            >
              {EXECUTION_PRIORITIES.map((opt) => (
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
      </FormSection>

      {/* Submit Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={disabled || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Lock />}
          sx={{ 
            textTransform: 'none',
            px: 4,
            py: 1.5,
          }}
        >
          {isSubmitting ? 'Generating Moodboards...' : 'Lock Intent & Generate Moodboards'}
        </Button>
      </Box>

      {/* Warning Notice */}
      {!isLocked && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            ⚠️ Once you click "Lock Intent & Generate", you cannot edit these preferences until generation completes.
            AI will create room-specific moodboards based on your selections.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

