import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Icon,
  CircularProgress,
  Chip,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Tooltip,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import CloseIcon from '@mui/icons-material/Close';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import BoltIcon from '@mui/icons-material/Bolt';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DescriptionIcon from '@mui/icons-material/Description';
import moment from 'moment';
import { useReactory } from '@reactory/client-core/api';
import { gql } from '@apollo/client';

export interface WorkflowInstanceInspectorProps {
  instanceId: string;
  onClose?: () => void;
  mode?: string;
}

const WORKFLOW_STATUS: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  0: { label: 'PENDING', color: 'default', icon: <ScheduleIcon fontSize="small" /> },
  1: { label: 'RUNNING', color: 'primary', icon: <CircularProgress size={16} /> },
  2: { label: 'COMPLETE', color: 'success', icon: <CheckCircleIcon fontSize="small" color="success" /> },
  3: { label: 'TERMINATED', color: 'error', icon: <ErrorIcon fontSize="small" color="error" /> },
  4: { label: 'SUSPENDED', color: 'warning', icon: <PauseCircleIcon fontSize="small" color="warning" /> },
};

const STEP_STATUS: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  0: { label: 'LEGACY', color: 'default', icon: <ScheduleIcon fontSize="small" /> },
  1: { label: 'PENDING', color: 'default', icon: <ScheduleIcon fontSize="small" /> },
  2: { label: 'RUNNING', color: 'primary', icon: <CircularProgress size={14} /> },
  3: { label: 'COMPLETE', color: 'success', icon: <CheckCircleIcon fontSize="small" color="success" /> },
  4: { label: 'SLEEPING', color: 'info', icon: <HourglassTopIcon fontSize="small" color="info" /> },
  5: { label: 'WAITING', color: 'info', icon: <HourglassTopIcon fontSize="small" color="info" /> },
  6: { label: 'FAILED', color: 'error', icon: <ErrorIcon fontSize="small" color="error" /> },
  7: { label: 'COMPENSATED', color: 'warning', icon: <RefreshIcon fontSize="small" color="warning" /> },
  8: { label: 'CANCELLED', color: 'warning', icon: <CloseIcon fontSize="small" color="warning" /> },
};

const QUERY_INSTANCE = gql`
  query WorkflowInstanceInspectorDetail($instanceId: String!) {
    workflowExecutionHistoryById(instanceId: $instanceId) {
      id
      workflowDefinitionId
      version
      status
      statusLabel
      description
      createTime
      completeTime
      duration
      data
      stepCount
      completedStepCount
      failedStepCount
      executionPointers {
        id
        stepId
        stepName
        status
        statusLabel
        startTime
        endTime
        duration
        retryCount
        active
        persistenceData
        eventData
        eventName
        eventKey
        eventPublished
        outcome
        errorMessage
        errorStack
        errorTime
        errors {
          message
          stack
          errorTime
          retryCount
        }
      }
    }
  }
`;

const QUERY_LOG_URL = gql`
  query WorkflowInstanceLogFileUrl($instanceId: String!) {
    workflowInstanceLogFileUrl(instanceId: $instanceId)
  }
`;

const MUTATION_CANCEL = gql`
  mutation CancelWorkflowInstance($instanceId: String!) {
    cancelWorkflowInstance(instanceId: $instanceId) {
      success
      message
    }
  }
`;

const MUTATION_SIGNAL = gql`
  mutation SignalWorkflowInstance($instanceId: String!, $stepId: String, $eventData: JSON) {
    signalWorkflowInstance(instanceId: $instanceId, stepId: $stepId, eventData: $eventData) {
      success
      message
    }
  }
`;

