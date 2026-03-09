/**
 * TatvaOps Vision - Intent Mode Selector Modal
 * 
 * Entry point modal for design intent collection.
 * User chooses between:
 * - Single Theme for Entire House
 * - Room-wise Themes (Selective Rooms)
 * 
 * This decision affects the entire downstream flow.
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  alpha,
  Chip,
} from '@mui/material';
import {
  Home,
  GridView,
  ArrowForward,
  Lock,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectShowModeSelector,
  setIntentMode,
  closeModeSelector,
  IntentMode,
} from '@/store/slices/intentSlice';

interface IntentModeSelectorProps {
  open?: boolean;
  onClose?: () => void;
}

export function IntentModeSelector({ open: propOpen, onClose }: IntentModeSelectorProps) {
  const dispatch = useAppDispatch();
  const showModeSelector = useAppSelector(selectShowModeSelector);
  const [selectedMode, setSelectedMode] = useState<IntentMode | null>(null);

  const isOpen = propOpen ?? showModeSelector;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      dispatch(closeModeSelector());
    }
  };

  const handleContinue = () => {
    if (selectedMode) {
      dispatch(setIntentMode(selectedMode));
    }
  };

  const modeOptions = [
    {
      value: 'GLOBAL' as IntentMode,
      icon: <Home sx={{ fontSize: 40 }} />,
      title: 'Single Theme for Entire House',
      description: 'One design direction applied intelligently to all rooms. Best for cohesive, unified aesthetics.',
      benefits: [
        'Consistent design language',
        'Faster setup',
        'AI adapts theme per room type',
      ],
      comingSoon: false,
    },
    {
      value: 'ROOM' as IntentMode,
      icon: <GridView sx={{ fontSize: 40 }} />,
      title: 'Room-wise Themes',
      description: 'Customize design intent for each selected room. Best for varied preferences per space.',
      benefits: [
        'Full control per room',
        'Mix different styles',
        'Skip rooms you don\'t need',
      ],
      comingSoon: false, // Enabled ✅
    },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" fontWeight={600}>
          How would you like to design your home?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Choose how you want to define your design preferences
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <RadioGroup
          value={selectedMode || ''}
          onChange={(e) => setSelectedMode(e.target.value as IntentMode)}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {modeOptions.map((option) => (
              <Paper
                key={option.value}
                component={motion.div}
                whileHover={option.comingSoon ? {} : { scale: 1.01 }}
                whileTap={option.comingSoon ? {} : { scale: 0.99 }}
                elevation={0}
                onClick={() => !option.comingSoon && setSelectedMode(option.value)}
                sx={{
                  p: 3,
                  border: 2,
                  borderColor: selectedMode === option.value ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  cursor: option.comingSoon ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  opacity: option.comingSoon ? 0.6 : 1,
                  backgroundColor: selectedMode === option.value 
                    ? alpha('#5C6BC0', 0.04) 
                    : 'background.paper',
                  '&:hover': option.comingSoon ? {} : {
                    borderColor: selectedMode === option.value 
                      ? 'primary.main' 
                      : 'primary.light',
                    backgroundColor: alpha('#5C6BC0', 0.02),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <FormControlLabel
                    value={option.value}
                    control={<Radio sx={{ mt: -0.5 }} disabled={option.comingSoon} />}
                    label=""
                    sx={{ m: 0, mr: 1 }}
                  />
                  
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: selectedMode === option.value 
                        ? alpha('#5C6BC0', 0.1) 
                        : alpha('#37474F', 0.05),
                      color: selectedMode === option.value 
                        ? 'primary.main' 
                        : 'text.secondary',
                    }}
                  >
                    {option.comingSoon ? <Lock sx={{ fontSize: 40 }} /> : option.icon}
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {option.title}
                      </Typography>
                      {option.comingSoon && (
                        <Chip
                          label="Coming Soon"
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: alpha('#6366f1', 0.1),
                            color: '#6366f1',
                          }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {option.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {option.benefits.map((benefit, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor: option.comingSoon ? alpha('#9E9E9E', 0.1) : alpha('#66BB6A', 0.1),
                            color: option.comingSoon ? 'text.disabled' : 'success.dark',
                          }}
                        >
                          <Typography variant="caption" fontWeight={500}>
                            ✓ {benefit}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </RadioGroup>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button
          onClick={handleClose}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleContinue}
          disabled={!selectedMode}
          endIcon={<ArrowForward />}
          sx={{ textTransform: 'none', px: 3 }}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}

