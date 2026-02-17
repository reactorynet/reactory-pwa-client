import React, { useState, useCallback } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  useTheme
} from '@mui/material';
import {
  Share,
  Add,
  Delete,
  Save,
  Language,
  CheckCircle,
  Cancel as CancelIcon
} from '@mui/icons-material';
import Reactory from '@reactorynet/reactory-core';
import { SocialsSectionProps, SocialReference } from '../../../types';

type SocialEntry = Reactory.Models.IReactorySocialReference;

/** Known social providers with labels and URL patterns */
const SOCIAL_PROVIDERS = [
  { id: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { id: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/username' },
  { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@channel' },
  { id: 'website', label: 'Personal Website', placeholder: 'https://example.com' },
  { id: 'other', label: 'Other', placeholder: 'https://...' },
];

/**
 * Socials Section - Manage linked social media profiles
 */
export const SocialsSection: React.FC<SocialsSectionProps> = ({
  profile,
  mode,
  loading,
  onProfileUpdate,
  onSocialsSave,
  reactory
}) => {
  const theme = useTheme();
  const canEdit = mode === 'edit' || mode === 'admin';

  const socials: SocialEntry[] = Array.isArray(profile.socials) ? profile.socials : [];

  // Local state for adding a new social entry
  const [newProvider, setNewProvider] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [dirty, setDirty] = useState(false);

  const handleAddSocial = useCallback(() => {
    if (!newProvider || !newUrl.trim()) return;

    const newEntry = {
      provider: newProvider,
      url: newUrl.trim(),
    } as SocialEntry;

    const updated: SocialEntry[] = [...socials, newEntry];
    onProfileUpdate({ socials: updated });
    setNewProvider('');
    setNewUrl('');
    setDirty(true);
  }, [newProvider, newUrl, socials, onProfileUpdate]);

  const handleRemoveSocial = useCallback((index: number) => {
    const updated = socials.filter((_, i) => i !== index);
    onProfileUpdate({ socials: updated });
    setDirty(true);
  }, [socials, onProfileUpdate]);

  const handleUrlChange = useCallback((index: number, url: string) => {
    const updated = socials.map((s, i) => i === index ? { ...s, url } : s);
    onProfileUpdate({ socials: updated });
    setDirty(true);
  }, [socials, onProfileUpdate]);

  const handleSave = useCallback(async () => {
    if (onSocialsSave) {
      const success = await onSocialsSave(socials);
      if (success) setDirty(false);
    }
  }, [onSocialsSave, socials]);

  const getProviderLabel = (providerId: string): string => {
    return SOCIAL_PROVIDERS.find(p => p.id === providerId)?.label || providerId;
  };

  const getProviderPlaceholder = (providerId: string): string => {
    return SOCIAL_PROVIDERS.find(p => p.id === providerId)?.placeholder || 'https://...';
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
        <Share />
        Social Profiles
      </Typography>

      {/* Existing socials list */}
      {socials.length > 0 ? (
        <List disablePadding>
          {socials.map((social, index) => (
            <ListItem
              key={`${social.provider}-${index}`}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                pr: canEdit ? 10 : 2
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Language color="action" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={getProviderLabel(social.provider)} size="small" variant="outlined" />
                    {social.valid && (
                      <CheckCircle fontSize="small" color="success" />
                    )}
                  </Box>
                }
                secondary={
                  canEdit ? (
                    <TextField
                      fullWidth
                      size="small"
                      variant="standard"
                      value={social.url}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                      placeholder={getProviderPlaceholder(social.provider)}
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography
                      component="a"
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      color="primary"
                      sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {social.url}
                    </Typography>
                  )
                }
              />
              {canEdit && (
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveSocial(index)}
                    size="small"
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          No social profiles linked yet.
          {canEdit && ' Use the form below to add one.'}
        </Alert>
      )}

      {/* Add new social entry */}
      {canEdit && (
        <Box sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'flex-end',
          mt: 2,
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          backgroundColor: theme.palette.action.hover
        }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={newProvider}
              label="Provider"
              onChange={(e) => setNewProvider(e.target.value)}
            >
              {SOCIAL_PROVIDERS.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            fullWidth
            label="Profile URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder={newProvider ? getProviderPlaceholder(newProvider) : 'Select a provider first'}
            disabled={!newProvider}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleAddSocial();
            }}
          />

          <IconButton
            onClick={handleAddSocial}
            disabled={!newProvider || !newUrl.trim()}
            color="primary"
          >
            <Add />
          </IconButton>
        </Box>
      )}

      {/* Save button */}
      {canEdit && dirty && onSocialsSave && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Socials'}
          </Button>
        </Box>
      )}
    </Paper>
  );
};
