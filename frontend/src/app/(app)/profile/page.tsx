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
  Grid,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { Edit, Save, Cancel } from '@mui/icons-material';
import { getUserProfile, updateUserProfile, UserProfile } from '@/lib/actions/user';
import LocationPicker from '@/components/LocationPicker';

export default function ProfilePage() {
  const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    location: '',
    website: '',
    company: '',
    occupation: '',
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const result = await getUserProfile();
        if (result?.success && result.data) {
          setProfile(result.data);
          setFormData({
            name: result.data.name || '',
            phone: result.data.phone || '',
            bio: result.data.bio || '',
            location: result.data.location || '',
            website: result.data.website || '',
            company: result.data.company || '',
            occupation: result.data.occupation || '',
          });
        } else {
          setError(result?.error || 'Failed to load profile');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleLocationChange = (location: string) => {
    setFormData((prev) => ({ ...prev, location }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateUserProfile(formData);
    if (result.success && result.data) {
      setProfile(result.data);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        company: profile.company || '',
        occupation: profile.occupation || '',
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Profile Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Manage your personal information and preferences
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>Profile updated successfully!</Alert>}

      <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
        {/* Profile Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            src={profile?.avatarUrl}
            alt={profile?.name || 'User'}
            sx={{ width: 80, height: 80, mr: 3 }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {profile?.name || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profile?.email}
            </Typography>
          </Box>
          {!isEditing && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* Profile Form */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              disabled={!isEditing}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => {
                // Only allow digits, max 10 characters
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData((prev) => ({ ...prev, phone: value }));
              }}
              disabled={!isEditing}
              placeholder="9876543210"
              type="tel"
              inputProps={{ 
                inputMode: 'numeric', 
                pattern: '[0-9]*',
                maxLength: 10,
              }}
              helperText={isEditing ? `${formData.phone.length}/10 digits` : undefined}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bio"
              value={formData.bio}
              onChange={handleInputChange('bio')}
              disabled={!isEditing}
              multiline
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </Grid>
          <Grid item xs={12}>
            {isEditing ? (
              <LocationPicker
                value={formData.location || ''}
                onChange={handleLocationChange}
              />
            ) : (
              <TextField
                fullWidth
                label="Location"
                value={formData.location || ''}
                disabled
                placeholder="No location set"
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Website"
              value={formData.website}
              onChange={handleInputChange('website')}
              disabled={!isEditing}
              placeholder="https://example.com"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Company"
              value={formData.company}
              onChange={handleInputChange('company')}
              disabled={!isEditing}
              placeholder="Your company name"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Occupation"
              value={formData.occupation}
              onChange={handleInputChange('occupation')}
              disabled={!isEditing}
              placeholder="Your job title"
            />
          </Grid>
        </Grid>

        {/* Action Buttons */}
        {isEditing && (
          <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={saving}
            >
              Save Changes
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

