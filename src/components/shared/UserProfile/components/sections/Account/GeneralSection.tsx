import React, { useState, useRef, useCallback } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Tooltip,
  Grid2 as Grid,
  Alert,
  useTheme
} from '@mui/material';
import { CloudUpload, Person } from '@mui/icons-material';
import { GeneralSectionProps } from '../../../types';

/**
 * General Section - Personal information and avatar management
 */
export const GeneralSection: React.FC<GeneralSectionProps> = ({
  profile,
  mode,
  loading,
  withAvatar = true,
  firstNameHelperText,
  surnameHelperText,
  emailHelperText,
  onProfileUpdate,
  onSave,
  reactory
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emailValid, setEmailValid] = useState(reactory.utils.isEmail(profile.email || ''));

  const canEdit = mode === 'edit' || mode === 'admin';
  const isProfileOwner = profile.id === reactory.getUser()?.id;

  // Validation
  const saveDisabled = !emailValid ||
    !profile.firstName?.trim() ||
    !profile.lastName?.trim() ||
    profile.firstName.trim().length < 2 ||
    profile.lastName.trim().length < 2;

  // Event handlers
  const handleAvatarClick = useCallback(() => {
    if (canEdit && withAvatar) {
      fileInputRef.current?.click();
    }
  }, [canEdit, withAvatar]);

  const handleAvatarUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      reactory.createNotification('Please select a valid image file', { type: 'error' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      reactory.createNotification('Image file size must be less than 2MB', { type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const avatarData = e.target?.result as string;
      onProfileUpdate({ avatar: avatarData });
    };
    reader.readAsDataURL(file);
  }, [onProfileUpdate, reactory]);

  const handleFirstNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onProfileUpdate({ firstName: event.target.value });
  }, [onProfileUpdate]);

  const handleLastNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onProfileUpdate({ lastName: event.target.value });
  }, [onProfileUpdate]);

  const handleEmailChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const email = event.target.value;
    onProfileUpdate({ email });
    setEmailValid(reactory.utils.isEmail(email));
  }, [onProfileUpdate, reactory.utils]);

  const handleMobileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onProfileUpdate({ mobileNumber: event.target.value });
  }, [onProfileUpdate]);

  const handleSave = useCallback(async () => {
    if (!saveDisabled && onSave) {
      await onSave(profile);
    }
  }, [saveDisabled, onSave, profile]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !saveDisabled) {
      handleSave();
    }
  }, [saveDisabled, handleSave]);

  // Common TextField props
  const textFieldProps = {
    fullWidth: true,
    variant: 'outlined' as const,
    InputLabelProps: { shrink: true },
    sx: { mb: 2 }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography
        variant="h6"
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: theme.palette.primary.main
        }}
      >
        <Person />
        General Information
      </Typography>

      <Grid container spacing={3}>
        {/* Avatar Section */}
        {withAvatar && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,              
            }}>
              <Tooltip title={canEdit ? "Click to change avatar" : "Profile picture"}>
                <Avatar
                  src={reactory.getAvatar(profile, null)}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  onClick={handleAvatarClick}
                  sx={{
                    width: 120,
                    height: 120,
                    cursor: canEdit ? 'pointer' : 'default',
                    border: 3,
                    borderColor: canEdit ? 'primary.main' : 'grey.300',
                    transition: 'border-color 0.2s ease-in-out',
                    '&:hover': canEdit ? {
                      borderColor: 'primary.dark',
                      boxShadow: 3
                    } : {}
                  }}
                >
                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                </Avatar>
              </Tooltip>

              {canEdit && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<CloudUpload />}
                    onClick={handleAvatarClick}
                    size="small"
                  >
                    Upload Photo
                  </Button>
                  <Typography variant="caption" color="text.secondary" align="center">
                    Recommended: Square image, max 2MB
                  </Typography>
                </>
              )}
            </Box>
          </Grid>
        )}

        {/* Personal Information Form */}
        <Grid size={{ xs: 12, md: withAvatar ? 8 : 12 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...textFieldProps}
                label="First Name"
                value={profile.firstName || ''}
                onChange={handleFirstNameChange}
                disabled={!canEdit}
                helperText={firstNameHelperText}
                error={!profile.firstName?.trim() || profile.firstName.trim().length < 2}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...textFieldProps}
                label="Last Name"
                value={profile.lastName || ''}
                onChange={handleLastNameChange}
                onKeyPress={handleKeyPress}
                disabled={!canEdit}
                helperText={surnameHelperText}
                error={!profile.lastName?.trim() || profile.lastName.trim().length < 2}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...textFieldProps}
                label={emailValid ? "Email Address" : "Email Address (Invalid)"}
                type="email"
                value={profile.email || ''}
                onChange={handleEmailChange}
                disabled={!canEdit}
                helperText={emailHelperText}
                error={!emailValid}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...textFieldProps}
                label="Mobile Number"
                type="tel"
                value={profile.mobileNumber || ''}
                onChange={handleMobileChange}
                disabled={!canEdit}
              />
            </Grid>

            {/* Save Button */}
            {canEdit && isProfileOwner && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={saveDisabled || loading}
                    sx={{ minWidth: 120 }}
                  >
                    {loading ? 'Saving...' : 'Update Profile'}
                  </Button>

                  {saveDisabled && (
                    <Typography variant="body2" color="error">
                      Please fill in all required fields with valid information
                    </Typography>
                  )}
                </Box>
              </Grid>
            )}

            {/* Profile Metadata */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{
                p: 2,                
                borderRadius: 1,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2
              }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>ID:</strong> {profile.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Provider:</strong> {profile.authProvider || 'LOCAL'}
                </Typography>
                {profile.createdAt && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Created:</strong> {reactory.utils.moment(profile.createdAt).format('MMM D, YYYY')}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Loading State */}
      {loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Updating profile information...
        </Alert>
      )}
    </Paper>
  );
};
