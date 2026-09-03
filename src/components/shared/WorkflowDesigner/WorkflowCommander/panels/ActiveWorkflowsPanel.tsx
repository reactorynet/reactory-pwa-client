import React, { useState } from 'react';
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
  Tabs,
  Tab,
  TextField,
  InputAdornment,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import moment from 'moment';
import { WorkflowInstanceSummary, WorkflowHistoryItem } from '../types';

export interface ActiveWorkflowsPanelProps {
  instances: WorkflowInstanceSummary[];
  historyInstances?: WorkflowHistoryItem[];
  initialTab?: number;
  loading: boolean;
  onRefresh: () => void;
  onPause: (instanceId: string) => Promise<any>;
  onResume: (instanceId: string) => Promise<any>;
  onCancel: (instanceId: string) => Promise<any>;
  mode?: string;
}

export const ActiveWorkflowsPanel: React.FC<ActiveWorkflowsPanelProps> = ({
  instances = [],
  historyInstances = [],
  initialTab = 0,
  loading,
  onRefresh,
  onPause,
  onResume,
  onCancel,
  mode = 'dark',
}) => {
  const [tab, setTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  const activeRuns = instances.filter(
    (i) => i.status === 'RUNNING' || i.status === 'PENDING' || i.status === 'PAUSED'
  );

  const filteredHistory = historyInstances.filter((h) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (h.workflowDefinitionId && h.workflowDefinitionId.toLowerCase().includes(term)) ||
      (h.id && h.id.toLowerCase().includes(term)) ||
      (h.statusLabel && h.statusLabel.toLowerCase().includes(term))
    );
  });

  const getStatusIcon = (statusLabel: string) => {
    switch (statusLabel?.toLowerCase()) {
      case 'complete':
      case 'completed':
        return <CheckCircleOutlineIcon fontSize="small" color="success" />;
      case 'failed':
      case 'terminated':
        return <ErrorOutlineIcon fontSize="small" color="error" />;
      case 'running':
        return <CircularProgress size={16} color="primary" />;
      case 'paused':
      case 'suspended':
        return <PauseCircleOutlineIcon fontSize="small" color="warning" />;
      default:
        return <HourglassEmptyIcon fontSize="small" color="action" />;
    }
  };

  const getStatusChipColor = (statusLabel: string): any => {
    switch (statusLabel?.toLowerCase()) {
      case 'complete':
      case 'completed':
        return 'success';
      case 'failed':
      case 'terminated':
        return 'error';
      case 'running':
        return 'primary';
      case 'paused':
      case 'suspended':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%', maxHeight: 520, display: 'flex', flexDirection: 'column' }}>
      {/* Header Tabs */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          pt: 1,
          borderBottom: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, newTab) => setTab(newTab)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ minHeight: 40 }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <AccountTreeIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Active Runs
                </Typography>
                <Chip
                  size="small"
                  label={activeRuns.length}
                  color={activeRuns.length > 0 ? 'info' : 'default'}
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              </Box>
            }
            sx={{ minHeight: 40, py: 0.5 }}
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <HistoryIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Execution History
                </Typography>
                <Chip
                  size="small"
                  label={historyInstances.length}
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              </Box>
            }
            sx={{ minHeight: 40, py: 0.5 }}
          />
        </Tabs>

        <IconButton size="small" onClick={onRefresh} disabled={loading} color="inherit">
          {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Tab 0: Active Runs */}
      {tab === 0 && (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5 }}>
          {activeRuns.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <AccountTreeIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
              <Typography variant="body2">No active workflows currently running.</Typography>
              <Typography variant="caption" color="text.secondary">
                Switch to Execution History to view completed workflows.
              </Typography>
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
                      p: 1.25,
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
                          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
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
                            {instance.startTime && (
                              <Typography variant="caption" color="text.secondary">
                                Started: {moment(instance.startTime).fromNow()}
                              </Typography>
                            )}
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
      )}

      {/* Tab 1: Execution History */}
      {tab === 1 && (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search execution history by workflow name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 0.5 }}
          />

          {filteredHistory.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <HistoryIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
              <Typography variant="body2">No execution history found.</Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {filteredHistory.map((item) => {
                const durationSeconds = item.duration ? `${Math.round(item.duration / 100) / 10}s` : null;

                return (
                  <Paper
                    key={item.id}
                    elevation={1}
                    sx={{
                      mb: 1,
                      p: 1.25,
                      borderRadius: 1.5,
                      bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: '1px solid',
                      borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }}
                  >
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {getStatusIcon(item.statusLabel)}
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.workflowDefinitionId}
                            </Typography>
                            <Chip
                              size="small"
                              label={item.statusLabel}
                              color={getStatusChipColor(item.statusLabel)}
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              ID: {item.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Created: {moment(item.createTime).format('MMM D, HH:mm:ss')}
                            </Typography>
                            {durationSeconds && (
                              <Typography variant="caption" color="text.secondary">
                                Duration: {durationSeconds}
                              </Typography>
                            )}
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${item.completedStepCount}/${item.stepCount} steps`}
                              sx={{ height: 16, fontSize: '0.62rem' }}
                            />
                          </Box>
                        }
                      />

                      {item.logFileUrl && (
                        <ListItemSecondaryAction>
                          <Tooltip title="View Instance Logs">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => window.open(item.logFileUrl, '_blank')}
                            >
                              <DescriptionIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  </Paper>
                );
              })}
            </List>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ActiveWorkflowsPanel;
