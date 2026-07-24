import React from 'react';
import type { InstanceStepStatus } from '../../types';
import {
  getStepStatus,
  formatStepName,
  formatDate,
  formatDuration,
} from './constants';

export interface StepDetailPopoverProps {
  reactory: Reactory.Client.IReactoryApi | Reactory.Client.ReactorySDK;
  /** The designer step name/id for the heading. */
  stepLabel: string;
  status: InstanceStepStatus;
}

/**
 * Compact detail view for a single executed step, rendered inside the
 * instance-mode canvas popover. Shows status, timing, outcome, any error,
 * and the step's slice of the workflow result data.
 */
const StepDetailPopover: React.FC<StepDetailPopoverProps> = ({ reactory, stepLabel, status }) => {
  const { Material, WorkflowDataViewer } = reactory.getComponents<any>([
    'material-ui.Material',
    'core.WorkflowDataViewer',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, Chip, Icon, Alert, Divider } = MaterialCore;
  const theme = reactory.muiTheme;

  const descriptor = getStepStatus(status.status);
  const hasOutcome =
    status.outcome && (typeof status.outcome !== 'object' || Object.keys(status.outcome as object).length > 0);
  const errors = status.errors || [];

  const jsonBlock = (label: string, data: any) => (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Box
        component="pre"
        sx={{
          p: 1.5,
          mt: 0.5,
          borderRadius: 1,
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
          border: '1px solid',
          borderColor: 'divider',
          fontSize: '0.72rem',
          fontFamily: 'monospace',
          overflow: 'auto',
          maxHeight: 180,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          m: 0,
        }}
      >
        {JSON.stringify(data, null, 2)}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: 2, width: 380, maxWidth: '90vw', maxHeight: '60vh', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Icon color={descriptor.color as any} sx={{ fontSize: 22 }}>{descriptor.icon}</Icon>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1, lineHeight: 1.2 }}>
          {formatStepName(stepLabel)}
        </Typography>
        <Chip
          label={status.statusLabel || descriptor.label}
          color={descriptor.color as any}
          size="small"
          variant="outlined"
        />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {formatDate(status.startTime)}
        {status.endTime ? ` → ${formatDate(status.endTime)}` : ''}
        {status.duration !== null && status.duration !== undefined ? ` (${formatDuration(status.duration)})` : ''}
      </Typography>

      {status.retryCount > 0 && (
        <Chip
          label={`${status.retryCount} ${status.retryCount === 1 ? 'retry' : 'retries'}`}
          size="small"
          variant="outlined"
          color="warning"
          sx={{ mt: 1 }}
        />
      )}

      {status.failed && status.errorMessage && (
        <Alert severity="error" variant="outlined" sx={{ mt: 1.5, '& .MuiAlert-message': { width: '100%' } }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: status.errorStack ? 0.5 : 0 }}>
            {status.errorMessage}
          </Typography>
          {status.errorStack && (
            <Box
              component="pre"
              sx={{
                mt: 0.5, p: 1, borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                border: '1px solid', borderColor: 'divider',
                fontSize: '0.68rem', fontFamily: 'monospace',
                overflow: 'auto', maxHeight: 140,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
              }}
            >
              {status.errorStack}
            </Box>
          )}
          {status.errorTime && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Error at: {formatDate(status.errorTime)}
            </Typography>
          )}
        </Alert>
      )}

      <Divider sx={{ my: 1.5 }} />

      {WorkflowDataViewer ? (
        <WorkflowDataViewer
          reactory={reactory}
          data={status.stepResult}
          title="Step Data"
          emptyMessage="No step result data captured."
          downloadFileName={`step-${stepLabel}`}
          maxHeight={220}
        />
      ) : (
        status.stepResult !== undefined && status.stepResult !== null
          ? jsonBlock('Step Data', status.stepResult)
          : (
            <Typography variant="caption" color="text.secondary">
              No step result data captured.
            </Typography>
          )
      )}

      {hasOutcome && jsonBlock('Outcome', status.outcome)}

      {errors.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Error History ({errors.length})
          </Typography>
          {errors.map((err, idx) => (
            <Box
              key={`err-${idx}`}
              sx={{
                mt: 1, p: 1, borderRadius: 1,
                border: '1px solid',
                borderColor: idx === errors.length - 1 ? 'error.main' : 'divider',
                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                  label={`Attempt #${err.retryCount ?? idx}`}
                  size="small"
                  variant="outlined"
                  color={idx === errors.length - 1 ? 'error' : 'default'}
                />
                {err.errorTime && (
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(err.errorTime)}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
                {err.message}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default StepDetailPopover;
