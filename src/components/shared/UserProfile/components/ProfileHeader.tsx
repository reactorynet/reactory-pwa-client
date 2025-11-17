import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Avatar,
  Button,
  IconButton,
  Toolbar,
  Chip,
  useTheme
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Delete,
  ArrowBack,
  AdminPanelSettings
} from '@mui/icons-material';
import { ProfileHeaderProps } from '../types';

/**
 * Header component for the profile page
 * Shows profile info, avatar, and action buttons
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  mode,
  isOwner,
  isAdmin,
  loading,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  reactory,
  className
}) => {
  const theme = useTheme();

  const canEditPermissions = isOwner || isAdmin;
  const isEditing = mode === 'edit' || mode === 'admin';
  const canDelete = isAdmin && mode === 'admin' && !profile.deleted;

  return (
    <Paper
      className={className}
      elevation={1}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        color: 'white'
      }}
    >
      <Toolbar sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        {/* Back Button (if needed) */}
        {onCancel && (
          <IconButton
            onClick={onCancel}
            sx={{
              mr: 2,
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <ArrowBack />
          </IconButton>
        )}

        {/* Profile Avatar and Info */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          flex: 1, 
          minWidth: 0,          
          }}>
          <Avatar
            src={reactory.getAvatar(profile, null)}
            alt={`${profile.firstName} ${profile.lastName}`}
            sx={{
              width: { xs: 60, md: 80 },
              height: { xs: 60, md: 80 },
              mr: { xs: 2, md: 3 },
              border: 3,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              backgroundColor: theme.palette.background.paper 
            }}
          >
            {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 'bold',
                fontSize: { xs: '1.5rem', md: '2rem' },
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {profile.firstName} {profile.lastName}
            </Typography>

            <Typography
              variant="subtitle1"
              sx={{
                opacity: 0.9,
                fontSize: { xs: '0.875rem', md: '1rem' },
                mb: 1
              }}
            >
              {profile.email}
            </Typography>

            {/* Status Chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {isOwner && (
                <Chip
                  label="Your Profile"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                />
              )}

              {isAdmin && (
                <Chip
                  icon={<AdminPanelSettings />}
                  label="Admin"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                />
              )}

              {profile.deleted && (
                <Chip
                  label="Deleted"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(244, 67, 54, 0.2)',
                    color: '#ffcdd2',
                    border: '1px solid rgba(244, 67, 54, 0.3)'
                  }}
                />
              )}

              {mode === 'edit' && (
                <Chip
                  label="Editing"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 193, 7, 0.2)',
                    color: '#fff9c4',
                    border: '1px solid rgba(255, 193, 7, 0.3)'
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
          {canEditPermissions && !isEditing && onEdit && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={onEdit}
              disabled={loading}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Edit
            </Button>
          )}

          {canEditPermissions && isEditing && onSave && (
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={() => onSave?.(profile)}
              disabled={loading}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              Save
            </Button>
          )}

          {isEditing && onCancel && (
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={onCancel}
              disabled={loading}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Cancel
            </Button>
          )}

          {canDelete && onDelete && (
            <IconButton
              onClick={onDelete}
              disabled={loading}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  color: '#ffcdd2',
                  backgroundColor: 'rgba(244, 67, 54, 0.1)'
                }
              }}
            >
              <Delete />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </Paper>
  );
};
