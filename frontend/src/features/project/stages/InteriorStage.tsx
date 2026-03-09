/**
 * TatvaOps Vision - Interior View Stage
 * 
 * Features:
 * - Full-width immersive image viewer
 * - Camera angle switcher
 * - 360° view controls
 * - Enter component mode
 * 
 * Design: Immersive, Sketchfab/Unity-like viewer
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Slider,
  Paper,
  Chip,
  alpha,
} from '@mui/material';
import {
  Videocam,
  ThreeSixty,
  Fullscreen,
  Download,
  Refresh,
  ArrowForward,
} from '@mui/icons-material';
import { imageFadeVariants } from '@/motion/pageTransitions';
import { useAppSelector } from '@/store';
import { selectRooms } from '@/store/projectSlice';

interface InteriorStageProps {
  projectId: string;
}

export function InteriorStage({ projectId }: InteriorStageProps) {
  const rooms = useAppSelector(selectRooms);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(rooms[0]?.id || null);
  const [viewAngle, setViewAngle] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [interiorUrl, setInteriorUrl] = useState<string | null>('/placeholder-interior.jpg');

  const handleGenerateView = () => {
    setIsGenerating(true);
    // TODO: Call server action
    setTimeout(() => {
      setIsGenerating(false);
      setInteriorUrl('/placeholder-interior.jpg');
    }, 2000);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 4, pb: 2 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Interior View
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generate photorealistic 3D interior visualizations
        </Typography>
      </Box>

      {/* Room Selector */}
      <Box sx={{ px: 4, pb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {rooms.map(room => (
          <Chip
            key={room.id}
            label={room.name}
            onClick={() => setSelectedRoom(room.id)}
            color={selectedRoom === room.id ? 'primary' : 'default'}
            variant={selectedRoom === room.id ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {/* Viewer */}
      <Box sx={{ flexGrow: 1, px: 4, pb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            height: '100%',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: 'background.elevated',
          }}
        >
          {isGenerating ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Videocam
                  sx={{
                    fontSize: 64,
                    color: 'primary.main',
                    mb: 2,
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
                <Typography variant="body1">
                  Generating interior view...
                </Typography>
              </Box>
            </Box>
          ) : interiorUrl ? (
            <Box
              component={motion.div}
              variants={imageFadeVariants}
              initial="hidden"
              animate="visible"
              sx={{ height: '100%', position: 'relative' }}
            >
              <img
                src={interiorUrl}
                alt="Interior view"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />

              {/* Controls Overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: 3,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                }}
              >
                {/* Camera Angle Slider */}
                <Box
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <ThreeSixty sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2" fontWeight={500}>
                      Camera Angle: {viewAngle}°
                    </Typography>
                  </Box>
                  <Slider
                    value={viewAngle}
                    onChange={(_, value) => setViewAngle(value as number)}
                    min={0}
                    max={360}
                    step={45}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Box>

              {/* Top Controls */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  display: 'flex',
                  gap: 1,
                }}
              >
                <IconButton
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                  }}
                >
                  <Fullscreen />
                </IconButton>
                <IconButton
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                  }}
                >
                  <Download />
                </IconButton>
                <IconButton
                  onClick={handleGenerateView}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                  }}
                >
                  <Refresh />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Videocam sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No interior view generated
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleGenerateView}
                  sx={{ mt: 2, textTransform: 'none' }}
                >
                  Generate View
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Action Bar */}
      <Box sx={{ px: 4, pb: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleGenerateView}
          disabled={isGenerating}
          sx={{ textTransform: 'none' }}
        >
          Regenerate
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          sx={{ textTransform: 'none' }}
        >
          Enter Component Mode
        </Button>
      </Box>
    </Box>
  );
}

