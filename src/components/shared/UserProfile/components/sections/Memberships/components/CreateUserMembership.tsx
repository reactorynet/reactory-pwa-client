import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  CircularProgress,
  Grid2 as Grid,
  Paper,
  Chip,
  Divider,
  SelectChangeEvent,
  Stack
} from '@mui/material';
import {
  Business,
  Apps,
  GroupWork,
  Security,
  Save,
  Close
} from '@mui/icons-material';
import Reactory from '@reactorynet/reactory-core';
import { ProfileUser } from '../../../../types';

export interface CreateUserMembershipProps {
  user?: ProfileUser | Reactory.Models.IUser;
  onMembershipCreated?: () => void;
  onCancel?: () => void;
  reactory?: Reactory.Client.ReactorySDK | Reactory.Client.IReactoryApi;
}

interface OrganizationItem {
  id: string;
  name: string;
  code?: string;
  businessUnits?: Array<{
    id: string;
    name: string;
  }>;
}

interface ClientItem {
  id: string;
  name: string;
  clientKey: string;
  applicationRoles?: string[];
}

const DEFAULT_ROLES = [
  'USER',
  'ADMIN',
  'DEVELOPER',
  'CONTENT_MANAGER',
  'BILLING_MANAGER',
  'SUPPORT_MANAGER',
  'WORKFLOW_MANAGER',
  'ORGANIZATION_ADMIN',
  'APPLICATION_ADMIN'
];

