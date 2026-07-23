import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Alert,
  Paper,
  FormControlLabel,
  Switch,
  Stack,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Toolbar
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ReactoryForm } from '../../reactory';
import { useReactory } from '../../../api/ApiProvider';
import JsonSchemaEditor from '../JsonSchemaEditor';
import { VisualSchemaEditor, VisualUISchemaEditor, VisualDataEditor } from './VisualEditor';
import { useFormEditorState, useSchemaValidation } from './hooks';

/**
 * Recursively strip Apollo `__typename` keys from a value, returning a clean
 * copy. Form definitions are hydrated via a GraphQL query, so nested objects
 * (notably `graphql`, `schema` and `uiSchema`) carry `__typename` fields that
 * the *Input types are not defined for — sending them back on save fails
 * validation ("Field \"__typename\" is not defined by type ...Input").
 */
const stripTypename = (value: any): any => {
  if (Array.isArray(value)) return value.map(stripTypename);
  if (value && typeof value === 'object') {
    const out: any = {};
    Object.keys(value).forEach((key) => {
      if (key === '__typename') return;
      out[key] = stripTypename(value[key]);
    });
    return out;
  }
  return value;
};

interface FormEditorProps {
  /** The id of an existing form to load and edit. Use "new" (or omit) for a blank form. */
  formId?: string;
  /** The editing mode the editor was mounted in (e.g. "develop" | "edit"). */
  mode?: string;
  /** Seed data for a new form when no formId is supplied. */
  formData?: any;
  /** Fired whenever the in-memory form definition changes. */
  onChange?: (formData: any) => void;
  /** Fired after the form has been persisted successfully. */
  onSave?: (formDefinition: any) => void;
}

// GraphQL used to hydrate the editor with an existing form definition.
const FORM_EDITOR_GET_QUERY = `
  query FormEditorGetForm($id: String!) {
    ReactoryFormGetById(id: $id) {
      id
      name
      nameSpace
      version
      title
      description
      icon
      avatar
      uiFramework
      registerAsComponent
      roles
      components
      helpTopics
      tags
      schema
      uiSchema
      sanitizeSchema
      graphql {
        query
        mutation
        queries
        clientResolvers
      }
      backButton
    }
  }
`;

