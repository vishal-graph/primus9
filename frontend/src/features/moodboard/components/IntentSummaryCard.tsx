/**
 * TatvaOps Vision - Intent Summary Card
 * 
 * Displays a room's design intent in a compact, visual format
 * Used in the room-wise moodboard gallery view
 */

'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  IconButton,
  Collapse,
  alpha,
} from '@mui/material';
import {
  Palette,
  Chair,
  Lightbulb,
  ExpandMore,
  ExpandLess,
  Edit,
} from '@mui/icons-material';
import { IntentPayload } from '@/store/slices/intentSlice';
import {
  INTERIOR_STYLES,
  MOOD_OPTIONS,
  COLOR_PALETTES,
  ACCENT_COLORS,
  FURNITURE_STYLES,
  LIGHTING_STYLES,
  MATERIALS,
} from '@/constants/intent-options';

interface IntentSummaryCardProps {
  intent: Partial<IntentPayload>;
  roomName: string;
  onEditIntent?: () => void;
}

// Helper to get label from value
const getLabel = (options: Array<{ value: string; label: string }>, value: string) => {
  return options.find(opt => opt.value === value)?.label || value;
};

// Color palette color mappings (simplified representation)
const COLOR_SWATCHES: Record<string, string[]> = {
  'neutral-whites': ['#FFFFFF', '#F5F5F5', '#E8E8E8', '#D3D3D3'],
  'warm-earth-tones': ['#D2691E', '#CD853F', '#DEB887', '#F4A460'],
  'cool-grays': ['#708090', '#778899', '#A9A9A9', '#C0C0C0'],
  'soft-pastels': ['#FFB6C1', '#E0BBE4', '#B0E0E6', '#FFE4B5'],
  'bold-jewel-tones': ['#4B0082', '#008B8B', '#8B008B', '#B8860B'],
  'monochrome': ['#000000', '#404040', '#808080', '#FFFFFF'],
  'navy-gold': ['#000080', '#FFD700', '#1E3A8A', '#F59E0B'],
  'green-natural': ['#228B22', '#90EE90', '#8FBC8F', '#556B2F'],
  'terracotta-rust': ['#E2725B', '#C04000', '#B7410E', '#CC5500'],
  'blush-rose': ['#FFC0CB', '#FF69B4', '#DB7093', '#C71585'],
  'black-white': ['#000000', '#FFFFFF', '#1A1A1A', '#F0F0F0'],
  'ocean-blues': ['#006994', '#4682B4', '#87CEEB', '#B0E0E6'],
  'forest-green': ['#228B22', '#2E8B57', '#3CB371', '#8FBC8F'],
  'sunshine-yellow': ['#FFD700', '#FFEB3B', '#FDD835', '#F9A825'],
};

export function IntentSummaryCard({ intent, roomName, onEditIntent }: IntentSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Get display values
  const styles = intent.interiorStyles?.map(style => getLabel(INTERIOR_STYLES, style)) || [];
  const mood = intent.mood ? getLabel(MOOD_OPTIONS, intent.mood) : null;
  const colorPalette = intent.primaryColorPalette ? getLabel(COLOR_PALETTES, intent.primaryColorPalette) : null;
  const accentColor = intent.secondaryAccents ? getLabel(ACCENT_COLORS, intent.secondaryAccents) : null;
  const furnitureStyle = intent.furnitureStyle ? getLabel(FURNITURE_STYLES, intent.furnitureStyle) : null;
  const lightingStyle = intent.artificialLightingStyle ? getLabel(LIGHTING_STYLES, intent.artificialLightingStyle) : null;
  const materials = intent.preferredMaterials?.map(mat => getLabel(MATERIALS, mat)) || [];
  const colorSwatches = intent.primaryColorPalette ? COLOR_SWATCHES[intent.primaryColorPalette] || [] : [];

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          backgroundColor: alpha('#5C6BC0', 0.04),
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Design Intent
        </Typography>
        {onEditIntent && (
          <IconButton size="small" onClick={onEditIntent} sx={{ color: 'primary.main' }}>
            <Edit fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        {/* Styles Section */}
        {styles.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Palette sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
                Style
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {styles.slice(0, 2).map((style, idx) => (
                <Chip
                  key={idx}
                  label={style}
                  size="small"
                  sx={{
                    backgroundColor: alpha('#5C6BC0', 0.1),
                    color: 'primary.dark',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Mood */}
        {mood && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
              Mood
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
              {mood}
            </Typography>
          </Box>
        )}

        {/* Colors Section */}
        {colorPalette && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase" gutterBottom>
              Colors
            </Typography>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              {colorPalette}
            </Typography>
            {colorSwatches.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {colorSwatches.map((color, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: color,
                      border: 1,
                      borderColor: 'divider',
                    }}
                  />
                ))}
              </Box>
            )}
            {accentColor && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Accent: {accentColor}
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Furniture Section */}
        {furnitureStyle && (
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chair sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
                Furniture
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={500}>
              {furnitureStyle}
            </Typography>
            {intent.storagePreference && (
              <Typography variant="caption" color="text.secondary">
                Storage: {intent.storagePreference.charAt(0).toUpperCase() + intent.storagePreference.slice(1)}
              </Typography>
            )}
          </Box>
        )}

        {/* Lighting Section */}
        {lightingStyle && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Lightbulb sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
                Lighting
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={500}>
              {lightingStyle}
            </Typography>
            {intent.lightTemperature && (
              <Typography variant="caption" color="text.secondary">
                Temperature: {intent.lightTemperature.charAt(0).toUpperCase() + intent.lightTemperature.slice(1)}
              </Typography>
            )}
          </Box>
        )}

        {/* Expandable Materials Section */}
        {materials.length > 0 && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                py: 0.5,
              }}
              onClick={() => setExpanded(!expanded)}
            >
              <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase">
                Materials ({materials.length})
              </Typography>
              <IconButton size="small">
                {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            </Box>
            <Collapse in={expanded}>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                {materials.map((material, idx) => (
                  <Chip
                    key={idx}
                    label={material}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            </Collapse>
          </>
        )}
      </Box>
    </Paper>
  );
}
