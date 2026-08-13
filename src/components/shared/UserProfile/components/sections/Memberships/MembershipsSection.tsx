import React, { useState, useCallback, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Grid2 as Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress
} from '@mui/material';
import { Business, Add } from '@mui/icons-material';
import { MembershipSectionProps } from '../../../types';
import { useMemberships } from './hooks';
import { MembershipCard, CreateUserMembership } from './components';

/**
 * Memberships Section - Organization memberships and roles management
 * Modern implementation with full CRUD operations
 */
export const MembershipsSection: React.FC<MembershipSectionProps> = ({
  profile,
  mode,
  loading,
  selectedMembership,
  onMembershipSelect,
  onRefetch,
  reactory
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Register component in reactory component registry to override any legacy form definition
  useEffect(() => {
    if (reactory?.registerComponent) {
      try {
        reactory.registerComponent(
          'core',
          'ReactoryCreateUserMembership',
          '1.0.0',
          CreateUserMembership,
          ['user', 'membership'],
          ['ADMIN']
        );
      } catch (e) {
        // Ignored
      }
    }
  }, [reactory]);

  const { removeMembership, loading: membershipLoading } = useMemberships(
    profile?.id,
    reactory
  );

  // Check permissions
  const canEdit = mode === 'admin' || (mode === 'edit' && profile?.id === reactory.getUser()?.id);
  const canAdd = reactory.hasRole(['ADMIN']);

  // Handle membership selection
  const handleMembershipSelect = useCallback((membership: Reactory.Models.IMembership) => {
    if (onMembershipSelect) {
      onMembershipSelect(membership);
    }
  }, [onMembershipSelect]);

  // Handle membership deletion
  const handleMembershipDelete = useCallback(async (membership: Reactory.Models.IMembership) => {
    const success = await removeMembership(membership.id as string);
    if (success && onRefetch) {
      onRefetch();
    }
  }, [removeMembership, onRefetch]);

  // Handle roles changed
  const handleRolesChanged = useCallback((membership: Reactory.Models.IMembership, roles: string[]) => {
    if (onRefetch) {
      onRefetch();
    }
  }, [onRefetch]);

  // Handle membership created successfully
  const handleMembershipCreated = useCallback(() => {
    setAddDialogOpen(false);
    if (onRefetch) {
      onRefetch();
    }
  }, [onRefetch]);

  const memberships = profile?.memberships || [];

  // Fallback to CreateUserMembership if registry component is not present
  const ReactoryCreateMembershipComponent =
    reactory?.getComponent<React.FC<any>>('core.ReactoryCreateUserMembership') || CreateUserMembership;

  return (
    <>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Business />
            Memberships ({memberships.length})
          </Typography>

          {canAdd && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddDialogOpen(true)}
              disabled={membershipLoading}
            >
              Add Membership
            </Button>
          )}
        </Box>

        {memberships.length === 0 ? (
          <Alert severity="info">
            <Typography variant="body2">
              No memberships found. {canAdd && 'Click "Add Membership" to create one.'}
            </Typography>
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {memberships.map((membership) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={membership.id as string}>
                <MembershipCard
                  membership={membership}
                  user={profile}
                  reactory={reactory as Reactory.Client.ReactorySDK}
                  canEdit={canEdit}
                  canDelete={canAdd}
                  isSelected={selectedMembership?.id === membership.id}
                  onSelect={handleMembershipSelect}
                  onEdit={() => {}}
                  onDelete={handleMembershipDelete}
                  onRolesChanged={handleRolesChanged}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {(loading || membershipLoading) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress />
          </Box>
        )}
      </Paper>

      {/* Add Membership Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Add New Membership</DialogTitle>
        <DialogContent dividers>
          {addDialogOpen && (
            <CreateUserMembership
              user={profile}
              reactory={reactory}
              onMembershipCreated={handleMembershipCreated}
              onCancel={() => setAddDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

