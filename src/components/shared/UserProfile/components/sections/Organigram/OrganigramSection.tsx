import React from 'react';
import { Paper, Typography, Box, Alert } from '@mui/material';
import { AccountTree } from '@mui/icons-material';
import { OrgangramSectionProps } from '../../../types';

/**
 * Organigram Section - Peer relationships and organizational structure
 * TODO: Implement full organigram functionality
 */
export const OrganigramSection: React.FC<OrgangramSectionProps> = ({
  profile,
  mode,
  loading,
  selectedMembership,
  onPeersConfirmed,
  reactory
}) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography
        variant="h6"
        sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <AccountTree />
        Organigram - {selectedMembership?.organization?.name || 'No Organization'}
      </Typography>

      <Alert severity="info">
        <Typography variant="body2">
          Organigram functionality will show peer relationships, managers,
          direct reports, and allow confirmation of organizational structure.
        </Typography>
      </Alert>

      <Box sx={{ mt: 3, p: 2, borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Peers:</strong> {profile.peers?.peers?.length || 0} found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Organization:</strong> {selectedMembership?.organization?.name || 'None'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Confirmed:</strong> {profile.peers?.confirmedAt ? 'Yes' : 'No'}
        </Typography>
      </Box>
    </Paper>
  );
};
