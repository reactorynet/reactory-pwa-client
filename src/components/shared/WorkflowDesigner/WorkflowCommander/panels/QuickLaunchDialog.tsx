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
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import WidgetsIcon from '@mui/icons-material/Widgets';
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

const GET_FORM_BY_ID = gql`
  query GetFormById($id: String!) {
    ReactoryFormGetById(id: $id) {
      id
      name
      nameSpace
      version
      schema
      uiSchema
      defaultFormValue
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

  // Resolution states
  const [CustomComponent, setCustomComponent] = useState<React.ComponentType<any> | null>(null);
  const [activeFormDef, setActiveFormDef] = useState<Reactory.Forms.IReactoryForm | null>(null);
  const [formSource, setFormSource] = useState<'custom_component' | 'custom_form' | 'inferred' | 'none'>('none');
  const [loadingForm, setLoadingForm] = useState(false);

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
      setCustomComponent(null);
      setActiveFormDef(null);
      setFormSource('none');
      setFormData({});
      setRawJson('{}');
      setError(null);
    }
  }, [open, fetchWorkflows]);

  // Target input form/component FQN following the standard core.WorkflowLaunch convention:
  // const targetWorkflowFormInputId = `${workflow.nameSpace}.${workflow.name}InputForm@${workflow.version}`
  const targetWorkflowFormInputId = useMemo(() => {
    if (!selectedWorkflow) return '';
    return `${selectedWorkflow.nameSpace}.${selectedWorkflow.name}InputForm@${selectedWorkflow.version}`;
  }, [selectedWorkflow]);

  // Resolve custom launcher component, custom form schema, or inferred properties
  useEffect(() => {
    if (!selectedWorkflow || !reactory) {
      setCustomComponent(null);
      setActiveFormDef(null);
      setFormSource('none');
      return;
    }

    const resolveWorkflowInput = async () => {
      setLoadingForm(true);
      setError(null);
      setCustomComponent(null);
      setActiveFormDef(null);

      const { nameSpace, name, version } = selectedWorkflow;

      // 1. Check if a custom React component is registered matching `${nameSpace}.${name}InputForm@${version}`
      const RegisteredComp = reactory.getComponent(targetWorkflowFormInputId) as React.ComponentType<any> | null;
      if (RegisteredComp) {
        setCustomComponent(() => RegisteredComp);
        setFormSource('custom_component');
        setLoadingForm(false);
        return;
      }

      // 2. Check for matching custom ReactoryForm schema
      const candidateFormIds = [
        targetWorkflowFormInputId,
        `${nameSpace}.${name}InputForm`,
        `${nameSpace}.${name}FormInput@${version}`,
        `${nameSpace}.${name}FormInput`,
      ];

      let matchedForm: any = null;
      if (Array.isArray(reactory.formSchemas)) {
        matchedForm = reactory.formSchemas.find((f: any) =>
          candidateFormIds.includes(f.id) ||
          candidateFormIds.includes(`${f.nameSpace}.${f.name}@${f.version}`) ||
          candidateFormIds.includes(f.name)
        );
      }

      if (!matchedForm && reactory.graphqlQuery) {
        for (const candidateId of candidateFormIds) {
          try {
            const formRes: any = await reactory.graphqlQuery(GET_FORM_BY_ID, { id: candidateId });
            if (formRes?.data?.ReactoryFormGetById?.schema) {
              matchedForm = formRes.data.ReactoryFormGetById;
              break;
            }
          } catch (e) {
            // Check next candidate
          }
        }
      }

      if (matchedForm?.schema) {
        const customDef: Reactory.Forms.IReactoryForm = {
          id: matchedForm.id || targetWorkflowFormInputId,
          name: matchedForm.name || `${name}InputForm`,
          nameSpace: matchedForm.nameSpace || nameSpace,
          version: matchedForm.version || version,
          schema: matchedForm.schema,
          uiSchema: matchedForm.uiSchema || {},
        };
        const initialValues = matchedForm.defaultFormValue || {};
        setActiveFormDef(customDef);
        setFormSource('custom_form');
        setFormData(initialValues);
        setRawJson(JSON.stringify(initialValues, null, 2));
        setLoadingForm(false);
        return;
      }

      // 3. Fall back to inferred properties from workflow YAML definition
      try {
        const defRes: any = await reactory.graphqlQuery(GET_WORKFLOW_YAML_DEF, {
          nameSpace,
          name,
          version,
        });

        const yamlDef = defRes?.data?.workflowYamlDefinition;
        if (yamlDef?.inputs) {
          const rawInputs = yamlDef.inputs;
          let schema: any = { type: 'object', properties: {} };
          const initialData: Record<string, any> = {};

          if (rawInputs.type === 'object' && rawInputs.properties) {
            schema = rawInputs;
            Object.keys(rawInputs.properties).forEach((k) => {
              if (rawInputs.properties[k]?.default !== undefined) {
                initialData[k] = rawInputs.properties[k].default;
              }
            });
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
                if (val.default !== undefined) initialData[key] = val.default;
                if (val.required) requiredFields.push(key);
              } else {
                props[key] = {
                  title: key,
                  type: typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string',
                  default: val,
                };
                initialData[key] = val;
              }
            });

            schema = {
              type: 'object',
              properties: props,
              ...(requiredFields.length > 0 ? { required: requiredFields } : {}),
            };
          }

          const inferredDef: Reactory.Forms.IReactoryForm = {
            id: `quickLaunch.inferred.${nameSpace}.${name}@${version}`,
            name: `${name}_InferredInput`,
            nameSpace: nameSpace,
            version: version,
            schema,
            uiSchema: {},
          };

          setActiveFormDef(inferredDef);
          setFormSource('inferred');
          setFormData(initialData);
          setRawJson(JSON.stringify(initialData, null, 2));
        } else {
          setActiveFormDef(null);
          setFormSource('none');
          setFormData({});
          setRawJson('{}');
        }
      } catch (err) {
        setActiveFormDef(null);
        setFormSource('none');
      } finally {
        setLoadingForm(false);
      }
    };

    resolveWorkflowInput();
  }, [selectedWorkflow, targetWorkflowFormInputId, reactory]);

  const handleExecute = async (payloadOverride?: any) => {
    if (!selectedWorkflow) {
      setError('Please select a workflow to launch');
      return;
    }

    let executionPayload: any = {};
    if (payloadOverride !== undefined) {
      executionPayload = typeof payloadOverride === 'string' ? (() => { try { return JSON.parse(payloadOverride); } catch { return {}; } })() : payloadOverride;
    } else if (useRawJson) {
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

      const res: any = await reactory.graphqlMutation(START_WORKFLOW, {
        workflowId: selectedWorkflow.id,
        input: {
          input: executionPayload,
          tags: ['launched-from-ui'],
          priority: 1,
        },
      });

      if (res?.data?.startWorkflow) {
        if (typeof reactory.createNotification === 'function') {
          reactory.createNotification('Workflow started successfully', { type: 'success' });
        }
        onClose();
        if (onLaunched) onLaunched();
      } else {
        throw new Error('Failed to start workflow');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to execute workflow');
      if (typeof reactory.createNotification === 'function') {
        reactory.createNotification('Failed to start workflow', { type: 'error' });
      }
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
        {(activeFormDef || CustomComponent) && (
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {selectedWorkflow.name} ({selectedWorkflow.nameSpace})
              </Typography>
              {formSource === 'custom_component' && (
                <Chip
                  size="small"
                  color="secondary"
                  icon={<WidgetsIcon fontSize="small" />}
                  label={`Component: ${targetWorkflowFormInputId}`}
                  sx={{ height: 20, fontSize: '0.68rem' }}
                />
              )}
              {formSource === 'custom_form' && (
                <Chip
                  size="small"
                  color="success"
                  icon={<DynamicFormIcon fontSize="small" />}
                  label={`Form: ${activeFormDef?.name}`}
                  sx={{ height: 20, fontSize: '0.68rem' }}
                />
              )}
              {formSource === 'inferred' && (
                <Chip
                  size="small"
                  color="info"
                  variant="outlined"
                  icon={<AutoAwesomeIcon fontSize="small" />}
                  label="Inferred Schema"
                  sx={{ height: 20, fontSize: '0.68rem' }}
                />
              )}
            </Box>
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

        {/* Inputs Form / Component */}
        {selectedWorkflow && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SchemaIcon fontSize="small" color="primary" />
              Execution Parameters
            </Typography>

            {loadingForm ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : CustomComponent && !useRawJson ? (
              <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <CustomComponent
                  reactory={reactory}
                  workflow={selectedWorkflow}
                  onSubmit={(submitted: any) => handleExecute(submitted)}
                />
              </Box>
            ) : activeFormDef && !useRawJson ? (
              <Box sx={{ '& .MuiPaper-root': { bgcolor: 'transparent' } }}>
                <ReactoryForm
                  key={`form_${activeFormDef.id}`}
                  formDef={activeFormDef}
                  data={formData}
                  onChange={(val: any) => {
                    const data = val?.formData || val || {};
                    setFormData(data);
                    setRawJson(JSON.stringify(data, null, 2));
                  }}
                  onSubmit={(val: any) => {
                    const data = val?.formData || val || {};
                    handleExecute(data);
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
          onClick={() => handleExecute()}
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