// GraphQL used to persist the edited form as a YAML overlay on the server.
const FORM_EDITOR_SAVE_MUTATION = `
  mutation FormEditorSave($form: ReactoryFormInput!, $publish: Boolean) {
    ReactoryFormSave(form: $form, publish: $publish) {
      id
      name
      nameSpace
      version
      title
    }
  }
`;

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
  formId,
  mode = 'develop',
  formData: initialFormData,
  onChange,
  onSave
}) => {
  const reactory = useReactory();

  // State management with custom hook
  const [state, actions] = useFormEditorState(initialFormData);
  const { validateSchemaChange, validateUISchemaChange } = useSchemaValidation();

  // Local UI state
  const [activeTab, setActiveTab] = useState(0);
  const [isVisualMode, setIsVisualMode] = useState(true);
  const [isUIVisualMode, setIsUIVisualMode] = useState(true);
  const [isDataVisualMode, setIsDataVisualMode] = useState(true);

  // Load / save lifecycle state
  const isNewForm = !formId || formId === 'new';
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [loadedFormId, setLoadedFormId] = useState<string | null>(null);

  // Holds live edits from the General tab's ReactoryForm. We accumulate these
  // in a ref (rather than component state) so that typing in the General form
  // does not trigger a parent re-render, which would otherwise reset the child
  // form's internal state on every keystroke.
  const generalDataRef = useRef<any>({});

  // Marks the editor dirty exactly once. setIsDirty(true) is a no-op when the
  // value is already true, so React bails out of re-rendering after the first
  // change – keeping the General form stable while still tracking dirtiness.
  const markDirty = useCallback(() => setIsDirty(true), []);

  // Hydrates the editor state from a loaded form definition.
  const applyLoadedForm = useCallback((form: any) => {
    if (!form) return;
    generalDataRef.current = {};
    actions.setReactoryForm(form);
    actions.setFormSchemas({
      schema: form.schema || { type: 'object', properties: {} },
      uiSchema: form.uiSchema || {},
      uiSchemas: form.uiSchemas || [],
      sanitizeSchema: form.sanitizeSchema,
      defaultUiSchemaKey: form.defaultUiSchemaKey
    });
    actions.updateSchemaValidation(true, []);
    actions.updateUISchemaValidation(true, []);
    setIsDirty(false);
  }, [actions]);

  // Loads an existing form by id via GraphQL.
  const loadForm = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, errors } = await reactory.graphqlQuery<any, any>(
        FORM_EDITOR_GET_QUERY,
        { id },
        { fetchPolicy: 'network-only' }
      );

      if (errors && errors.length > 0) {
        throw new Error(errors.map((e: any) => e.message).join('; '));
      }

      const form = data?.ReactoryFormGetById;
      if (!form) {
        setLoadError(`Form "${id}" could not be found.`);
      } else {
        applyLoadedForm(form);
        setLoadedFormId(id);
      }
    } catch (err: any) {
      reactory.log('FormEditor:loadForm:error', { id, err }, 'error');
      setLoadError(err?.message || 'Failed to load the form definition.');
    } finally {
      setLoading(false);
    }
  }, [reactory, applyLoadedForm]);

  // Load the form whenever an existing formId is supplied / changes.
  useEffect(() => {
    if (!isNewForm && formId && formId !== loadedFormId) {
      loadForm(formId);
    }
  }, [isNewForm, formId, loadedFormId, loadForm]);

  // Builds a ReactoryFormInput payload from the current editor state. Live
  // edits from the General tab are held in generalDataRef and merged over the
  // reducer state so that base config changes are always persisted.
  const buildSaveInput = useCallback(() => {
    const f = { ...(state.reactoryForm || {}), ...(generalDataRef.current || {}) };
    // Strip Apollo __typename fields the load query injected; the *Input types
    // reject them on save.
    return stripTypename({
      id: f.id,
      name: f.name,
      nameSpace: f.nameSpace,
      version: f.version || '1.0.0',
      title: f.title,
      description: f.description,
      icon: f.icon,
      avatar: f.avatar,
      uiFramework: f.uiFramework || 'material',
      registerAsComponent: f.registerAsComponent === true,
      roles: f.roles || [],
      components: f.components || [],
      helpTopics: f.helpTopics || [],
      tags: f.tags || [],
      schema: state.formSchemas.schema,
      uiSchema: state.formSchemas.uiSchema,
      sanitizeSchema: state.formSchemas.sanitizeSchema,
      graphql: f.graphql || null,
      backButton: f.backButton === true
    });
  }, [state.reactoryForm, state.formSchemas]);

  // Persists the current form definition to the server (YAML overlay).
  const handleSave = useCallback(async () => {
    const input = buildSaveInput();

    // Guard against saving a form without the identity fields required to
    // build a stable storage key.
    if (!input.id || !input.name || !input.nameSpace) {
      setSaveError('id, name and nameSpace are required before saving. Complete the General tab first.');
      setActiveTab(0);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const result = await reactory.graphqlMutation<any, any>(
        FORM_EDITOR_SAVE_MUTATION,
        { form: input, publish: false }
      );

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map((e: any) => e.message).join('; '));
      }

      const saved = result.data?.ReactoryFormSave;

      // Refresh the client's form cache (bypassing the 5 minute TTL) so the
      // newly saved / authored form shows up in the form list immediately.
      try {
        await reactory.forms(true);
      } catch (refreshErr) {
        reactory.log('FormEditor:handleSave:refresh:error', { refreshErr }, 'warning');
      }

      setIsDirty(false);
      setLoadedFormId(saved?.id || input.id);
      reactory.createNotification('Form saved', { type: 'success', showInAppNotification: true });
      onSave?.(saved || input);
    } catch (err: any) {
      reactory.log('FormEditor:handleSave:error', { err }, 'error');
      const message = err?.message || 'Failed to save the form.';
      setSaveError(message);
      reactory.createNotification(`Could not save form: ${message}`, { type: 'error', showInAppNotification: true });
    } finally {
      setSaving(false);
    }
  }, [buildSaveInput, reactory, onSave]);

  // Tab change handler
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Wraps the parent onChange handler so we can also flag the editor dirty.
  const notifyChange = useCallback((payload: any) => {
    setIsDirty(true);
    onChange?.(payload);
  }, [onChange]);

  // Schema change handlers with manual validation
  const handleSchemaChange = useCallback((newSchemaString: string) => {
    // Validate the schema and update validation state
    const validation = validateSchemaChange(
      newSchemaString,
      actions.updateSchemaValidation,
      (schema) => {
        actions.updateSchema(schema);
        notifyChange(state.reactoryForm);
      }
    );

    // Update the form schema state regardless of validation result
    try {
      const parsed = JSON.parse(newSchemaString);
      // Only update schema if it's different from current
      // This prevents potential loops if stringify(parse(str)) !== str
      if (JSON.stringify(parsed) !== JSON.stringify(state.formSchemas.schema)) {
        actions.updateSchema(parsed);
        notifyChange(state.reactoryForm);
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
    notifyChange(state.reactoryForm);
  }, [actions, onChange, state.reactoryForm]);

  const handleVisualUISchemaChange = useCallback((newUISchema: any) => {
    // When visual UI editor updates, it provides the full UI schema object
    actions.updateUISchema(newUISchema);
    actions.updateUISchemaValidation(true, []);
    notifyChange(state.reactoryForm);
  }, [actions, onChange, state.reactoryForm]);

  const handleUISchemaChange = useCallback((newUISchemaString: string) => {
    // Validate the UI schema and update validation state
    const validation = validateUISchemaChange(
      newUISchemaString,
      actions.updateUISchemaValidation,
      (uiSchema) => {
        actions.updateUISchema(uiSchema);
        notifyChange(state.reactoryForm);
      }
    );

    // Update the form UI schema state regardless of validation result
    try {
      const parsed = JSON.parse(newUISchemaString);
      // Only update schema if it's different from current
      if (JSON.stringify(parsed) !== JSON.stringify(state.formSchemas.uiSchema)) {
        actions.updateUISchema(parsed);
        notifyChange(state.reactoryForm);
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
    notifyChange({
      ...state.reactoryForm,
      providers: newData.providers,
      graphql: newData.graphql
    });
  }, [actions, notifyChange, state.reactoryForm]);

  const handleDataChange = useCallback((newDataString: string) => {
    try {
      const parsed = JSON.parse(newDataString);
      // Only update if different
      if (JSON.stringify(parsed) !== JSON.stringify(state.reactoryForm.graphql)) {
        actions.setReactoryForm({
          ...state.reactoryForm,
          graphql: parsed
        });
        notifyChange({
          ...state.reactoryForm,
          graphql: parsed
        });
      }
    } catch (error) {
      console.warn('Invalid Data/GraphQL configuration:', error);
    }
  }, [actions, notifyChange, state.reactoryForm]);

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
          required: ['id', 'name', 'nameSpace', 'version'],
          properties: {
            id: { title: 'ID', type: 'string', description: 'Provide a unique id for your form' },
            nameSpace: { type: 'string', title: 'Namespace', description: 'Form namespace (e.g. "core", "my-app")' },
            name: { type: 'string', title: 'Name', description: 'Form name' },
            version: { type: 'string', title: 'Version', description: 'Semantic version (e.g. 1.0.0)' },
            title: { type: 'string', title: 'Form title' },
            description: { type: 'string', title: 'Form Description' },
            uiFramework: { type: 'string', title: 'UI Framework', description: 'Select the UI Framework for your form' },
            icon: { type: 'string', title: 'Icon'},
            avatar: { type: 'string', title: 'Avatar / Image' },
            registerAsComponent: { type: 'boolean', title: 'Register as Component', description: 'Should this form be registered as a component?' },
            roles: { type: 'array', title: 'Allowed Roles', items: { type: 'string' } },
            components: { type: 'array', title: 'Required Components', items: { type: 'string' } }
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
          "ui:options": {
            // The editor owns persistence via its own Save button, so the base
            // config form should not render a submit or refresh button. The
            // help button remains available for field guidance.
            showSubmit: false,
            showRefresh: false,
            showHelp: true
          },
          "ui:field": "GridLayout",
          "ui:grid-layout": [
            {
              nameSpace: { xs: 12, sm: 4 },
              name: { xs: 12, sm: 4 },
              version: { xs: 12, sm: 4 }
            },
            {
              id: { xs: 12, sm: 12, md: 6 },
              title: { xs: 12, sm: 12, md: 6 }
            },
            {
              description: { xs: 12, sm: 12, md: 12, lg: 12 }
            },
            {
              uiFramework: { xs: 12, sm: 12, md: 6, lg: 3 },
              icon: { xs: 12, sm: 12, md: 6, lg: 3 },
              avatar: { 
                xs: 12, sm: 12, md: 12, lg: 12, sx: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  outline: '1px solid #ddd'
                } 
              }
            },
            {
              registerAsComponent: { xs: 12 }
            },
            {
              roles: { xs: 12, sm: 6 },
              components: { xs: 12, sm: 6 }
            }
          ],
          avatar: {
            "ui:title": "",
            "ui:widget": "ImageWidget",
            "ui:options": {
              variant: "image",
              size: "medium"
            }
          },
          icon: {            
            "ui:widget": "IconPickerWidget",
            "ui:options": {
              label: "Select Icon",
              variant: "popover"
            }
          },
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
          nameSpace: state.reactoryForm.nameSpace,
          name: state.reactoryForm.name,
          version: state.reactoryForm.version,
          title: state.reactoryForm.title,
          description: state.reactoryForm.description,
          uiFramework: state.reactoryForm.uiFramework,
          icon: state.reactoryForm.icon,
          avatar: state.reactoryForm.avatar,
          registerAsComponent: state.reactoryForm.registerAsComponent,
          roles: state.reactoryForm.roles || [],
          components: state.reactoryForm.components || []
        };
      default:
        return {};
    }
  }, [state.reactoryForm]);

  const formTitle = state.reactoryForm?.title
    || (state.reactoryForm?.name
      ? `${state.reactoryForm.nameSpace || ''}.${state.reactoryForm.name}@${state.reactoryForm.version || '1.0.0'}`
      : 'Untitled Form');

  // A stable identity for the currently loaded form. It only changes when a
  // different form is loaded (or a new form is started), NOT while editing.
  const generalInstanceKey = isNewForm
    ? 'new'
    : (loadedFormId ? `loaded-${loadedFormId}` : 'loading');

  // The base config form definition is static content – memoize it once so the
  // General ReactoryForm receives a stable formDef reference and does not
  // re-initialise when other tabs mutate the schema state.
  const generalFormDef = useMemo(
    () => getFormDefinition('base'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Snapshot the base form data once per loaded form. Keeping this reference
  // stable across re-renders prevents the child form from resetting its own
  // internal state while the user is editing other tabs.
  const generalFormData = useMemo(
    () => getDataMap('base'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [generalInstanceKey]
  );

  return (
    <>
      <Toolbar
        disableGutters
        sx={{
          px: 2,
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
          flexWrap: 'wrap'
        }}
      >
        <Typography variant="h6" sx={{ flexShrink: 1, mr: 1 }} noWrap>
          {isNewForm ? 'New Form' : formTitle}
        </Typography>
        <Chip size="small" label={mode} color="default" variant="outlined" />
        {isDirty && (
          <Chip size="small" label="Unsaved changes" color="warning" variant="outlined" />
        )}
        <Box sx={{ flexGrow: 1 }} />
        {!isNewForm && (
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => formId && loadForm(formId)}
            disabled={loading || saving}
          >
            Reload
          </Button>
        )}
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Toolbar>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Loading form definition…</Typography>
        </Box>
      )}

      {loadError && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setLoadError(null)}>
          {loadError}
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      <Divider />

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
          key={`form-editor-general-${generalInstanceKey}`}
          formDef={generalFormDef}
          formData={generalFormData}
          onChange={(formData) => {
            // Accumulate edits in a ref only – no setState here – so the child
            // form is not re-rendered / reset while the user is typing.
            generalDataRef.current = {
              ...(generalDataRef.current || {}),
              ...(formData as object)
            };
            markDirty();
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