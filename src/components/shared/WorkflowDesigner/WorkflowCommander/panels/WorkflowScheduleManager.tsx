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
  Button,
  CircularProgress,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useReactory } from '@reactory/client-core/api';
import { gql } from '@apollo/client';
import { WorkflowScheduleItem } from '../types';

const CREATE_SCHEDULE = gql`
  mutation CreateWorkflowSchedule($config: ScheduleConfigInput!) {
    createWorkflowSchedule(config: $config) {
      id
      name
      cronExpression
      enabled
    }
  }
`;

export interface WorkflowScheduleManagerProps {
  schedules: WorkflowScheduleItem[];
  loading: boolean;
  onRefresh: () => void;
  onDeleteSchedule: (scheduleId: string) => Promise<any>;
  mode?: string;
}

export const WorkflowScheduleManager: React.FC<WorkflowScheduleManagerProps> = ({
  schedules,
  loading,
  onRefresh,
  onDeleteSchedule,
  mode = 'dark',
}) => {
  const reactory = useReactory();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [workflowId, setWorkflowId] = useState('');
  const [cronExpression, setCronExpression] = useState('0 0 * * *');
  const [scheduleName, setScheduleName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!workflowId.trim()) {
      setError('Workflow ID is required (e.g., core.WorkflowName@1.0.0)');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await reactory.graphqlMutation(CREATE_SCHEDULE, {
        config: {
          name: scheduleName || `${workflowId} Schedule`,
          cronExpression,
          enabled,
          workflow: {
            id: workflowId,
          },
        },
      });

      setCreateDialogOpen(false);
      setWorkflowId('');
      setScheduleName('');
      onRefresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create workflow schedule');
    } finally {
      setCreating(false);
    }
  };

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
            Workflow Schedules
          </Typography>
          <Chip size="small" label={schedules.length} color="default" sx={{ fontWeight: 700, height: 20 }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ fontSize: '0.72rem', py: 0.25 }}
          >
            New Schedule
          </Button>
          <IconButton size="small" onClick={onRefresh} disabled={loading} color="inherit">
            {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {schedules.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <ScheduleIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2">No scheduled workflows found.</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {schedules.map((schedule) => (
              <Paper
                key={schedule.id}
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
                  <ListItemIcon sx={{ minWidth: 36, color: schedule.enabled ? 'success.main' : 'text.disabled' }}>
                    <ScheduleIcon fontSize="small" />
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {schedule.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={schedule.cronExpression}
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                        {schedule.workflowId && (
                          <Typography variant="caption" color="text.secondary">
                            {schedule.workflowId}
                          </Typography>
                        )}
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <Tooltip title="Delete Schedule">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteSchedule(schedule.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Box>

      {/* Create Schedule Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !creating && setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: mode === 'dark' ? '#1a2234' : '#ffffff',
            color: mode === 'dark' ? '#ffffff' : 'inherit',
          },
        }}
      >
        <DialogTitle>Create Workflow Schedule</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Schedule Name"
            fullWidth
            size="small"
            value={scheduleName}
            onChange={(e) => setScheduleName(e.target.value)}
            placeholder="Daily Invoice Processing"
          />

          <TextField
            label="Workflow ID / FQN"
            fullWidth
            required
            size="small"
            value={workflowId}
            onChange={(e) => setWorkflowId(e.target.value)}
            placeholder="core.WorkflowName@1.0.0"
          />

          <TextField
            label="Cron Expression"
            fullWidth
            size="small"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            helperText="Standard 5-part cron syntax (e.g. '0 0 * * *' for midnight daily)"
          />

          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
            label="Enable immediately"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
            disabled={creating}
            startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowScheduleManager;