export const CreateUserMembership: React.FC<CreateUserMembershipProps> = ({
  user,
  onMembershipCreated,
  onCancel,
  reactory: reactoryProp
}) => {
  // Obtain reactory instance
  const reactory = reactoryProp || (window as any).reactory;

  // Current logged in partner/client
  const currentPartner = reactory?.getPartner ? reactory.getPartner() : null;

  // Form states
  const [selectedClientId, setSelectedClientId] = useState<string>(
    currentPartner?.id || ''
  );
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['USER']);

  // Data states
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data (Organizations & Clients)
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Organizations query
        const orgQuery = `
          query GetOrganizationsAndBusinessUnits {
            allOrganizations {
              id
              name
              code
              businessUnits {
                id
                name
              }
            }
          }
        `;

        const orgResult: any = await reactory.graphqlQuery(orgQuery, {});

        if (isMounted && orgResult?.data?.allOrganizations) {
          setOrganizations(orgResult.data.allOrganizations);
        }

        // Fetch Clients query
        const clientsQuery = `
          query GetReactoryClients {
            ReactoryClients {
              id
              name
              clientKey
              applicationRoles
            }
          }
        `;

        try {
          const clientsResult: any = await reactory.graphqlQuery(clientsQuery, {});
          if (isMounted && clientsResult?.data?.ReactoryClients && Array.isArray(clientsResult.data.ReactoryClients)) {
            setClients(clientsResult.data.ReactoryClients);
            if (clientsResult.data.ReactoryClients.length > 0) {
              const matchPartner = clientsResult.data.ReactoryClients.find(
                (c: any) => c.id === currentPartner?.id || c.clientKey === currentPartner?.key || c.clientKey === currentPartner?.clientKey
              );
              setSelectedClientId(matchPartner ? matchPartner.id : clientsResult.data.ReactoryClients[0].id);
            }
          } else if (currentPartner) {
            setClients([{ id: currentPartner.id, name: currentPartner.name || currentPartner.key || currentPartner.clientKey, clientKey: currentPartner.key || currentPartner.clientKey }]);
            if (!selectedClientId) {
              setSelectedClientId(currentPartner.id);
            }
          }
        } catch (clientErr) {
          if (currentPartner) {
            setClients([{ id: currentPartner.id, name: currentPartner.name || currentPartner.key || currentPartner.clientKey, clientKey: currentPartner.key || currentPartner.clientKey }]);
            if (!selectedClientId) {
              setSelectedClientId(currentPartner.id);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load organization or client data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (reactory) {
      fetchData();
    }
  }, [reactory]);

  // Available Business Units dynamically filtered by selected Organization
  const availableBusinessUnits = useMemo(() => {
    if (!selectedOrgId) return [];
    const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
    return selectedOrg?.businessUnits || [];
  }, [selectedOrgId, organizations]);

  // Available Roles dynamically determined by selected Reactor Client
  const availableRoles = useMemo(() => {
    if (!selectedClientId) return DEFAULT_ROLES;
    const client = clients.find((c) => c.id === selectedClientId);
    if (client && client.applicationRoles && client.applicationRoles.length > 0) {
      return client.applicationRoles.filter((r) => r !== 'ANON');
    }
    return DEFAULT_ROLES;
  }, [selectedClientId, clients]);

  // Handle Organization Change
  const handleOrgChange = useCallback((event: SelectChangeEvent<string>) => {
    const orgId = event.target.value;
    setSelectedOrgId(orgId);
    setSelectedBusinessUnitId(''); // Reset business unit on organization change
  }, []);

  // Handle Client Change
  const handleClientChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedClientId(event.target.value);
  }, []);

  // Handle Business Unit Change
  const handleBusinessUnitChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedBusinessUnitId(event.target.value);
  }, []);

  // Handle Role Toggle
  const handleRoleToggle = useCallback((role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }, []);

  // Handle Form Submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const userId = user?.id || (user as any)?._id;
      if (!userId) {
        setError('No valid user specified for membership assignment.');
        return;
      }

      if (!selectedClientId) {
        setError('Please select a Reactor Client.');
        return;
      }

      if (selectedRoles.length === 0) {
        setError('Please select at least one role for this membership.');
        return;
      }

      try {
        setSubmitting(true);
        setError(null);

        const mutation = `
          mutation CreateUserMembership(
            $userId: String!
            $clientId: String
            $organization: String
            $businessUnit: String
            $roles: [String]
          ) {
            ReactoryCoreCreateUserMembership(
              user_id: $userId
              clientId: $clientId
              organization: $organization
              businessUnit: $businessUnit
              roles: $roles
            ) {
              id
              roles
              organization {
                id
                name
              }
              businessUnit {
                id
                name
              }
            }
          }
        `;

        const variables = {
          userId: String(userId),
          clientId: selectedClientId,
          organization: selectedOrgId || null,
          businessUnit: selectedBusinessUnitId || null,
          roles: selectedRoles
        };

        const result = await reactory.graphqlMutation(mutation, variables);

        if (result?.errors && result.errors.length > 0) {
          throw new Error(result.errors[0].message);
        }

        reactory.createNotification?.('Membership created successfully', {
          type: 'success'
        });

        if (onMembershipCreated) {
          onMembershipCreated();
        }
      } catch (err: any) {
        const msg = err?.message || 'Failed to create membership';
        setError(msg);
        reactory.createNotification?.(msg, { type: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
    [
      user,
      selectedClientId,
      selectedOrgId,
      selectedBusinessUnitId,
      selectedRoles,
      reactory,
      onMembershipCreated
    ]
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Reactor Client Select */}
        <Grid size={{ xs: 12 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="reactor-client-select-label">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Apps fontSize="small" /> Reactor Client
              </Box>
            </InputLabel>
            <Select
              labelId="reactor-client-select-label"
              value={selectedClientId}
              label="Reactor Client"
              onChange={handleClientChange}
            >
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name} ({client.clientKey})
                </MenuItem>
              ))}
              {clients.length === 0 && currentPartner && (
                <MenuItem value={currentPartner.id}>
                  {currentPartner.name || currentPartner.key || currentPartner.clientKey}
                </MenuItem>
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Organization Select */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="organization-select-label">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Business fontSize="small" /> Organization
              </Box>
            </InputLabel>
            <Select
              labelId="organization-select-label"
              value={selectedOrgId}
              label="Organization"
              onChange={handleOrgChange}
            >
              <MenuItem value="">
                <em>None (Global Client Access)</em>
              </MenuItem>
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name} {org.code ? `(${org.code})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Business Unit Select (Filtered by Organization) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth size="small" disabled={!selectedOrgId}>
            <InputLabel id="business-unit-select-label">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GroupWork fontSize="small" /> Business Unit
              </Box>
            </InputLabel>
            <Select
              labelId="business-unit-select-label"
              value={selectedBusinessUnitId}
              label="Business Unit"
              onChange={handleBusinessUnitChange}
            >
              <MenuItem value="">
                <em>All Business Units</em>
              </MenuItem>
              {availableBusinessUnits.map((bu) => (
                <MenuItem key={bu.id} value={bu.id}>
                  {bu.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Roles Selection */}
        <Grid size={{ xs: 12 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, fontWeight: 600 }}>
              <Security fontSize="small" color="primary" /> Assign Roles
            </Typography>

            <Grid container spacing={1}>
              {availableRoles.map((role) => {
                const isSelected = selectedRoles.includes(role);
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={role}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleRoleToggle(role)}
                          color="primary"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                          {role}
                        </Typography>
                      }
                    />
                  </Grid>
                );
              })}
            </Grid>

            {selectedRoles.length > 0 && (
              <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>
                  Selected:
                </Typography>
                {selectedRoles.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    size="small"
                    color="primary"
                    variant="outlined"
                    onDelete={() => handleRoleToggle(role)}
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {onCancel && (
              <Button variant="outlined" onClick={onCancel} disabled={submitting} startIcon={<Close />}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !selectedClientId}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
            >
              {submitting ? 'Saving...' : 'Save Membership'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateUserMembership;
