import React, { useMemo } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { BarChart, Refresh as RefreshIcon, Save as SaveIcon } from '@mui/icons-material';
import {
  DemographicForm,
  selectRenderableDefinitions,
} from '../../../../../plugins/reactory-core/demographic-form';
import type {
  DemographicValueChange,
  DemographicValues,
} from '../../../../../plugins/reactory-core/demographic-form';
import { DemographicsSectionProps } from '../../../types';
import { useMyDemographics } from './hooks';

/**
 * Why the section is read-only.
 *
 * Each reason gets its own sentence on screen — a silently disabled form tells
 * the member nothing about whether their profile, their organization or their
 * current view mode is the cause.
 */
export type DemographicsReadOnlyReason =
  | 'no-organization'
  | 'self-service-disabled'
  | 'view';

const READ_ONLY_MESSAGES: Record<DemographicsReadOnlyReason, string> = {
  'no-organization':
    'No organization is selected, so there are no demographics to show. Select an organization to view or update your demographics.',
  'self-service-disabled':
    'Your organization does not allow self-service demographics, so these values are read-only. Contact an organization administrator to change them.',
  view: 'You are viewing this profile in read-only mode. Switch to edit mode to update your demographics.',
};

/**
 * Demographics — the member's self-service demographic answers (ORG-034).
 *
 * The form itself is the shared renderer from ORG-032
 * (`reactory-core/demographic-form`). It is imported by relative path on
 * purpose: the plugin exports it from its barrel but does not register it as a
 * component FQN, so `reactory.getComponent('reactory.DemographicForm@1.0.0')`
 * would fail. Registering it there is a follow-up in the plugin repository.
 *
 * This component owns only what the renderer deliberately leaves to its host:
 * the read, the scope change (organization/membership), validation and the
 * write. All ordering (`ordinal`) and `enabled` filtering is delegated to
 * `selectRenderableDefinitions` / `DemographicForm` so this screen cannot drift
 * from ORG-031's preview or ORG-033's admin pane.
 */
export const DemographicsSection: React.FC<DemographicsSectionProps> = ({
  profile,
  mode,
  loading,
  selectedMembership,
  organizationId,
  reactory,
  selfServiceEnabled,
}) => {
  // The profile shell passes both; either is enough to identify the scope.
  const activeOrganizationId =
    organizationId || (selectedMembership?.organization?.id as string | undefined) || '';
  const membershipId = selectedMembership?.id ? String(selectedMembership.id) : undefined;

  const demographics = useMyDemographics({
    reactory,
    organizationId: activeOrganizationId,
    membershipId,
    // The prop is an override: the hook reads
    // `OrganizationDemographicsPolicy.selfServiceEnabled` in the same parallel
    // round trip as the form data, so `demographics.selfServiceDisabled` is
    // already correct when the form first paints.
    selfServiceEnabled,
  });

  const renderable = useMemo(
    () => selectRenderableDefinitions(demographics.definitions),
    [demographics.definitions],
  );

  /**
   * Read-only reasons, in precedence order.
   *
   * `selfServiceDisabled` covers three sources the member cannot distinguish and
   * does not need to: the host's `selfServiceEnabled={false}` override, the
   * organization's policy read (`Organization.demographicsPolicy`), and a policy
   * refusal returned by the server on save.
   */
  const readOnlyReason: DemographicsReadOnlyReason | null = !activeOrganizationId
    ? 'no-organization'
    : demographics.selfServiceDisabled
      ? 'self-service-disabled'
      : mode === 'view'
        ? 'view'
        : null;

  const readOnly = readOnlyReason !== null;
  /**
   * Treat the section as loading until the current scope's read has settled.
   *
   * `demographics.loading` is false on the very first render (the read starts in
   * an effect, after the first paint), so relying on it alone would paint the
   * empty state — or an editable form — before the policy and the definitions
   * are known. `hasLoaded` closes that gap, which is what makes the read-only
   * state true from the form's first paint rather than one tick later.
   */
  const isLoading =
    Boolean(loading) || demographics.loading || (Boolean(activeOrganizationId) && !demographics.hasLoaded);

  const handleValuesChange = (next: DemographicValues, change?: DemographicValueChange) => {
    demographics.updateValues(next, change);
  };

  const header = (
    <Typography
      variant="h6"
      component="h2"
      sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
    >
      <BarChart />
      Demographics
    </Typography>
  );

  return (
    <Paper data-testid="demographics-section" sx={{ p: 3, borderRadius: 2 }}>
      {header}

      {selectedMembership?.organization?.name && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {selectedMembership.organization.name}
        </Typography>
      )}

      {readOnlyReason && (
        <Alert
          severity={readOnlyReason === 'self-service-disabled' ? 'warning' : 'info'}
          data-testid="demographics-readonly"
          data-readonly-reason={readOnlyReason}
          sx={{ mb: 2 }}
        >
          {READ_ONLY_MESSAGES[readOnlyReason]}
        </Alert>
      )}

      {activeOrganizationId && demographics.loadError && (
        <Alert
          severity="error"
          data-testid="demographics-error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => void demographics.refresh()}
            >
              Retry
            </Button>
          }
        >
          {demographics.loadError}
        </Alert>
      )}

      {activeOrganizationId && isLoading && !demographics.loadError && (
        <Box
          data-testid="demographics-loading"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading your demographics…
          </Typography>
        </Box>
      )}

      {activeOrganizationId && !isLoading && !demographics.loadError && (
        <>
          <DemographicForm
            id="my-demographics-form"
            definitions={demographics.definitions}
            values={demographics.values}
            errors={demographics.fieldErrors}
            onChange={handleValuesChange}
            mode={readOnly ? 'read' : 'edit'}
            readOnly={readOnly}
            organization={{ id: activeOrganizationId }}
            user={profile}
            reactory={reactory}
            emptyState={
              <Box data-testid="demographics-empty">
                <Typography variant="body2">No demographic fields are configured.</Typography>
                <Typography variant="caption" color="text.secondary">
                  This organization has not set up any demographic fields yet, so there is
                  nothing to complete.
                </Typography>
              </Box>
            }
          />

          {demographics.formError && (
            <Alert severity="error" data-testid="demographics-form-error" sx={{ mt: 2 }}>
              {demographics.formError}
            </Alert>
          )}

          {!readOnly && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                data-testid="demographics-save"
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => void demographics.save()}
                disabled={demographics.saving}
              >
                {demographics.saving ? 'Saving…' : 'Save demographics'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default DemographicsSection;
