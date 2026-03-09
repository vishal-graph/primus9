/**
 * Feedback Modal - Premium UX Feedback Collection
 * 
 * Dynamic, context-aware feedback form with:
 * - Progress indicator
 * - Minimal typing
 * - Structured inputs
 * - Premium feel
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Chip,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
  Rating,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  ArrowForward,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material';
import { Alert } from '@mui/material';
import type {
  FeedbackFormSection,
  FeedbackField,
  ProjectContext,
  FeedbackData,
} from '@/lib/feedback/feedback-engine';
import { generateFeedbackForm, transformFeedbackData } from '@/lib/feedback/feedback-engine';
import { submitFeedback } from '@/lib/actions/feedback';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void; // Called after successful submission
  onCancel?: () => void; // Called when user cancels (skips feedback)
  context: ProjectContext;
  allowSkip?: boolean; // For admin users
}

export function FeedbackModal({
  open,
  onClose,
  onComplete,
  onCancel,
  context,
  allowSkip = false,
}: FeedbackModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<FeedbackFormSection[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate form on mount
  useEffect(() => {
    if (open) {
      const generatedSections = generateFeedbackForm(context);
      // Filter out conditional sections
      const visibleSections = generatedSections.filter(
        (section) => !section.conditional || section.conditional(context)
      );
      setSections(visibleSections);
      setActiveStep(0);
      setFormData({});
      setError(null);
    }
  }, [open, context]);

  const currentSection = sections[activeStep];
  const isLastStep = activeStep === sections.length - 1;
  const isFirstStep = activeStep === 0;

  const handleNext = () => {
    // Validate current section
    const currentFields = currentSection?.fields || [];
    const requiredFields = currentFields.filter((f) => f.required);
    const missingFields = requiredFields.filter(
      (f) => !formData[f.id] || (Array.isArray(formData[f.id]) && formData[f.id].length === 0)
    );

    if (missingFields.length > 0) {
      setError(`Please complete all required fields`);
      return;
    }

    setError(null);
    if (isLastStep) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const feedbackData = transformFeedbackData(formData, context);
      const result = await submitFeedback(feedbackData);

      if (result.success) {
        onComplete();
      } else {
        // Ensure error is always a string
        // result.error is always a string from submitFeedback
        const errorMessage = result.error || 'Failed to submit feedback';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Feedback submission error:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as any).message)
        : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    setError(null);
  };

  const renderField = (field: FeedbackField) => {
    const value = formData[field.id] ?? field.defaultValue;

    switch (field.type) {
      case 'rating':
        return (
          <Box sx={{ mt: 2 }}>
            <Rating
              value={typeof value === 'number' ? value : 0}
              onChange={(_, newValue) => handleFieldChange(field.id, newValue)}
              size="large"
              max={field.max || 5}
            />
          </Box>
        );

      case 'emoji-scale':
        return (
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            {field.options?.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => handleFieldChange(field.id, option.value)}
                sx={{
                  fontSize: '2rem',
                  height: 'auto',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  backgroundColor:
                    value === option.value ? alpha('#6366f1', 0.1) : 'transparent',
                  border: value === option.value ? '2px solid #6366f1' : '2px solid transparent',
                  '&:hover': {
                    backgroundColor: alpha('#6366f1', 0.05),
                  },
                }}
              />
            ))}
          </Box>
        );

      case 'dropdown':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <Select
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>
                {field.placeholder || 'Select an option'}
              </MenuItem>
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'slider':
        return (
          <Box sx={{ mt: 3, px: 2 }}>
            <Slider
              value={typeof value === 'number' ? value : field.min || 0}
              onChange={(_, newValue) => handleFieldChange(field.id, newValue)}
              min={field.min || 0}
              max={field.max || 10}
              step={field.step || 1}
              marks
              valueLabelDisplay="on"
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {field.min || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {field.max || 10}
              </Typography>
            </Box>
          </Box>
        );

      case 'toggle':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!value}
                    onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                  />
                }
                label={field.label}
              />
            </FormGroup>
          </FormControl>
        );

      case 'multi-select':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <FormGroup>
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={Array.isArray(value) && value.includes(option.value)}
                      onChange={(e) => {
                        const current = Array.isArray(value) ? value : [];
                        if (e.target.checked) {
                          handleFieldChange(field.id, [...current, option.value]);
                        } else {
                          handleFieldChange(
                            field.id,
                            current.filter((v) => v !== option.value)
                          );
                        }
                      }}
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
          </FormControl>
        );

      case 'text':
        return (
          <TextField
            fullWidth
            multiline={field.id === 'open_feedback'}
            rows={field.id === 'open_feedback' ? 3 : 1}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            sx={{ mt: 2 }}
          />
        );

      case 'ranking':
        // Simplified ranking - just multi-select for now
        // Full drag-and-drop can be added later
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <FormGroup>
              {field.options?.map((option, index) => (
                <Box key={option.value} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <Chip
                    label={index + 1}
                    size="small"
                    sx={{ mr: 1, minWidth: 32 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Array.isArray(value) && value.includes(option.value)}
                        onChange={(e) => {
                          const current = Array.isArray(value) ? value : [];
                          if (e.target.checked) {
                            handleFieldChange(field.id, [...current, option.value]);
                          } else {
                            handleFieldChange(
                              field.id,
                              current.filter((v) => v !== option.value)
                            );
                          }
                        }}
                      />
                    }
                    label={option.label}
                    sx={{ flex: 1 }}
                  />
                </Box>
              ))}
            </FormGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Select all that apply, order matters
            </Typography>
          </FormControl>
        );

      default:
        return null;
    }
  };

  if (!currentSection) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : (onCancel || onClose)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h6" fontWeight={600}>
          Share Your Feedback
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 400 }}>
        {/* Progress Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
          {sections.map((section, index) => (
            <Step key={section.id}>
              <StepLabel>{section.title}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Current Section */}
        <Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {currentSection.title}
          </Typography>
          {currentSection.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {currentSection.description}
            </Typography>
          )}

          {/* Fields */}
          {currentSection.fields
            .filter((field) => !field.conditional || field.conditional(context))
            .map((field) => (
              <Box key={field.id} sx={{ mb: 4 }}>
                <FormLabel required={field.required} sx={{ fontWeight: 500 }}>
                  {field.label}
                </FormLabel>
                {field.description && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {field.description}
                  </Typography>
                )}
                {renderField(field)}
              </Box>
            ))}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                onClose();
              }
            }}
            disabled={submitting}
            startIcon={<Close />}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isFirstStep && (
              <Button
                onClick={handleBack}
                disabled={submitting}
                startIcon={<ArrowBack />}
                sx={{ textTransform: 'none' }}
              >
                Back
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={submitting}
              endIcon={
                submitting ? (
                  <CircularProgress size={16} />
                ) : isLastStep ? (
                  <CheckCircle />
                ) : (
                  <ArrowForward />
                )
              }
              sx={{ textTransform: 'none' }}
            >
              {submitting
                ? 'Submitting...'
                : isLastStep
                ? 'Submit & Download'
                : 'Next'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