export const WorkflowInstanceInspector: React.FC<WorkflowInstanceInspectorProps> = ({
  instanceId,
  onClose,
  mode = 'dark',
}) => {
  const reactory = useReactory();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const [logContent, setLogContent] = useState<string | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logFetched, setLogFetched] = useState(false);

  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [signalTarget, setSignalTarget] = useState<any>(null);
  const [signalData, setSignalData] = useState<string>('{}');
  const [signalling, setSignalling] = useState(false);

  // Fetch instance data from GraphQL
  useEffect(() => {
    let cancelled = false;

    const fetchInstance = async () => {
      if (!instanceId || !reactory?.graphqlQuery) return;
      try {
        setLoading(true);
        setErrorMsg(null);
        const res: any = await reactory.graphqlQuery(QUERY_INSTANCE, { instanceId });
        if (cancelled) return;

        if (res?.data?.workflowExecutionHistoryById) {
          setInstance(res.data.workflowExecutionHistoryById);
        } else {
          setErrorMsg('Workflow instance not found');
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Failed to load workflow instance');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInstance();
    return () => {
      cancelled = true;
    };
  }, [instanceId, refreshKey, reactory]);

  // Fetch log when Logs tab is activated
  useEffect(() => {
    if (activeTab !== 3 || logFetched || !instanceId || !reactory?.graphqlQuery) return;
    let cancelled = false;

    const fetchLog = async () => {
      setLogLoading(true);
      setLogError(null);
      try {
        const res: any = await reactory.graphqlQuery(QUERY_LOG_URL, { instanceId });
        const url: string | null = res?.data?.workflowInstanceLogFileUrl ?? null;

        if (!url) {
          if (!cancelled) setLogContent(null);
          return;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const text = await response.text();
        if (!cancelled) setLogContent(text);
      } catch (err: any) {
        if (!cancelled) {
          setLogError(err?.message || 'Failed to load log file');
        }
      } finally {
        if (!cancelled) {
          setLogLoading(false);
          setLogFetched(true);
        }
      }
    };

    fetchLog();
    return () => {
      cancelled = true;
    };
  }, [activeTab, logFetched, instanceId, reactory]);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return 'N/A';
    return moment(d).format('MMM D, YYYY HH:mm:ss');
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatStepName = (raw: string | null | undefined): string => {
    if (!raw) return '';
    if (/^\(.*\)$/.test(raw)) return raw;
    return raw
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim()
      .toUpperCase();
  };

  const handleStopConfirm = async () => {
    if (!reactory?.graphqlMutation) return;
    setStopping(true);
    try {
      const res: any = await reactory.graphqlMutation(MUTATION_CANCEL, { instanceId });
      if (res?.data?.cancelWorkflowInstance?.success) {
        if (typeof reactory.createNotification === 'function') {
          reactory.createNotification('Workflow instance cancelled', { type: 'success' });
        }
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err: any) {
      if (typeof reactory.createNotification === 'function') {
        reactory.createNotification(err?.message || 'Failed to cancel instance', { type: 'error' });
      }
    } finally {
      setStopping(false);
      setStopConfirmOpen(false);
    }
  };

  const handleSignalConfirm = async () => {
    if (!signalTarget || !reactory?.graphqlMutation) return;
    setSignalling(true);
    try {
      let parsedData: any = {};
      if (signalData && signalData.trim().length > 0) {
        try {
          parsedData = JSON.parse(signalData);
        } catch (e: any) {
          if (typeof reactory.createNotification === 'function') {
            reactory.createNotification(`Invalid JSON: ${e.message}`, { type: 'error' });
          }
          setSignalling(false);
          return;
        }
      }

      const stepId = signalTarget.stepName || String(signalTarget.stepId);
      const res: any = await reactory.graphqlMutation(MUTATION_SIGNAL, {
        instanceId,
        stepId,
        eventData: parsedData,
      });

      if (res?.data?.signalWorkflowInstance?.success) {
        if (typeof reactory.createNotification === 'function') {
          reactory.createNotification('Event published. Resuming step...', { type: 'success' });
        }
        setSignalTarget(null);
        setTimeout(() => setRefreshKey((prev) => prev + 1), 1500);
      }
    } catch (err: any) {
      if (typeof reactory.createNotification === 'function') {
        reactory.createNotification(err?.message || 'Failed to publish event', { type: 'error' });
      }
    } finally {
      setSignalling(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading workflow instance details...
        </Typography>
      </Box>
    );
  }

  if (errorMsg) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Inspection Error</AlertTitle>
          {errorMsg}
        </Alert>
      </Box>
    );
  }

  if (!instance) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No workflow instance data available.
        </Typography>
      </Box>
    );
  }

  const isStoppable = [0, 1, 4].includes(Number(instance.status));
  const wfStatus = WORKFLOW_STATUS[instance.status] || WORKFLOW_STATUS[0];
  const pointers: any[] = instance.executionPointers || [];
  const sortedPointers = [...pointers].sort((a, b) => a.stepId - b.stepId);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            {wfStatus.icon}
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {instance.workflowDefinitionId}
            </Typography>
            <Chip
              label={instance.statusLabel || wfStatus.label}
              color={wfStatus.color as any}
              size="small"
              variant="outlined"
            />
          </Box>
          {instance.description && (
            <Typography variant="body2" color="text.secondary">
              {instance.description}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isStoppable && (
            <Button
              onClick={() => setStopConfirmOpen(true)}
              color="warning"
              size="small"
              variant="outlined"
              startIcon={<StopCircleIcon />}
            >
              Stop
            </Button>
          )}
          {onClose && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ minHeight: 38 }}
        >
          <Tab label="Overview" sx={{ minHeight: 38, py: 0.5 }} />
          <Tab label={`Steps (${sortedPointers.length})`} sx={{ minHeight: 38, py: 0.5 }} />
          <Tab label="Data" sx={{ minHeight: 38, py: 0.5 }} />
          <Tab label="Logs" sx={{ minHeight: 38, py: 0.5 }} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {/* Tab 0: Overview */}
        {activeTab === 0 && (
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 180, color: 'text.secondary' }}>Instance ID</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {instance.id}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Version</TableCell>
                    <TableCell>{instance.version}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Created</TableCell>
                    <TableCell>{formatDate(instance.createTime)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Completed</TableCell>
                    <TableCell>{formatDate(instance.completeTime)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Duration</TableCell>
                    <TableCell>{formatDuration(instance.duration)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Steps</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={`${instance.completedStepCount} completed`} size="small" color="success" variant="outlined" />
                        {instance.failedStepCount > 0 && (
                          <Chip label={`${instance.failedStepCount} failed`} size="small" color="error" variant="outlined" />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          / {instance.stepCount} total
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Tab 1: Steps */}
        {activeTab === 1 && (
          <Box>
            {sortedPointers.length === 0 ? (
              <Alert severity="info">No execution steps recorded for this instance.</Alert>
            ) : (
              <Stepper orientation="vertical" activeStep={-1}>
                {sortedPointers.map((pointer: any) => {
                  const stepStatus = STEP_STATUS[pointer.status] || STEP_STATUS[1];
                  const isExpanded = expandedStep === pointer.id;
                  const isWaiting = Boolean(pointer.eventName) && !pointer.eventPublished;
                  const isFailed = pointer.status === 6;

                  return (
                    <Step key={pointer.id} active expanded>
                      <StepLabel
                        icon={stepStatus.icon}
                        onClick={() => setExpandedStep((p) => (p === pointer.id ? null : pointer.id))}
                        sx={{ cursor: 'pointer' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatStepName(pointer.stepName || `Step ${pointer.stepId}`)}
                          </Typography>
                          <Chip
                            label={pointer.statusLabel || stepStatus.label}
                            size="small"
                            variant="outlined"
                            color={stepStatus.color as any}
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                          {pointer.retryCount > 0 && (
                            <Chip
                              label={`${pointer.retryCount} retries`}
                              size="small"
                              variant="outlined"
                              color="warning"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          )}
                          <ExpandMoreIcon
                            fontSize="small"
                            sx={{
                              ml: 'auto',
                              transition: 'transform 0.2s',
                              transform: isExpanded ? 'rotate(180deg)' : 'none',
                              color: 'text.secondary',
                            }}
                          />
                        </Box>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(pointer.startTime)}
                          {pointer.endTime ? ` → ${formatDate(pointer.endTime)}` : ''}
                          {pointer.duration !== null && pointer.duration !== undefined
                            ? ` (${formatDuration(pointer.duration)})`
                            : ''}
                        </Typography>

                        {isWaiting && (
                          <Alert
                            severity="info"
                            variant="outlined"
                            sx={{ mt: 1 }}
                            action={
                              <Button
                                size="small"
                                variant="contained"
                                color="info"
                                startIcon={<BoltIcon />}
                                onClick={() => {
                                  setSignalTarget(pointer);
                                  setSignalData('{}');
                                }}
                              >
                                Continue
                              </Button>
                            }
                          >
                            Waiting for event: <strong>{pointer.eventName}</strong>
                          </Alert>
                        )}

                        {isFailed && pointer.errorMessage && (
                          <Alert severity="error" variant="outlined" sx={{ mt: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {pointer.errorMessage}
                            </Typography>
                            {pointer.errorStack && (
                              <Box
                                component="pre"
                                sx={{
                                  mt: 1,
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: 'grey.900',
                                  fontSize: '0.7rem',
                                  fontFamily: 'monospace',
                                  overflow: 'auto',
                                  maxHeight: 120,
                                }}
                              >
                                {pointer.errorStack}
                              </Box>
                            )}
                          </Alert>
                        )}

                        <Collapse in={isExpanded}>
                          <Box sx={{ mt: 1.5 }}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                Pointer ID: {pointer.id}
                              </Typography>
                              {pointer.outcome && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                    Outcome
                                  </Typography>
                                  <Box component="pre" sx={{ p: 1, borderRadius: 1, bgcolor: 'background.default', fontSize: '0.75rem', overflow: 'auto', maxHeight: 150 }}>
                                    {JSON.stringify(pointer.outcome, null, 2)}
                                  </Box>
                                </Box>
                              )}
                            </Paper>
                          </Box>
                        </Collapse>
                      </StepContent>
                    </Step>
                  );
                })}
              </Stepper>
            )}
          </Box>
        )}

        {/* Tab 2: Data */}
        {activeTab === 2 && (
          <Box>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Workflow Instance Data
              </Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: mode === 'dark' ? 'grey.950' : 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  maxHeight: '55vh',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  m: 0,
                }}
              >
                {JSON.stringify(instance.data || {}, null, 2)}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Tab 3: Logs */}
        {activeTab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Instance Execution Log
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  setLogFetched(false);
                  setLogContent(null);
                }}
                disabled={logLoading}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>

            {logLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">Loading log...</Typography>
              </Box>
            )}

            {!logLoading && logError && <Alert severity="error">{logError}</Alert>}
            {!logLoading && !logError && logContent === null && logFetched && (
              <Alert severity="info">No log file available for this instance.</Alert>
            )}

            {!logLoading && logContent !== null && (
              <Box
                component="pre"
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: mode === 'dark' ? '#0a0e17' : 'grey.100',
                  border: '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.75rem',
                  fontFamily: '"Fira Code", "Cascadia Code", monospace',
                  overflow: 'auto',
                  maxHeight: '55vh',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  m: 0,
                  lineHeight: 1.6,
                }}
              >
                {logContent}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Stop Confirmation Dialog */}
      <Dialog open={stopConfirmOpen} onClose={() => !stopping && setStopConfirmOpen(false)}>
        <DialogTitle>Stop workflow instance?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will terminate the running instance. The instance cannot be resumed afterwards.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStopConfirmOpen(false)} disabled={stopping}>
            Cancel
          </Button>
          <Button onClick={handleStopConfirm} color="warning" variant="contained" disabled={stopping}>
            {stopping ? 'Stopping...' : 'Stop Instance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Signal Dialog */}
      <Dialog open={!!signalTarget} onClose={() => !signalling && setSignalTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Continue waiting step</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Publish event <strong>{signalTarget?.eventName}</strong> to resume step execution.
          </DialogContentText>
          <TextField
            label="Event Data (JSON)"
            value={signalData}
            onChange={(e) => setSignalData(e.target.value)}
            multiline
            rows={4}
            fullWidth
            disabled={signalling}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignalTarget(null)} disabled={signalling}>
            Cancel
          </Button>
          <Button onClick={handleSignalConfirm} color="info" variant="contained" disabled={signalling}>
            {signalling ? 'Publishing...' : 'Publish Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowInstanceInspector;
