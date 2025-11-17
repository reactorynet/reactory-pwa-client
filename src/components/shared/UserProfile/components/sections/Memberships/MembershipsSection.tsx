import React, { useState, useCallback } from 'react';
import { useOrganizationList } from '@reactory/client-core/components/shared/Organization/hooks';
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
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { Business, Add } from '@mui/icons-material';
import { MembershipSectionProps } from '../../../types';
import { useMemberships } from './hooks';
import { MembershipCard } from './components';
import { ReactoryClientCore } from 'components/shared/Organization/types';

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
  const [newMembership, setNewMembership] = useState({
    organizationId: '',
    roles: [] as string[]
  });

  const { addMembership, removeMembership, loading: membershipLoading } = useMemberships(
    profile?.id,
    reactory
  );

  const { organizations, loading: organizationLoading } = useOrganizationList({reactory: reactory as Reactory.Client.IReactoryApi});
  
  const ReactoryCreacteMemberShipComponent = reactory.getComponent<React.FC<any>>('core.ReactoryCreateUserMembership');

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
    // Update the membership in the profile data
    if (profile.memberships) {
      const updatedMemberships = profile.memberships.map(m =>
        m.id === membership.id ? { ...m, roles } : m
      );
      // This would typically trigger a refetch or optimistic update
      if (onRefetch) {
        onRefetch();
      }
    }
  }, [profile.memberships, onRefetch]);

  // Handle adding new membership
  const handleAddMembership = useCallback(async () => {
    if (!newMembership.organizationId) {
      reactory.createNotification('Please select an organization', { type: 'warning' });
      return;
    }

    const success = await addMembership({
      organizationId: newMembership.organizationId,
      roles: newMembership.roles
    });

    if (success) {
      setAddDialogOpen(false);
      setNewMembership({ organizationId: '', roles: [] });
      if (onRefetch) {
        onRefetch();
      }
    }
  }, [newMembership, addMembership, onRefetch, reactory]);

  // Get available organizations (this would typically come from a query)
  const availableOrganizations = [
    // This should be populated from a GraphQL query
    { id: 'org1', name: 'Sample Organization 1' },
    { id: 'org2', name: 'Sample Organization 2' }
  ];

  // Get available roles
  const availableRoles = reactory.getApplicationRoles()?.filter(role => role !== 'ANON') || [];

  const memberships = profile?.memberships || [];

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
                  canDelete={canAdd} // Only admins can delete
                  isSelected={selectedMembership?.id === membership.id}
                  onSelect={handleMembershipSelect}
                  onEdit={() => {}} // Handled internally by the card
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Membership</DialogTitle>
        <DialogContent>
          {addDialogOpen && <ReactoryCreacteMemberShipComponent 
              user={profile}               
              onMembershipCreated={handleAddMembership}
            />           
          }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>
            Cancel
          </Button>          
        </DialogActions>
      </Dialog>
    </>
  );
};
