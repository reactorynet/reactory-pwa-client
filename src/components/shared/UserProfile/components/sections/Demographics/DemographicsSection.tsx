import React from 'react';
import { Paper, Typography, Box, Alert } from '@mui/material';
import { BarChart } from '@mui/icons-material';
import { DemographicsSectionProps } from '../../../types';

/**
 * Demographics Section - Personal demographics management
 * TODO: Integrate with existing Demographics component
 */
export const DemographicsSection: React.FC<DemographicsSectionProps> = ({
  profile,
  mode,
  loading,
  selectedMembership,
  organizationId,
  reactory
}) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography
        variant="h6"
        sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <BarChart />
        Demographics
      </Typography>

      <Alert severity="info">
        <Typography variant="body2">
          Demographics functionality will be integrated from the existing
          plugin Demographics component. This section will handle personal
          information like age, gender, race, etc.
        </Typography>
      </Alert>

      <Box sx={{ mt: 3, p: 2, borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Organization:</strong> {selectedMembership?.organization?.name || 'None selected'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>User:</strong> {profile.firstName} {profile.lastName}
        </Typography>
      </Box>
    </Paper>
  );
};
