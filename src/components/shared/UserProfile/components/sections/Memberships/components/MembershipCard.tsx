import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField
} from '@mui/material';
import {
  Edit,
  Delete,
  ChevronRight,
  Business
} from '@mui/icons-material';
import { MembershipRoles } from './MembershipRoles';

interface MembershipCardProps {
  membership: Reactory.Models.IMembership;
  user: Reactory.Models.IUser;
  reactory: Reactory.Client.ReactorySDK;
  canEdit: boolean;
  canDelete: boolean;
  isSelected: boolean;
  onSelect: (membership: Reactory.Models.IMembership) => void;
  onEdit: (membership: Reactory.Models.IMembership) => void;
  onDelete: (membership: Reactory.Models.IMembership) => void;
  onRolesChanged: (membership: Reactory.Models.IMembership, roles: string[]) => void;
}

/**
 * Card component for displaying and managing individual memberships
 */
export const MembershipCard: React.FC<MembershipCardProps> = ({
  membership,
  user,
  reactory,
  canEdit,
  canDelete,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onRolesChanged
}) => {
  const [showRoles, setShowRoles] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const { i18n } = reactory;

  const reactoryTenantName = i18n.t(membership.client?.name, 'No Tenant');  

  const businessUnitName = membership.businessUnit?.name;
  const organizationName = membership.organization?.name;
  let secondaryLabelText = organizationName ? `${organizationName} - ${businessUnitName}` : businessUnitName;    
  const isRootMembership = membership.organization === null && membership.businessUnit === null;
  if (isRootMembership) {
    secondaryLabelText = i18n.t('reactory:profile.memberships.root-membership.label', 'Root Membership');
  } else {
    secondaryLabelText = businessUnitName ? `${organizationName} - ${businessUnitName}` : organizationName;
  }

  const rolesText = membership.roles?.length > 0
    ? membership.roles.join(', ')
    : 'No roles assigned';

  const handleRolesChanged = (roles: string[]) => {
    onRolesChanged(membership, roles);
  };

  const handleDeleteConfirm = () => {
    onDelete(membership);
    setDeleteDialogOpen(false);
    setDeleteConfirmationText('');
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmationText('');
  };

  const isDeleteEnabled = deleteConfirmationText === reactoryTenantName;

  return (
    <>
      <Card
        sx={{
          border: 2,
          borderColor: isSelected ? 'primary.main' : 'divider',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: 3,
            borderColor: 'primary.light'
          }
        }}
        onClick={() => onSelect(membership)}
      >
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 48,
                height: 48
              }}
            >
              <Business />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                {reactoryTenantName}
              </Typography>
              {secondaryLabelText && (
                <Typography variant="body2" color="text.secondary">
                  {secondaryLabelText}
                </Typography>
              )}
            </Box>

            {isSelected && (
              <Chip
                label="Selected"
                color="primary"
                size="small"
              />
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Roles:</strong> {rolesText}
            </Typography>            
          </Box>
        </CardContent>

        <CardActions sx={{ pt: 0, px: 2, pb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canEdit && (
              <Tooltip title="Edit roles">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRoles(!showRoles);
                  }}
                  color={showRoles ? 'primary' : 'default'}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
            )}

            {canDelete && (
              <Tooltip title="Delete membership">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialogOpen(true);
                  }}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Tooltip title="Select membership">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onSelect(membership);
              }}
              color={isSelected ? 'primary' : 'default'}
            >
              <ChevronRight />
            </IconButton>
          </Tooltip>
        </CardActions>

        {/* Expandable roles section */}
        <Collapse in={showRoles}>
          <Box sx={{ px: 2, pb: 2 }}>
            <MembershipRoles
              membership={membership}
              user={user}
              reactory={reactory}
              onRolesChanged={handleRolesChanged}
            />
          </Box>
        </Collapse>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Membership</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove the membership for{' '}
            <strong>{reactoryTenantName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
            To confirm deletion, please type <strong>{reactoryTenantName}</strong> below:
          </Typography>
          <TextField
            fullWidth
            placeholder={`Type "${reactoryTenantName}" to confirm`}
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={!isDeleteEnabled}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
