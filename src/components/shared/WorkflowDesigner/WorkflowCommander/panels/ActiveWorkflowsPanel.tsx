import React, { useState, useMemo } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DescriptionIcon from '@mui/icons-material/Description';
import moment from 'moment';
import { useReactory } from '@reactory/client-core/api';
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

interface WorkflowHistoryGroup {
  workflowDefinitionId: string;
  runs: WorkflowHistoryItem[];
  latestRun: WorkflowHistoryItem;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
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
  const reactory = useReactory();
  const [tab, setTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingInstanceId, setInspectingInstanceId] = useState<string | null>(null);

  const WorkflowInstanceInspector = reactory?.getComponent('core.WorkflowInstanceInspector@1.0.0') as React.ComponentType<any> | null;

  const activeRuns = instances.filter(
    (i) => i.status === 'RUNNING' || i.status === 'PENDING' || i.status === 'PAUSED'
  );

  // Group history instances by workflowDefinitionId
  const historyGroups: WorkflowHistoryGroup[] = useMemo(() => {
    const map = new Map<string, WorkflowHistoryItem[]>();

    historyInstances.forEach((item) => {
      const defId = item.workflowDefinitionId || 'Unknown Workflow';
      if (!map.has(defId)) {
        map.set(defId, []);
      }
      map.get(defId)!.push(item);
    });

    const groups: WorkflowHistoryGroup[] = [];

    map.forEach((runs, workflowDefinitionId) => {
      // Sort runs descending by creation time
      runs.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());

      const latestRun = runs[0];
      const completedRuns = runs.filter((r) => r.status === 2 || r.statusLabel?.toLowerCase() === 'complete').length;
      const failedRuns = runs.filter((r) => r.status === 3 || r.statusLabel?.toLowerCase() === 'failed' || r.statusLabel?.toLowerCase() === 'terminated').length;

      groups.push({
        workflowDefinitionId,
        runs,
        latestRun,
        totalRuns: runs.length,
        completedRuns,
        failedRuns,
      });
    });

    // Sort groups by latest execution time
    groups.sort((a, b) => new Date(b.latestRun.createTime).getTime() - new Date(a.latestRun.createTime).getTime());

    return groups;
  }, [historyInstances]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return historyGroups;
    const term = searchTerm.toLowerCase();

    return historyGroups
      .map((g) => {
        const matchesDef = g.workflowDefinitionId.toLowerCase().includes(term);
        const matchingRuns = g.runs.filter(
          (r) =>
            r.id.toLowerCase().includes(term) ||
            (r.statusLabel && r.statusLabel.toLowerCase().includes(term))
        );

        if (matchesDef) return g;
        if (matchingRuns.length > 0) {
          return { ...g, runs: matchingRuns };
        }
        return null;
      })
      .filter(Boolean) as WorkflowHistoryGroup[];
  }, [historyGroups, searchTerm]);

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
    <Box sx={{ width: '100%', maxHeight: 560, display: 'flex', flexDirection: 'column' }}>
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
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Tooltip title="Inspect Instance Details">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setInspectingInstanceId(instance.id)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

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

      {/* Tab 1: Execution History (Grouped by Workflow Definition) */}
      {tab === 1 && (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search executions by workflow name or instance ID..."
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

          {filteredGroups.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <HistoryIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
              <Typography variant="body2">No execution history found.</Typography>
            </Box>
          ) : (
            filteredGroups.map((group) => {
              const successRate = Math.round((group.completedRuns / group.totalRuns) * 100);

              return (
                <Accordion
                  key={group.workflowDefinitionId}
                  defaultExpanded={filteredGroups.length === 1}
                  sx={{
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: '1px solid',
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderRadius: '8px !important',
                    mb: 1,
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1.5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {group.workflowDefinitionId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Latest: {moment(group.latestRun.createTime).fromNow()}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          size="small"
                          label={`${group.totalRuns} ${group.totalRuns === 1 ? 'run' : 'runs'}`}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.68rem' }}
                        />
                        <Chip
                          size="small"
                          label={`${successRate}% success`}
                          color={group.failedRuns === 0 ? 'success' : 'warning'}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                        />
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                    <List dense disablePadding>
                      {group.runs.map((item) => {
                        const durationSeconds = item.duration ? `${Math.round(item.duration / 100) / 10}s` : null;

                        return (
                          <Paper
                            key={item.id}
                            elevation={0}
                            sx={{
                              mb: 0.75,
                              p: 1,
                              borderRadius: 1,
                              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                              border: '1px solid',
                              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                              },
                            }}
                            onClick={() => setInspectingInstanceId(item.id)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getStatusIcon(item.statusLabel)}
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                      {item.id.substring(0, 10)}...
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={item.statusLabel}
                                      color={getStatusChipColor(item.statusLabel)}
                                      sx={{ height: 16, fontSize: '0.62rem' }}
                                    />
                                    {durationSeconds && (
                                      <Typography variant="caption" color="text.secondary">
                                        {durationSeconds}
                                      </Typography>
                                    )}
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {moment(item.createTime).format('MMM D, YYYY HH:mm:ss')} • {item.completedStepCount}/{item.stepCount} steps
                                  </Typography>
                                </Box>
                              </Box>

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Tooltip title="Inspect Instance">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<VisibilityIcon fontSize="small" />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInspectingInstanceId(item.id);
                                    }}
                                    sx={{ height: 24, fontSize: '0.7rem', textTransform: 'none', py: 0 }}
                                  >
                                    Inspect
                                  </Button>
                                </Tooltip>

                                {item.logFileUrl && (
                                  <Tooltip title="View Logs">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(item.logFileUrl, '_blank');
                                      }}
                                    >
                                      <DescriptionIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                          </Paper>
                        );
                      })}
                    </List>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </Box>
      )}

      {/* Instance Inspector Modal */}
      <Dialog
        open={!!inspectingInstanceId}
        onClose={() => setInspectingInstanceId(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            height: '80vh',
            bgcolor: mode === 'dark' ? '#121826' : '#ffffff',
            color: mode === 'dark' ? '#ffffff' : 'inherit',
          },
        }}
      >
        {inspectingInstanceId && WorkflowInstanceInspector ? (
          <WorkflowInstanceInspector
            reactory={reactory}
            instanceId={inspectingInstanceId}
            onClose={() => setInspectingInstanceId(null)}
          />
        ) : inspectingInstanceId ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading instance inspector ({inspectingInstanceId})...
            </Typography>
          </Box>
        ) : null}
      </Dialog>
    </Box>
  );
};

export default ActiveWorkflowsPanel;
