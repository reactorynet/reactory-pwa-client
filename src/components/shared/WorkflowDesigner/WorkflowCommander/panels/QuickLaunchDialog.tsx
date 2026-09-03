import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Chip,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SchemaIcon from '@mui/icons-material/Schema';
import { useReactory } from '@reactory/client-core/api';
import { gql } from '@apollo/client';
import { ReactoryForm } from '@reactory/client-core/components/reactory/ReactoryForm/ReactoryForm';

const GET_WORKFLOWS = gql`
  query GetAccessibleWorkflows {
    workflows(pagination: { limit: 100, page: 1 }) {
      workflows {
        id
        name
        nameSpace
        version
        description
        tags
        workflowType
      }
    }
  }
`;

const GET_WORKFLOW_YAML_DEF = gql`
  query GetWorkflowYamlDef($nameSpace: String!, $name: String!, $version: String) {
    workflowYamlDefinition(nameSpace: $nameSpace, name: $name, version: $version) {
      nameSpace
      name
      version
      description
      inputs
      steps {
        id
        name
        type
        inputs
      }
    }
  }
`;

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

interface WorkflowOption {
  id: string;
  name: string;
  nameSpace: string;
  version: string;
  description?: string;
  tags?: string[];
  workflowType?: string;
}

export const QuickLaunchDialog: React.FC<QuickLaunchDialogProps> = ({
  open,
  onClose,
  onLaunched,
  mode = 'dark',
}) => {
  const reactory = useReactory();

  const [availableWorkflows, setAvailableWorkflows] = useState<WorkflowOption[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowOption | null>(null);

  const [yamlDefinition, setYamlDefinition] = useState<any>(null);
  const [loadingDefinition, setLoadingDefinition] = useState(false);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [rawJson, setRawJson] = useState('{}');
  const [useRawJson, setUseRawJson] = useState(false);

  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch registered accessible workflows from GraphQL
  const fetchWorkflows = useCallback(async () => {
    if (!reactory?.graphqlQuery) return;
    try {
      setLoadingWorkflows(true);
      setError(null);
      const res: any = await reactory.graphqlQuery(GET_WORKFLOWS, {});
      if (res?.data?.workflows?.workflows) {
        setAvailableWorkflows(res.data.workflows.workflows);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load workflow catalog');
    } finally {
      setLoadingWorkflows(false);
    }
  }, [reactory]);

  useEffect(() => {
    if (open) {
      fetchWorkflows();
    } else {
      setSelectedWorkflow(null);
      setYamlDefinition(null);
      setFormData({});
      setRawJson('{}');
      setError(null);
    }
  }, [open, fetchWorkflows]);

  // When a workflow is selected, fetch its YAML definition and auto-construct schema
  useEffect(() => {
    if (!selectedWorkflow || !reactory?.graphqlQuery) {
      setYamlDefinition(null);
      return;
    }

    const loadDef = async () => {
      try {
        setLoadingDefinition(true);
        const res: any = await reactory.graphqlQuery(GET_WORKFLOW_YAML_DEF, {
          nameSpace: selectedWorkflow.nameSpace,
          name: selectedWorkflow.name,
          version: selectedWorkflow.version,
        });

        const def = res?.data?.workflowYamlDefinition;
        if (def) {
          setYamlDefinition(def);

          // Extract defaults from definition inputs
          const rawInputs = def.inputs || {};
          const initialData: Record<string, any> = {};

          if (typeof rawInputs === 'object' && rawInputs !== null) {
            // Check if inputs has properties directly or map of field definitions
            const properties = rawInputs.properties || rawInputs;
            Object.keys(properties).forEach((k) => {
              const spec = properties[k];
              if (spec && typeof spec === 'object' && 'default' in spec) {
                initialData[k] = spec.default;
              } else if (typeof spec !== 'object') {
                initialData[k] = spec;
              }
            });
          }

          setFormData(initialData);
          setRawJson(JSON.stringify(initialData, null, 2));
        }
      } catch (err: any) {
        // Fallback gracefully
        setYamlDefinition(null);
      } finally {
        setLoadingDefinition(false);
      }
    };

    loadDef();
  }, [selectedWorkflow, reactory]);

  // Construct JSON schema for ReactoryForm
  const formDefinition: Reactory.Forms.IReactoryForm | null = useMemo(() => {
    if (!yamlDefinition?.inputs) return null;

    const rawInputs = yamlDefinition.inputs;
    let schema: any = {
      type: 'object',
      properties: {},
    };

    if (rawInputs.type === 'object' && rawInputs.properties) {
      schema = rawInputs;
    } else if (typeof rawInputs === 'object' && rawInputs !== null) {
      const props: Record<string, any> = {};
      const requiredFields: string[] = [];

      Object.entries(rawInputs).forEach(([key, val]: [string, any]) => {
        if (typeof val === 'object' && val !== null) {
          props[key] = {
            title: val.title || key,
            type: val.type || (typeof val.default === 'number' ? 'number' : typeof val.default === 'boolean' ? 'boolean' : 'string'),
            description: val.description,
            default: val.default,
            ...(val.enum ? { enum: val.enum } : {}),
          };
          if (val.required) requiredFields.push(key);
        } else {
          props[key] = {
            title: key,
            type: typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string',
            default: val,
          };
        }
      });

      schema = {
        type: 'object',
        properties: props,
        ...(requiredFields.length > 0 ? { required: requiredFields } : {}),
      };
    }

    return {
      id: `quickLaunch.${selectedWorkflow?.id || 'workflow'}@1.0.0`,
      name: selectedWorkflow?.name || 'QuickLaunchForm',
      nameSpace: selectedWorkflow?.nameSpace || 'core',
      version: selectedWorkflow?.version || '1.0.0',
      schema,
      uiSchema: {},
    };
  }, [yamlDefinition, selectedWorkflow]);

  const handleLaunch = async () => {
    if (!selectedWorkflow) {
      setError('Please select a workflow to launch');
      return;
    }

    let executionPayload: any = {};
    if (useRawJson) {
      try {
        executionPayload = JSON.parse(rawJson || '{}');
      } catch (e) {
        setError('Invalid JSON input format');
        return;
      }
    } else {
      executionPayload = formData;
    }

    try {
      setLaunching(true);
      setError(null);

      await reactory.graphqlMutation(START_WORKFLOW, {
        workflowId: selectedWorkflow.id,
        input: {
          input: executionPayload,
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
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: mode === 'dark' ? '#121826' : '#ffffff',
          color: mode === 'dark' ? '#ffffff' : 'inherit',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrowIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Quick Launch Workflow
          </Typography>
        </Box>
        {formDefinition && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={useRawJson}
                onChange={(e) => setUseRawJson(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Raw JSON
              </Typography>
            }
          />
        )}
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Workflow Selection Autocomplete */}
        <Autocomplete
          options={availableWorkflows}
          getOptionLabel={(option) => `${option.nameSpace}.${option.name}@${option.version}`}
          value={selectedWorkflow}
          onChange={(_, newVal) => setSelectedWorkflow(newVal)}
          loading={loadingWorkflows}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Workflow"
              placeholder="Search accessible workflows..."
              size="small"
              required
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingWorkflows ? <CircularProgress color="inherit" size={18} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {option.name}
                </Typography>
                <Chip size="small" label={`v${option.version}`} variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                  {option.nameSpace}
                </Typography>
              </Box>
              {option.description && (
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {option.description}
                </Typography>
              )}
            </Box>
          )}
        />

        {selectedWorkflow && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {selectedWorkflow.name} ({selectedWorkflow.nameSpace})
            </Typography>
            {selectedWorkflow.description && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {selectedWorkflow.description}
              </Typography>
            )}
            {selectedWorkflow.tags && selectedWorkflow.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                {selectedWorkflow.tags.map((t) => (
                  <Chip key={t} label={t} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Inputs Form */}
        {selectedWorkflow && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SchemaIcon fontSize="small" color="primary" />
              Execution Parameters
            </Typography>

            {loadingDefinition ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : formDefinition && !useRawJson ? (
              <Box sx={{ '& .MuiPaper-root': { bgcolor: 'transparent' } }}>
                <ReactoryForm
                  key={`form_${selectedWorkflow.id}`}
                  formDef={formDefinition}
                  data={formData}
                  onChange={(val: any) => {
                    const data = val?.formData || val || {};
                    setFormData(data);
                    setRawJson(JSON.stringify(data, null, 2));
                  }}
                />
              </Box>
            ) : (
              <TextField
                label="Execution Inputs (JSON)"
                fullWidth
                multiline
                rows={5}
                size="small"
                value={rawJson}
                onChange={(e) => {
                  setRawJson(e.target.value);
                  try {
                    setFormData(JSON.parse(e.target.value));
                  } catch (err) {
                    // Ignore parse error on text change
                  }
                }}
                placeholder='{ "key": "value" }'
              />
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={launching} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleLaunch}
          disabled={launching || !selectedWorkflow}
          startIcon={launching ? <CircularProgress size={16} /> : <PlayArrowIcon />}
        >
          Execute Workflow
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickLaunchDialog;
