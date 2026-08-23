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

/**
 * The General tab renders the form's base configuration through a ReactoryForm.
 * A flat wall of 13 inputs reads poorly, so the schema groups the fields into
 * four sections and the layout engine renders each group as its own titled
 * panel (a nested `GridLayout` field per group, see `getUISchema('base')`).
 *
 * The editor state and the `ReactoryFormInput` save payload are both flat, so
 * the base config is projected into these groups on the way into the form and
 * flattened again on the way out.
 */
const GENERAL_SECTIONS: Record<string, string[]> = {
  identity: ['nameSpace', 'name', 'version', 'id'],
  presentation: ['title', 'description', 'icon', 'avatar'],
  behaviour: ['uiFramework', 'registerAsComponent', 'backButton'],
  metadata: ['roles', 'components', 'tags', 'helpTopics'],
};

/** Base config fields that must always reach the form as an array. */
const GENERAL_ARRAY_FIELDS = ['roles', 'components', 'tags', 'helpTopics'];
/** Base config fields that must always reach the form as a boolean. */
const GENERAL_BOOLEAN_FIELDS = ['registerAsComponent', 'backButton'];

/** Projects the flat base config onto the grouped shape the General form uses. */
const toGeneralFormData = (flat: any = {}): Record<string, any> => {
  const grouped: Record<string, any> = {};
  Object.keys(GENERAL_SECTIONS).forEach((section) => {
    const values: Record<string, any> = {};
    GENERAL_SECTIONS[section].forEach((key) => {
      const value = flat?.[key];
      if (GENERAL_ARRAY_FIELDS.includes(key)) values[key] = Array.isArray(value) ? value : [];
      else if (GENERAL_BOOLEAN_FIELDS.includes(key)) values[key] = value === true;
      else values[key] = value;
    });
    grouped[section] = values;
  });
  return grouped;
};

/** Flattens the grouped General form data back to the flat base config shape. */
const fromGeneralFormData = (grouped: any = {}): Record<string, any> => {
  const flat: Record<string, any> = {};
  Object.keys(GENERAL_SECTIONS).forEach((section) => {
    const values = grouped?.[section];
    if (!values || typeof values !== 'object') return;
    GENERAL_SECTIONS[section].forEach((key) => {
      if (values[key] !== undefined) flat[key] = values[key];
    });
  });
  return flat;
};

/**
 * Grid sizes. MaterialGridField defaults every breakpoint it is not given to
 * 12, so a partial set (e.g. `{ sm: 6 }`) silently widens back to full width at
 * the next breakpoint up - each size therefore spells out every breakpoint.
 */
const SIZE_FULL = { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 };
const SIZE_HALF = { xs: 12, sm: 6, md: 6, lg: 6, xl: 6 };
const SIZE_THIRD = { xs: 12, sm: 4, md: 4, lg: 4, xl: 4 };
const SIZE_TWO_THIRDS = { xs: 12, sm: 8, md: 8, lg: 8, xl: 8 };

/** Renders a section group as an outlined card rather than the default Paper. */
const SECTION_GRID_OPTIONS = {
  container: 'Paper',
  spacing: 2,
  containerStyles: {},
  containerProps: {
    elevation: 0,
    variant: 'outlined',
    sx: {
      p: 2.5,
      borderRadius: 2,
      width: '100%',
    },
  },
};

