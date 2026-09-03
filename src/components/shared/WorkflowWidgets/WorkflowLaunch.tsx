import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useReactory } from '@reactory/client-core/api';
import { gql } from '@apollo/client';

export interface WorkflowLaunchProps {
  workflow: {
    id?: string;
    nameSpace: string;
    name: string;
    version: string;
    description?: string;
  };
  onSubmit?: (data: any) => void;
  reactory?: any;
}

const START_WORKFLOW = gql`
  mutation StartWorkflow($workflowId: String!, $input: WorkflowExecutionInput) {
    startWorkflow(workflowId: $workflowId, input: $input) {
      id
      status
      startTime
    }
  }
`;

export const WorkflowLaunch: React.FC<WorkflowLaunchProps> = (props) => {
  const reactory = useReactory();
  const { workflow, onSubmit } = props;

  const [inputData, setInputData] = useState('{}');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const targetWorkflowFormInputId = `${workflow.nameSpace}.${workflow.name}InputForm@${workflow.version}`;
  const InputForm = reactory?.getComponent(targetWorkflowFormInputId) as React.ComponentType<any> | null;

  const executeWorkflow = async (data: any) => {
    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      let parsedInput = {};
      try {
        const jsonString = typeof data === 'string' ? data : (inputData && inputData.trim() ? inputData : '{}');
        parsedInput = JSON.parse(jsonString);
      } catch (e) {
        throw new Error('Invalid JSON input format');
      }

      if (onSubmit) {
        onSubmit(parsedInput);
        setExecuting(false);
        return;
      }

      const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;

      const response: any = await reactory.graphqlMutation(START_WORKFLOW, {
        workflowId,
        input: {
          input: parsedInput,
          tags: ['launched-from-ui'],
          priority: 1,
        },
      });

      if (response?.data?.startWorkflow) {
        setResult(response.data.startWorkflow);
        if (typeof reactory.createNotification === 'function') {
          reactory.createNotification('Workflow started successfully', { type: 'success' });
        }
      } else {
        throw new Error('Failed to start workflow');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to execute workflow');
      if (typeof reactory.createNotification === 'function') {
        reactory.createNotification('Failed to start workflow', { type: 'error' });
      }
    } finally {
      setExecuting(false);
    }
  };

  const viewInstance = () => {
    if (result?.id && typeof reactory.navigation === 'function') {
      reactory.navigation(`/workflows/instances/${result.id}`);
    }
  };

  if (InputForm) {
    return (
      <Box sx={{ p: 2 }}>
        <InputForm
          reactory={reactory}
          workflow={workflow}
          onSubmit={(formData: any) => {
            executeWorkflow(formData);
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PlayCircleIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Launch Workflow
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 2.5 }}>
        Execute this workflow with custom input parameters. The workflow will run asynchronously.
      </Alert>

      <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          Workflow ID
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {workflow.nameSpace}.{workflow.name}@{workflow.version}
        </Typography>
      </Paper>

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Input Parameters (JSON)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder='{\n  "key": "value"\n}'
          variant="outlined"
          InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={viewInstance}>
              View
            </Button>
          }
        >
          <Typography variant="subtitle2">Workflow Started</Typography>
          <Typography variant="caption" display="block">
            Instance ID: {result.id} • Status: {result.status}
          </Typography>
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={executing ? <CircularProgress size={18} /> : <PlayArrowIcon />}
          onClick={() => executeWorkflow(inputData)}
          disabled={executing}
        >
          {executing ? 'Starting...' : 'Start Workflow'}
        </Button>

        {result && (
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={viewInstance}
          >
            View Instance
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default WorkflowLaunch;
