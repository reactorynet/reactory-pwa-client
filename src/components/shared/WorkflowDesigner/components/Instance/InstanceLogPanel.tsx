import React from 'react';

export interface InstanceLogPanelProps {
  reactory: Reactory.Client.IReactoryApi | Reactory.Client.ReactorySDK;
  logContent: string | null;
  logLoading: boolean;
  logError: string | null;
  onRefresh: () => void;
}

/**
 * Left-hand panel shown in instance-viewer mode: streams the instance's log
 * file output. Replaces the step library, which is hidden in instance mode.
 */
const InstanceLogPanel: React.FC<InstanceLogPanelProps> = ({
  reactory,
  logContent,
  logLoading,
  logError,
  onRefresh,
}) => {
  const { Material } = reactory.getComponents<{ Material: Reactory.Client.Web.IMaterialModule }>([
    'material-ui.Material',
  ]);
  const { Box, Typography, Icon, IconButton, Tooltip, CircularProgress, Alert } = Material.MaterialCore;
  const theme = reactory.muiTheme;

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
        <Icon sx={{ fontSize: 18, color: 'text.secondary' }}>terminal</Icon>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          Instance Log
        </Typography>
        <Tooltip title="Refresh log">
          <span>
            <IconButton size="small" onClick={onRefresh} disabled={logLoading}>
              <Icon sx={{ fontSize: 18 }}>refresh</Icon>
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {logLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading log...</Typography>
          </Box>
        )}

        {!logLoading && logError && <Alert severity="error">{logError}</Alert>}

        {!logLoading && !logError && logContent === null && (
          <Alert severity="info">No log file found for this instance.</Alert>
        )}

        {!logLoading && !logError && logContent !== null && (
          <Box
            component="pre"
            sx={{
              p: 1.5,
              m: 0,
              borderRadius: 1,
              bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
              border: '1px solid',
              borderColor: 'divider',
              fontSize: '0.72rem',
              fontFamily: '"Fira Code", "Cascadia Code", monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: 1.6,
            }}
          >
            {logContent}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default InstanceLogPanel;
