import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useReactory } from '@reactory/client-core/api';
import { gql } from '@apollo/client';

const START_WORKFLOW = gql`
  mutation StartWorkflow($workflowId: String!, $input: WorkflowExecutionInput) {
    startWorkflow(workflowId: $workflowId, input: $input) {
      id
      status
    }
  }
`;

export interface QuickLaunchDialogProps {
  open: boolean;
  onClose: () => void;
  onLaunched?: () => void;
  mode?: string;
}

export const QuickLaunchDialog: React.FC<QuickLaunchDialogProps> = ({
  open,
  onClose,
  onLaunched,
  mode = 'dark',
}) => {
  const reactory = useReactory();
  const [workflowId, setWorkflowId] = useState('');
  const [inputJson, setInputJson] = useState('{}');
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLaunch = async () => {
    if (!workflowId.trim()) {
      setError('Workflow ID / FQN is required (e.g., core.WorkflowName@1.0.0)');
      return;
    }

    let parsedInputs = {};
    if (inputJson.trim()) {
      try {
        parsedInputs = JSON.parse(inputJson);
      } catch (e) {
        setError('Invalid JSON input format');
        return;
      }
    }

    try {
      setLaunching(true);
      setError(null);
      await reactory.graphqlMutation(START_WORKFLOW, {
        workflowId,
        input: {
          inputs: JSON.stringify(parsedInputs),
        },
      });

      onClose();
      if (onLaunched) onLaunched();
    } catch (err: any) {
      setError(err?.message || 'Failed to start workflow');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !launching && onClose()}
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
      <DialogTitle>Quick Launch Workflow</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Workflow ID / FQN"
          fullWidth
          required
          size="small"
          value={workflowId}
          onChange={(e) => setWorkflowId(e.target.value)}
          placeholder="core.MyWorkflow@1.0.0"
        />

        <TextField
          label="Execution Inputs (JSON)"
          fullWidth
          multiline
          rows={4}
          size="small"
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          placeholder='{ "key": "value" }'
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={launching} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleLaunch}
          disabled={launching}
          startIcon={launching ? <CircularProgress size={16} /> : <PlayArrowIcon />}
        >
          Execute
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickLaunchDialog;
