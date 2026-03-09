'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  CircularProgress,
  Alert
} from '@mui/material';
import { completeOnboarding, getUserProfile } from '@/lib/actions/user';
import LocationPicker from '@/components/LocationPicker';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const result = await getUserProfile();
        if (result?.success && result.data?.onboarded) {
          router.push('/entry');
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setLoading(false);
      }
    }
    checkOnboarding();
  }, [router]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!phone || phone.length < 10) {
      errors.phone = 'Please enter a valid phone number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: 'name' | 'phone') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    if (field === 'name') {
      setName(value);
    } else if (field === 'phone') {
      setPhone(value);
    }
    
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await completeOnboarding({
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim() || undefined,
      });
      
      if (result.success) {
        router.push('/entry');
      } else {
        setError(result.error || 'Failed to complete onboarding');
        setSubmitting(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" gutterBottom fontWeight={600} align="center">
            Welcome to TatvaOps!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph align="center" sx={{ mb: 4 }}>
            Let's set up your profile to get started with your design projects.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              variant="outlined"
              value={name}
              onChange={handleInputChange('name')}
              disabled={submitting}
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
              required
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Phone Number"
              variant="outlined"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={handleInputChange('phone')}
              disabled={submitting}
              error={!!fieldErrors.phone}
              helperText={fieldErrors.phone}
              required
              sx={{ mb: 3 }}
            />

            <Box sx={{ mb: 3 }}>
              <LocationPicker
                value={location}
                onChange={handleLocationChange}
                error={!!fieldErrors.location}
                helperText={fieldErrors.location}
              />
            </Box>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ 
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 1.5
              }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Get Started'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
