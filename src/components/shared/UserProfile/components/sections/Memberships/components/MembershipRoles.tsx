import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Grid2 as Grid,
  Alert
} from '@mui/material';
import { useMembershipRoles } from '../hooks';

interface MembershipRolesProps {
  membership: Reactory.Models.IMembership;
  user: Reactory.Models.IUser;
  reactory: any;
  onRolesChanged?: (roles: string[]) => void;
}

/**
 * Component for managing roles within a membership
 * Migrated and modernized from the existing MembershipRoles.tsx
 */
export const MembershipRoles: React.FC<MembershipRolesProps> = ({
  membership,
  user,
  reactory,
  onRolesChanged
}) => {
  const { toggleRole, getAvailableRoles, hasRole, loading, error } = useMembershipRoles(
    user?.id,
    membership,
    reactory
  );

  const availableRoles = getAvailableRoles();

  const handleRoleToggle = async (role: string, checked: boolean) => {
    const success = await toggleRole(role, checked);
    if (success && onRolesChanged) {
      const currentRoles = membership.roles || [];
      const newRoles = checked
        ? [...currentRoles, role]
        : currentRoles.filter(r => r !== role);
      onRolesChanged(newRoles);
    }
  };

  if (!membership) {
    return (
      <Alert severity="warning">
        No membership selected
      </Alert>
    );
  }

  if (availableRoles.length === 0) {
    return (
      <Alert severity="info">
        No roles available for this membership
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
        Roles for {membership.organization?.name || membership.client?.name || 'Unknown Organization'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={1}>
        {availableRoles.map((role) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={role}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={hasRole(role)}
                  onChange={(e) => handleRoleToggle(role, e.target.checked)}
                  disabled={loading}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: hasRole(role) ? 'bold' : 'normal' }}>
                  {role}
                </Typography>
              }
              sx={{
                width: '100%',
                margin: 0,
                '& .MuiFormControlLabel-label': {
                  width: '100%'
                }
              }}
            />
          </Grid>
        ))}
      </Grid>

      {loading && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Updating roles...
        </Typography>
      )}
    </Box>
  );
};
