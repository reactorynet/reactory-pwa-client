import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider,
  Alert,
  TextField,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import { useReactory } from '@reactory/client-core/api';
import { WorkflowTask } from '../types';

export interface TaskExecutionDialogProps {
  open: boolean;
  task: WorkflowTask | null;
  onClose: () => void;
  onComplete: (task: WorkflowTask, resultData: any) => Promise<void>;
  mode?: string;
}

export const TaskExecutionDialog: React.FC<TaskExecutionDialogProps> = ({
  open,
  task,
  onClose,
  onComplete,
  mode = 'dark',
}) => {
  const reactory = useReactory();
  const [submitting, setSubmitting] = useState(false);
  const [inputComments, setInputComments] = useState('');
  const [customData, setCustomData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  if (!task) return null;

  const handleResolve = async (approved: boolean, extraData: any = {}) => {
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        approved,
        comments: inputComments,
        ...customData,
        ...extraData,
        completedAt: new Date().toISOString(),
      };
      await onComplete(task, payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete task');
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamically resolve custom component if specified
  let DynamicComponent: any = null;
  if (task.componentFqn && reactory?.getComponent) {
    try {
      DynamicComponent = reactory.getComponent(task.componentFqn);
    } catch (e) {
      // Component not found in registry
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: mode === 'dark' ? '#1a2234' : '#ffffff',
          color: mode === 'dark' ? '#ffffff' : 'inherit',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            {task.title || 'Workflow Task'}
          </Typography>
          {task.workflowId && (
            <Chip
              size="small"
              label={task.workflowId}
              sx={{ ml: 1, fontSize: '0.75rem', height: 22 }}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Chip
          size="small"
          label={task.status.toUpperCase()}
          color={task.status === 'completed' ? 'success' : 'warning'}
        />
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ minHeight: 180 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {task.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {task.description}
          </Typography>
        )}

        {/* Dynamic Component Mount */}
        {DynamicComponent ? (
          <Box sx={{ my: 2, p: 1.5, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 1 }}>
            <DynamicComponent
              task={task}
              {...(task.componentProps || {})}
              onSubmit={(data: any) => handleResolve(true, data)}
              onReject={(data: any) => handleResolve(false, data)}
              onChange={(data: any) => setCustomData(data)}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 1 }}>
            <TextField
              label="Comments / Input"
              multiline
              rows={3}
              fullWidth
              value={inputComments}
              onChange={(e) => setInputComments(e.target.value)}
              placeholder="Enter decision rationale or input parameters..."
              variant="outlined"
              size="small"
            />
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={submitting} color="inherit">
          Cancel
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={submitting ? <CircularProgress size={16} /> : <CancelIcon />}
            onClick={() => handleResolve(false)}
            disabled={submitting}
          >
            Reject / Decline
          </Button>

          <Button
            variant="contained"
            color="success"
            startIcon={submitting ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            onClick={() => handleResolve(true)}
            disabled={submitting}
          >
            Approve / Complete
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default TaskExecutionDialog;
