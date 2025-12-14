import React, { useState, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Alert,
  Paper,
  FormControlLabel,
  Switch,
  Stack
} from '@mui/material';
import { ReactoryForm } from '../../reactory';
import JsonSchemaEditor from '../JsonSchemaEditor';
import { VisualSchemaEditor, VisualUISchemaEditor, VisualDataEditor } from './VisualEditor';
import { useFormEditorState, useSchemaValidation } from './hooks';

interface FormEditorProps {
  formData?: any;
  onChange?: (formData: any) => void;
}

// Helper components defined outside to prevent re-mounting
const TabPanel: React.FC<{
  children: React.ReactNode;
  value: number;
  index: number;
}> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`form-editor-tabpanel-${index}`}
    aria-labelledby={`form-editor-tab-${index}`}
    {...other}
  >
    {value === index && (
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    )}
  </div>
);

const ValidationStatus: React.FC<{
  isValid: boolean;
  errors: string[];
  label: string;
}> = ({ isValid, errors, label }) => (
  <Box sx={{ mb: 2 }}>
    <Alert
      severity={isValid ? 'success' : 'error'}
      variant="outlined"
      sx={{ fontSize: '0.875rem' }}
    >
      <strong>{label}:</strong> {isValid ? 'Valid' : `${errors.length} error(s)`}
      {!isValid && errors.length > 0 && (
        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
          {errors.slice(0, 3).map((error, index) => (
            <li key={index} style={{ fontSize: '0.8rem' }}>{error}</li>
          ))}
          {errors.length > 3 && <li style={{ fontSize: '0.8rem' }}>...and {errors.length - 3} more</li>}
        </ul>
      )}
    </Alert>
  </Box>
);

