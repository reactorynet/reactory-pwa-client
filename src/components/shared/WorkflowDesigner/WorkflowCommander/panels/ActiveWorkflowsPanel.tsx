import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
  Paper,
  Tooltip,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { WorkflowInstanceSummary } from '../types';

export interface ActiveWorkflowsPanelProps {
  instances: WorkflowInstanceSummary[];
  loading: boolean;
  onRefresh: () => void;
  onPause: (instanceId: string) => Promise<any>;
  onResume: (instanceId: string) => Promise<any>;
  onCancel: (instanceId: string) => Promise<any>;
  mode?: string;
}

export const ActiveWorkflowsPanel: React.FC<ActiveWorkflowsPanelProps> = ({
  instances,
  loading,
  onRefresh,
  onPause,
  onResume,
  onCancel,
  mode = 'dark',
}) => {
  const activeRuns = instances.filter(
    (i) => i.status === 'RUNNING' || i.status === 'PENDING' || i.status === 'PAUSED'
  );

  return (
    <Box sx={{ width: '100%', maxHeight: 450, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Active Executions
          </Typography>
          <Chip
            size="small"
            label={activeRuns.length}
            color={activeRuns.length > 0 ? 'info' : 'default'}
            sx={{ fontWeight: 700, height: 20 }}
          />
        </Box>

        <IconButton size="small" onClick={onRefresh} disabled={loading} color="inherit">
          {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {activeRuns.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <AccountTreeIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2">No active workflows currently running.</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {activeRuns.map((instance) => {
              const isPaused = instance.status === 'PAUSED';
              return (
                <Paper
                  key={instance.id}
                  elevation={1}
                  sx={{
                    mb: 1,
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    border: '1px solid',
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  <ListItem disableGutters>
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: isPaused ? 'warning.main' : 'info.main',
                      }}
                    >
                      <AccountTreeIcon fontSize="small" />
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {instance.name || instance.id}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Chip
                            size="small"
                            label={instance.status}
                            color={isPaused ? 'warning' : 'info'}
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            ID: {instance.id.substring(0, 8)}...
                          </Typography>
                        </Box>
                      }
                    />

                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {isPaused ? (
                          <Tooltip title="Resume Execution">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => onResume(instance.id)}
                            >
                              <PlayCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Pause Execution">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => onPause(instance.id)}
                            >
                              <PauseCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Cancel Execution">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onCancel(instance.id)}
                          >
                            <CancelOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Paper>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default ActiveWorkflowsPanel;