/** Tones the section heading down from the TitleField default of h5. */
const SECTION_TITLE_STYLE = {
  fontSize: '0.9375rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  textTransform: 'uppercase' as const,
  marginBottom: '2px',
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
        // Grouped into the four sections the layout engine renders as panels.
        // Section titles / descriptions are rendered by the nested GridLayout
        // field (TitleField + DescriptionField); field descriptions become the
        // helper text under each input.
        return {
          type: 'object',
          properties: {
            identity: {
              type: 'object',
              title: 'Identity',
              description: 'Namespace, name and version address the form in the registry. The id is the key used for routes and for the YAML overlay this editor writes.',
              required: ['nameSpace', 'name', 'version', 'id'],
              properties: {
                nameSpace: { type: 'string', title: 'Namespace', description: 'Groups related forms, e.g. core or my-app' },
                name: { type: 'string', title: 'Name', description: 'Form name in PascalCase, e.g. UserProfile' },
                version: { type: 'string', title: 'Version', description: 'Semantic version, e.g. 1.0.0' },
                id: { type: 'string', title: 'Form ID', description: 'Unique id for the form. Convention: namespace.Name@version' },
              },
            },
            presentation: {
              type: 'object',
              title: 'Presentation',
              description: 'How the form introduces itself in lists, headers and navigation.',
              properties: {
                title: { type: 'string', title: 'Display title', description: 'Shown in headers and in the form list. Falls back to the form name.' },
                icon: { type: 'string', title: 'Icon' },
                description: { type: 'string', title: 'Description', description: 'A sentence or two describing what the form is for.' },
                avatar: { type: 'string', title: 'Avatar / image' },
              },
            },
            behaviour: {
              type: 'object',
              title: 'Behaviour',
              description: 'Runtime rendering and navigation options.',
              properties: {
                uiFramework: { type: 'string', title: 'UI Framework', description: 'The widget package used to render the form' },
                registerAsComponent: { type: 'boolean', title: 'Register as component', description: 'Expose the form in the component registry so other forms can embed it' },
                backButton: { type: 'boolean', title: 'Show back button', description: 'Render a back button in the form toolbar' },
              },
            },
            metadata: {
              type: 'object',
              title: 'Access & metadata',
              description: 'Who may load the form, what it depends on, and how it is catalogued.',
              properties: {
                roles: { type: 'array', title: 'Allowed roles', items: { type: 'string' } },
                components: { type: 'array', title: 'Required components', items: { type: 'string' } },
                tags: { type: 'array', title: 'Tags', items: { type: 'string' } },
                helpTopics: { type: 'array', title: 'Help topics', items: { type: 'string' } },
              },
            },
          },
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
          // The editor owns persistence via its own Save / Reload toolbar, so
          // the base config form renders no toolbar of its own - every button
          // is off and the bar is collapsed rather than left empty. Field
          // guidance now comes from the schema descriptions (rendered as helper
          // text) instead of the help button, which had no content behind the
          // `form-editor-help-base` topic. `componentType: div` keeps this out
          // of a nested <form> element - the editor is already rendered inside
          // the tab panel of a larger surface.
          "ui:form": {
            componentType: 'div',
            showSubmit: false,
            showRefresh: false,
            showHelp: false,
            toolbarPosition: 'bottom',
            toolbarStyle: { display: 'none', height: 0 },
            style: { width: '100%' },
          },
          // Root layout: one grid row holding the four section groups so a
          // single container owns the vertical rhythm between the panels.
          "ui:field": "GridLayout",
          "ui:grid-options": {
            container: 'div',
            spacing: 3,
            containerStyles: {},
          },
          "ui:grid-layout": [
            {
              identity: { size: SIZE_FULL },
              presentation: { size: SIZE_FULL },
              behaviour: { size: SIZE_FULL },
              metadata: { size: SIZE_FULL },
            },
          ],

          identity: {
            "ui:field": "GridLayout",
            "ui:title": { title: 'Identity', jss: SECTION_TITLE_STYLE },
            "ui:grid-options": SECTION_GRID_OPTIONS,
            "ui:grid-layout": [
              {
                nameSpace: { size: SIZE_THIRD },
                name: { size: SIZE_THIRD },
                version: { size: SIZE_THIRD },
              },
              {
                id: { size: SIZE_FULL },
              },
            ],
          },

          presentation: {
            "ui:field": "GridLayout",
            "ui:title": { title: 'Presentation', jss: SECTION_TITLE_STYLE },
            "ui:grid-options": SECTION_GRID_OPTIONS,
            "ui:grid-layout": [
              {
                title: { size: SIZE_TWO_THIRDS },
                icon: { size: SIZE_THIRD },
              },
              {
                description: { size: SIZE_FULL },
              },
              {
                avatar: { size: SIZE_HALF },
              },
            ],
            // Multiline needs the TextField renderer; the field template skips
            // its own helper text for that renderer, so it is passed through.
            description: {
              "ui:options": {
                component: 'TextField',
                componentProps: {
                  multiline: true,
                  minRows: 3,
                  helperText: 'A sentence or two describing what the form is for.',
                },
              },
            },
            // IconPicker renders its own labelled input - suppress the field
            // template label so it is not shown twice.
            icon: {
              "ui:widget": "IconPickerWidget",
              "ui:options": {
                showLabel: false,
                variant: "popover",
              },
            },
            // The field template's un-shrunk label would sit over the image
            // box, so the widget names itself through its placeholder instead.
            avatar: {
              "ui:widget": "ImageWidget",
              "ui:options": {
                showLabel: false,
                variant: "avatar",
                avatarVariant: "rounded",
                size: "large",
                rootPath: "/images",
                placeholder: "Avatar / image",
              },
            },
          },

          behaviour: {
            "ui:field": "GridLayout",
            "ui:title": { title: 'Behaviour', jss: SECTION_TITLE_STYLE },
            "ui:grid-options": SECTION_GRID_OPTIONS,
            "ui:grid-layout": [
              {
                uiFramework: { size: SIZE_THIRD },
                registerAsComponent: { size: SIZE_THIRD },
                backButton: { size: SIZE_THIRD },
              },
            ],
            uiFramework: {
              "ui:widget": "SelectWidget",
              "ui:options": {
                selectOptions: [
                  { key: 'material', value: 'material', label: 'Material UI' },
                  { key: 'bootstrap', value: 'bootstrap', label: 'Bootstrap' },
                ],
              },
            },
            registerAsComponent: {
              "ui:options": { yesLabel: 'Registered', noLabel: 'Not registered' },
            },
            backButton: {
              "ui:options": { yesLabel: 'Shown', noLabel: 'Hidden' },
            },
          },

          metadata: {
            "ui:field": "GridLayout",
            "ui:title": { title: 'Access & metadata', jss: SECTION_TITLE_STYLE },
            "ui:grid-options": SECTION_GRID_OPTIONS,
            "ui:grid-layout": [
              {
                roles: { size: SIZE_HALF },
                components: { size: SIZE_HALF },
              },
              {
                tags: { size: SIZE_HALF },
                helpTopics: { size: SIZE_HALF },
              },
            ],
            // Arrays get no label from the field template, so the chip arrays
            // opt in to rendering the schema title themselves.
            roles: {
              "ui:widget": "ChipArrayWidget",
              "ui:options": { showLabel: true, placeholder: 'Add a role and press Enter...' },
            },
            components: {
              "ui:widget": "ChipArrayWidget",
              "ui:options": { showLabel: true, placeholder: 'Add a component FQN and press Enter...' },
            },
            tags: {
              "ui:widget": "ChipArrayWidget",
              "ui:options": { showLabel: true, placeholder: 'Add a tag and press Enter...' },
            },
            helpTopics: {
              "ui:widget": "ChipArrayWidget",
              "ui:options": { showLabel: true, placeholder: 'Add a help topic and press Enter...' },
            },
          },
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
        // Flat base config, grouped for the form by toGeneralFormData.
        return {
          id: state.reactoryForm.id,
          nameSpace: state.reactoryForm.nameSpace,
          name: state.reactoryForm.name,
          version: state.reactoryForm.version,
          title: state.reactoryForm.title,
          description: state.reactoryForm.description,
          uiFramework: state.reactoryForm.uiFramework || 'material',
          icon: state.reactoryForm.icon,
          avatar: state.reactoryForm.avatar,
          registerAsComponent: state.reactoryForm.registerAsComponent,
          backButton: state.reactoryForm.backButton,
          roles: state.reactoryForm.roles || [],
          components: state.reactoryForm.components || [],
          tags: state.reactoryForm.tags || [],
          helpTopics: state.reactoryForm.helpTopics || []
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

  // Snapshot the base form data, projected onto the grouped shape the General
  // layout expects. The reference stays stable while the user types, which is
  // what stops the child form resetting its own internal state mid-edit.
  //
  // TabPanel unmounts the General form when another tab is selected, so the
  // snapshot is also rebuilt on tab change and layers the pending edits held in
  // generalDataRef over the loaded definition. Without that, returning to the
  // tab redisplayed the originally loaded values while the ref (and therefore
  // the save payload) still held the edits.
  const generalFormData = useMemo(
    () => toGeneralFormData({ ...getDataMap('base'), ...(generalDataRef.current || {}) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [generalInstanceKey, activeTab]
  );

  // Stable handler for the General form. Recreating this on every render would
  // change the child's props identity - see the generalForm memo below for why
  // that matters.
  const handleGeneralChange = useCallback((formData: any) => {
    // The layout groups the base config into sections, so flatten it back
    // before merging. Edits accumulate in a ref only – no setState here – so
    // the child form is not re-rendered / reset while the user is typing.
    const flattened = fromGeneralFormData(formData);
    generalDataRef.current = {
      ...(generalDataRef.current || {}),
      ...flattened
    };
    markDirty();
    onChange?.(flattened);
  }, [markDirty, onChange]);

  // The rendered element is memoized, not just its props.
  //
  // ReactoryForm's data manager re-runs its initial fetch whenever the props
  // *object identity* it was given changes (useDataManager's getData effect
  // depends on `props.props`). JSX allocates a fresh props object on every
  // render of this component, so any re-render here re-initialised the General
  // form - visible as the whole tab reloading. It happened on the first edit
  // only because that is the one edit that flips isDirty (and so re-renders
  // this component); markDirty is a no-op from then on.
  //
  // Holding the element itself lets React skip the subtree entirely when
  // nothing it depends on has changed, which keeps the props object identical.
  const generalForm = useMemo(() => (
    <ReactoryForm
      key={`form-editor-general-${generalInstanceKey}`}
      formDef={generalFormDef}
      formData={generalFormData}
      onChange={handleGeneralChange}
    />
  ), [generalInstanceKey, generalFormDef, generalFormData, handleGeneralChange]);

  // Same reasoning for the preview: `getFormDefinition('preview')` and an
  // inline `formData={{}}` allocated new objects on every render, so the
  // preview re-fetched and remounted continuously.
  const previewFormDef = useMemo(
    () => getFormDefinition('preview'),
    [getFormDefinition]
  );
  const previewFormData = useMemo(() => ({}), []);
  const previewForm = useMemo(() => (
    <ReactoryForm formDef={previewFormDef} formData={previewFormData} />
  ), [previewFormDef, previewFormData]);

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
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h6">
            Form configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The base definition of the form. Identity fields are required before the form can be saved.
          </Typography>
        </Box>
        {generalForm}
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
            {previewForm}
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