const  FormEditor: React.FC<FormEditorProps> = ({
  formData: initialFormData,
  onChange
}) => {
  // State management with custom hook
  const [state, actions] = useFormEditorState(initialFormData);
  const { validateSchemaChange, validateUISchemaChange } = useSchemaValidation();

  // Local UI state
  const [activeTab, setActiveTab] = useState(0);
  const [isVisualMode, setIsVisualMode] = useState(true);
  const [isUIVisualMode, setIsUIVisualMode] = useState(true);
  const [isDataVisualMode, setIsDataVisualMode] = useState(true);

  // Tab change handler
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Schema change handlers with manual validation
  const handleSchemaChange = useCallback((newSchemaString: string) => {
    // Validate the schema and update validation state
    const validation = validateSchemaChange(
      newSchemaString,
      actions.updateSchemaValidation,
      (schema) => {
        actions.updateSchema(schema);
        onChange?.(state.reactoryForm);
      }
    );

    // Update the form schema state regardless of validation result
    try {
      const parsed = JSON.parse(newSchemaString);
      // Only update schema if it's different from current
      // This prevents potential loops if stringify(parse(str)) !== str
      if (JSON.stringify(parsed) !== JSON.stringify(state.formSchemas.schema)) {
        actions.updateSchema(parsed);
        onChange?.(state.reactoryForm);
      }
    } catch (error) {
      // Keep the string value for editing even if invalid
      console.warn('Invalid JSON schema:', error);
    }
  }, [validateSchemaChange, actions, onChange, state.reactoryForm]);

  const handleVisualSchemaChange = useCallback((newSchema: any) => {
    // When visual editor updates schema, it is already a valid object
    // Update both schema state and validation state
    actions.updateSchema(newSchema);
    actions.updateSchemaValidation(true, []);
    onChange?.(state.reactoryForm);
  }, [actions, onChange, state.reactoryForm]);

  const handleVisualUISchemaChange = useCallback((newUISchema: any) => {
    // When visual UI editor updates, it provides the full UI schema object
    actions.updateUISchema(newUISchema);
    actions.updateUISchemaValidation(true, []);
    onChange?.(state.reactoryForm);
  }, [actions, onChange, state.reactoryForm]);

  const handleUISchemaChange = useCallback((newUISchemaString: string) => {
    // Validate the UI schema and update validation state
    const validation = validateUISchemaChange(
      newUISchemaString,
      actions.updateUISchemaValidation,
      (uiSchema) => {
        actions.updateUISchema(uiSchema);
        onChange?.(state.reactoryForm);
      }
    );

    // Update the form UI schema state regardless of validation result
    try {
      const parsed = JSON.parse(newUISchemaString);
      // Only update schema if it's different from current
      if (JSON.stringify(parsed) !== JSON.stringify(state.formSchemas.uiSchema)) {
        actions.updateUISchema(parsed);
        onChange?.(state.reactoryForm);
      }
    } catch (error) {
      // Keep the string value for editing even if invalid
      console.warn('Invalid UI schema:', error);
    }
  }, [validateUISchemaChange, actions, onChange, state.reactoryForm]);

  const handleVisualDataChange = useCallback((newData: { providers?: any, graphql?: any }) => {
    actions.setReactoryForm({
      ...state.reactoryForm,
      providers: newData.providers,
      graphql: newData.graphql
    });
    onChange?.({
      ...state.reactoryForm,
      providers: newData.providers,
      graphql: newData.graphql
    });
  }, [actions, onChange, state.reactoryForm]);

  const handleDataChange = useCallback((newDataString: string) => {
    try {
      const parsed = JSON.parse(newDataString);
      // Only update if different
      if (JSON.stringify(parsed) !== JSON.stringify(state.reactoryForm.graphql)) {
        actions.setReactoryForm({
          ...state.reactoryForm,
          graphql: parsed
        });
        onChange?.({
          ...state.reactoryForm,
          graphql: parsed
        });
      }
    } catch (error) {
      console.warn('Invalid Data/GraphQL configuration:', error);
    }
  }, [actions, onChange, state.reactoryForm]);

  const a11yProps = (index: number) => ({
    id: `form-editor-tab-${index}`,
    'aria-controls': `form-editor-tabpanel-${index}`,
  });

  // Schema definitions for base form editing
  const getSchema = useCallback((which: string): any => {
    switch(which) {
      case 'base': {
        return {
          type: 'object',
          title: 'Form Base Config',
          description: 'Use base configuration input to edit basics for your form',
          required: ['id'],
          properties: {
            id: { title: 'ID', type: 'string', description: 'Provide a unique id for your form' },
            title: { type: 'string', title: 'Form title' },
            description: { type: 'string', title: 'Form Description' },
            uiFramework: { type: 'string', title: 'UI Framework', description: 'Select the UI Framework for your form' },
            icon: { type: 'string', title: 'Icon'},
            avatar: { type: 'string', title: 'Avatar / Image' },
          }
        };
      }
      case 'preview': {
        return state.formSchemas.schema || { type: 'object', properties: {} };
      }
      default:
        return { type: 'object', properties: {} };
    }
  }, [state.formSchemas.schema]);

  const getUISchema = useCallback((which: string): any => {
    switch(which) {
      case 'base': {
        return {
          "ui:field": "GridLayout",
          "ui:grid-layout": [
            {
              id: { xs: 12, sm: 12, md: 6, lg: 6 },
              title: { xs: 12, sm: 12, md: 6, lg: 6 }
            },
            {
              description: { xs: 12, sm: 12, md: 12, lg: 12 }
            },
            {
              uiFramework: { xs: 12, sm: 12, md: 6, lg: 3 },
              icon: { xs: 12, sm: 12, md: 6, lg: 3 },
              avatar: { xs: 12, sm: 12, md: 6, lg: 6 }
            }
          ],
          uiFramework: {
            "ui:widget": "SelectWidget",
            "ui:options": {
              selectOptions: [
                { key: 'material', value: 'material', label: 'Material UI' },
                { key: 'bootstrap', value: 'bootstrap', label: 'Bootstrap' },
              ]
            }
          }
        };
      }
      case 'preview': {
        return state.formSchemas.uiSchema || {};
      }
      default:
        return {};
    }
  }, [state.formSchemas.uiSchema]);

  const getFormDefinition = useCallback((which: string): any => {
    const formDef = {
      id: `form-editor-${which}`,
      name: `FormEditor_${which}`,
      nameSpace: 'runtime',
      version: '1.0.0',
      schema: getSchema(which),
      uiSchema: getUISchema(which),
      helpTopics: [`form-editor-help-${which}`],
      uiFramework: 'material',
      __complete__: true,
      allowClone: false,
      allowEdit: false,
      argsComponentFqn: null,
      argsSchema: undefined,
      argsUiSchema: undefined,
      avatar: undefined,
      backButton: false,
      description: '',
    };

    return formDef;
  }, [getSchema, getUISchema]);

  const getDataMap = useCallback((which: string): any => {
    switch(which) {
      case 'base':
        return {
          id: state.reactoryForm.id,
          title: state.reactoryForm.title,
          description: state.reactoryForm.description,
          uiFramework: state.reactoryForm.uiFramework,
          icon: state.reactoryForm.icon,
          avatar: state.reactoryForm.avatar
        };
      default:
        return {};
    }
  }, [state.reactoryForm]);

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="form editor tabs">
          <Tab label="General" {...a11yProps(0)} />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Schema
                {!state.validationState.schema.isValid && (
                  <span style={{ color: 'error.main', fontSize: '0.75rem' }}>⚠️</span>
                )}
              </Box>
            }
            {...a11yProps(1)}
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                UI Schema
                {!state.validationState.uiSchema.isValid && (
                  <span style={{ color: 'error.main', fontSize: '0.75rem' }}>⚠️</span>
                )}
              </Box>
            }
            {...a11yProps(2)}
          />
          <Tab label="Data" {...a11yProps(3)} />
          <Tab label="Preview" {...a11yProps(4)} />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          Form Configuration
        </Typography>
        <ReactoryForm
          formDef={getFormDefinition('base')}
          formData={getDataMap('base')}
          onChange={(formData) => {
            actions.setReactoryForm({
              ...state.reactoryForm,
              ...(formData as object)
            });
            onChange?.(formData);
          }}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <ValidationStatus
            isValid={state.validationState.schema.isValid}
            errors={state.validationState.schema.errors}
            label="Data Schema Validation"
          />
          <FormControlLabel
            control={
              <Switch
                checked={isVisualMode}
                onChange={(e) => setIsVisualMode(e.target.checked)}
                color="primary"
              />
            }
            label="Visual Editor"
          />
        </Stack>

        <Paper elevation={1} sx={{ p: 2, height: '100%', minHeight: 400 }}>
          {isVisualMode ? (
            <VisualSchemaEditor
              schema={state.formSchemas.schema}
              onChange={handleVisualSchemaChange}
            />
          ) : (
            <JsonSchemaEditor
              value={JSON.stringify(state.formSchemas.schema, null, 2)}
              onChange={handleSchemaChange}
              label="Form Data Schema"
              placeholder="Enter JSON schema definition for form data validation..."
              height={400}
              showValidation={true}
              formatOnBlur={true}
            />
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <ValidationStatus
            isValid={state.validationState.uiSchema.isValid}
            errors={state.validationState.uiSchema.errors}
            label="UI Schema Validation"
          />
          <FormControlLabel
            control={
              <Switch
                checked={isUIVisualMode}
                onChange={(e) => setIsUIVisualMode(e.target.checked)}
                color="primary"
              />
            }
            label="Visual Editor"
          />
        </Stack>

        <Paper elevation={1} sx={{ p: 2, height: '100%', minHeight: 400 }}>
          {isUIVisualMode ? (
            <VisualUISchemaEditor
              schema={state.formSchemas.schema}
              uiSchema={state.formSchemas.uiSchema}
              onChange={handleVisualUISchemaChange}
            />
          ) : (
            <JsonSchemaEditor
              value={JSON.stringify(state.formSchemas.uiSchema, null, 2)}
              onChange={handleUISchemaChange}
              label="Form UI Schema"
              placeholder="Enter UI schema definition for form presentation..."
              height={400}
              showValidation={true}
              formatOnBlur={true}
            />
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">
            Data Configuration (GraphQL)
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isDataVisualMode}
                onChange={(e) => setIsDataVisualMode(e.target.checked)}
                color="primary"
              />
            }
            label="Visual Editor"
          />
        </Stack>

        <Paper elevation={1} sx={{ p: 2, height: '100%', minHeight: 400 }}>
          {isDataVisualMode ? (
            <VisualDataEditor
              providers={state.reactoryForm.providers}
              graphql={state.reactoryForm.graphql}
              onChange={handleVisualDataChange}
            />
          ) : (
            <JsonSchemaEditor
              value={JSON.stringify(state.reactoryForm.graphql || {}, null, 2)}
              onChange={handleDataChange}
              label="GraphQL Data Provider Config"
              placeholder="Enter GraphQL queries and mutations..."
              height={400}
              showValidation={true}
              formatOnBlur={true}
            />
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <Typography variant="h6" gutterBottom>
          Form Preview
        </Typography>

        <ValidationStatus
          isValid={state.validationState.schema.isValid && state.validationState.uiSchema.isValid}
          errors={[
            ...(!state.validationState.schema.isValid ? ['Schema errors present'] : []),
            ...(!state.validationState.uiSchema.isValid ? ['UI Schema errors present'] : [])
          ]}
          label="Form Preview Status"
        />

        {state.validationState.schema.isValid && state.validationState.uiSchema.isValid ? (
          <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Live Form Preview:
            </Typography>
            <ReactoryForm
              formDef={getFormDefinition('preview')}
              formData={{}}
            />
          </Paper>
        ) : (
          <Paper elevation={1} sx={{ p: 3, mt: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Fix schema validation errors to see form preview
            </Typography>
          </Paper>
        )}
      </TabPanel>
    </>
  );
};

export default FormEditor;