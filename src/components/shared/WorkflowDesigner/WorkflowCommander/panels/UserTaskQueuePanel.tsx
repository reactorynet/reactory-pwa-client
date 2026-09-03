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
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import TaskExecutionDialog from './TaskExecutionDialog';
import { WorkflowTask } from '../types';

export interface UserTaskQueuePanelProps {
  tasks: WorkflowTask[];
  loading: boolean;
  onRefresh: () => void;
  onCompleteTask: (taskId: string, resultData: any) => Promise<any>;
  mode?: string;
}

export const UserTaskQueuePanel: React.FC<UserTaskQueuePanelProps> = ({
  tasks,
  loading,
  onRefresh,
  onCompleteTask,
  mode = 'dark',
}) => {
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);

  const handleTaskComplete = async (task: WorkflowTask, resultData: any) => {
    await onCompleteTask(task.id, resultData);
    setSelectedTask(null);
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'failed');

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
            Pending User Tasks
          </Typography>
          <Chip
            size="small"
            label={pendingTasks.length}
            color={pendingTasks.length > 0 ? 'warning' : 'default'}
            sx={{ fontWeight: 700, height: 20 }}
          />
        </Box>

        <IconButton size="small" onClick={onRefresh} disabled={loading} color="inherit">
          {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {pendingTasks.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <AssignmentIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2">No tasks awaiting your input.</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {pendingTasks.map((task) => (
              <Paper
                key={task.id}
                elevation={1}
                sx={{
                  mb: 1,
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  border: '1px solid',
                  borderColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  },
                }}
              >
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36, color: 'warning.main' }}>
                    <AssignmentIcon fontSize="small" />
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {task.title}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {task.workflowId && (
                          <Chip size="small" label={task.workflowId} variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                        )}
                        {task.stepId && (
                          <Typography variant="caption" color="text.secondary">
                            Step: {task.stepId}
                          </Typography>
                        )}
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <Tooltip title="Open & Take Action">
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        startIcon={<PlayArrowIcon fontSize="small" />}
                        onClick={() => setSelectedTask(task)}
                        sx={{ fontSize: '0.72rem', py: 0.25, px: 1 }}
                      >
                        Action
                      </Button>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Box>

      {/* Task Execution Dialog */}
      <TaskExecutionDialog
        open={Boolean(selectedTask)}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={handleTaskComplete}
        mode={mode}
      />
    </Box>
  );
};

export default UserTaskQueuePanel;
