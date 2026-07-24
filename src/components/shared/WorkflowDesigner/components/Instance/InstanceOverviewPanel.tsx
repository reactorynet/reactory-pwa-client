import React from 'react';
import type { WorkflowInstanceData } from '../../types';
import {
  getWorkflowStatus,
  formatDate,
  formatDuration,
} from './constants';

export interface InstanceOverviewPanelProps {
  reactory: Reactory.Client.IReactoryApi | Reactory.Client.ReactorySDK;
  instance: WorkflowInstanceData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * Right-hand panel shown in instance-viewer mode: instance-level metadata,
 * status, timing and step counts. Mirrors the WorkflowInstanceInspector
 * Overview tab.
 */
const InstanceOverviewPanel: React.FC<InstanceOverviewPanelProps> = ({
  reactory,
  instance,
  loading,
  error,
  onRefresh,
}) => {
  const { Material } = reactory.getComponents<{ Material: Reactory.Client.Web.IMaterialModule }>([
    'material-ui.Material',
  ]);
  const {
    Box, Typography, Icon, IconButton, Tooltip, Chip, CircularProgress, Alert,
    Table, TableBody, TableCell, TableRow, TableContainer, Paper,
  } = Material.MaterialCore;

  const wfStatus = instance ? getWorkflowStatus(instance.status) : null;

  const row = (label: string, value: any) => (
    <TableRow>
      <TableCell sx={{ fontWeight: 600, width: 130, color: 'text.secondary', borderBottom: 'none', py: 0.75 }}>
        {label}
      </TableCell>
      <TableCell sx={{ borderBottom: 'none', py: 0.75 }}>{value}</TableCell>
    </TableRow>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 18, color: 'text.secondary' }}>insights</Icon>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          Instance Overview
        </Typography>
        <Tooltip title="Refresh">
          <span>
            <IconButton size="small" onClick={onRefresh} disabled={loading}>
              <Icon sx={{ fontSize: 18 }}>refresh</Icon>
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading instance...</Typography>
          </Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && instance && wfStatus && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Icon color={wfStatus.color as any} sx={{ fontSize: 22 }}>{wfStatus.icon}</Icon>
              <Chip
                label={instance.statusLabel || wfStatus.label}
                color={wfStatus.color as any}
                size="small"
                variant="outlined"
              />
            </Box>

            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {row('Instance ID', (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {instance.id}
                      </Typography>
                    ))}
                    {row('Definition', (
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                        {instance.workflowDefinitionId}
                      </Typography>
                    ))}
                    {row('Version', instance.version ?? 'N/A')}
                    {row('Created', formatDate(instance.createTime))}
                    {row('Completed', formatDate(instance.completeTime))}
                    {row('Duration', formatDuration(instance.duration))}
                    {row('Steps', (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip label={`${instance.completedStepCount ?? 0} done`} size="small" color="success" variant="outlined" />
                        {(instance.failedStepCount ?? 0) > 0 && (
                          <Chip label={`${instance.failedStepCount} failed`} size="small" color="error" variant="outlined" />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          / {instance.stepCount ?? 0} total
                        </Typography>
                      </Box>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {(instance.failedStepCount ?? 0) > 0 && (
              <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
                This instance failed. Click the highlighted step(s) on the canvas to inspect the failure.
              </Alert>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default InstanceOverviewPanel;
