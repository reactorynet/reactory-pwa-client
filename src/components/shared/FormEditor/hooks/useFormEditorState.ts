import { useState, useCallback } from 'react';

export interface ValidationState {
  isValid: boolean;
  errors: string[];
}

export interface FormEditorState {
  reactoryForm: any;
  formSchemas: any;
  validationState: {
    schema: ValidationState;
    uiSchema: ValidationState;
  };
}

export interface FormEditorActions {
  setReactoryForm: (form: any) => void;
  setFormSchemas: (schemas: any) => void;
  updateSchemaValidation: (isValid: boolean, errors?: string[]) => void;
  updateUISchemaValidation: (isValid: boolean, errors?: string[]) => void;
  updateSchema: (schema: any) => void;
  updateUISchema: (uiSchema: any) => void;
}

const DEFAULT_FORM_DATA = {
  id: 'NewFormId',
  name: 'NewFormName',
  nameSpace: 'nameSpace',
  schema: {
    type: 'string',
    title: 'String Form'
  },
  uiSchema: {},
  avatar: '',
  argsComponentFqn: '',
  argsSchema: {
    type: 'string',
    title: 'arg1',
    description: 'Default argument'
  },
  argsUiSchema: {},
  backButton: true,
  cloneRoles: ['DEVELOPER'],
  components: [],
  componentDefs: [],
  defaultExport: null,
  defaultFormValue: 'Hallo Reactory.',
  defaultPdfReport: null,
  defaultUiSchemaKey: null,
  dependencies: [],
  description: 'New Form Description',
  editRoles: ['DEVELOPER'],
  eventBubbles: [],
  exports: [],
  fieldMap: undefined,
  graphql: null,
  icon: 'form',
  title: 'New Form',
  modules: [],
  version: '1.0.0',
  __complete__: true,
  allowClone: true,
  allowEdit: true,
};

const DEFAULT_FORM_SCHEMAS = {
  schema: {
    type: 'object',
    properties: {
      property1: {
        type: 'string',
        title: 'Property 1',
        description: 'Click edit to change this property'
      }
    }
  },
  uiSchema: {},
  uiSchemas: [],
  defaultUiSchemaKey: undefined,
  sanitizeSchema: undefined
};

export const useFormEditorState = (initialFormData?: any): [FormEditorState, FormEditorActions] => {
  const [reactoryForm, setReactoryForm] = useState(initialFormData || DEFAULT_FORM_DATA);
  const [formSchemas, setFormSchemas] = useState(DEFAULT_FORM_SCHEMAS);
  const [validationState, setValidationState] = useState({
    schema: { isValid: true, errors: [] },
    uiSchema: { isValid: true, errors: [] }
  });

  const updateSchemaValidation = useCallback((isValid: boolean, errors: string[] = []) => {
    setValidationState(prev => ({
      ...prev,
      schema: { isValid, errors }
    }));
  }, []);

  const updateUISchemaValidation = useCallback((isValid: boolean, errors: string[] = []) => {
    setValidationState(prev => ({
      ...prev,
      uiSchema: { isValid, errors }
    }));
  }, []);

  const updateSchema = useCallback((schema: any) => {
    setFormSchemas(prev => ({
      ...prev,
      schema
    }));
    setReactoryForm(prev => ({
      ...prev,
      schema
    }));
  }, []);

  const updateUISchema = useCallback((uiSchema: any) => {
    setFormSchemas(prev => ({
      ...prev,
      uiSchema
    }));
    setReactoryForm(prev => ({
      ...prev,
      uiSchema
    }));
  }, []);

  const state: FormEditorState = {
    reactoryForm,
    formSchemas,
    validationState
  };

  const actions: FormEditorActions = {
    setReactoryForm,
    setFormSchemas,
    updateSchemaValidation,
    updateUISchemaValidation,
    updateSchema,
    updateUISchema
  };

  return [state, actions];
};