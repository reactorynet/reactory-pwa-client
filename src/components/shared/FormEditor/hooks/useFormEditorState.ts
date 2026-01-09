import { useReducer, useMemo } from 'react';

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

export type FormEditorAction = 
  | { type: 'SET_FORM_DATA', payload: any }
  | { type: 'UPDATE_SCHEMA', payload: any }
  | { type: 'UPDATE_UI_SCHEMA', payload: any }
  | { type: 'UPDATE_SCHEMA_VALIDATION', payload: { isValid: boolean, errors: string[] } }
  | { type: 'UPDATE_UI_SCHEMA_VALIDATION', payload: { isValid: boolean, errors: string[] } }
  | { type: 'SET_FORM_SCHEMAS', payload: any };

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

const initialState: FormEditorState = {
  reactoryForm: DEFAULT_FORM_DATA,
  formSchemas: DEFAULT_FORM_SCHEMAS,
  validationState: {
    schema: { isValid: true, errors: [] },
    uiSchema: { isValid: true, errors: [] }
  }
};

const formEditorReducer = (state: FormEditorState, action: FormEditorAction): FormEditorState => {
  switch (action.type) {
    case 'SET_FORM_DATA':
      return {
        ...state,
        reactoryForm: action.payload
      };
    case 'SET_FORM_SCHEMAS':
      return {
        ...state,
        formSchemas: action.payload,
        reactoryForm: {
          ...state.reactoryForm,
          schema: action.payload.schema || state.reactoryForm.schema,
          uiSchema: action.payload.uiSchema || state.reactoryForm.uiSchema
        }
      };
    case 'UPDATE_SCHEMA':
      return {
        ...state,
        formSchemas: {
          ...state.formSchemas,
          schema: action.payload
        },
        reactoryForm: {
          ...state.reactoryForm,
          schema: action.payload
        }
      };
    case 'UPDATE_UI_SCHEMA':
      return {
        ...state,
        formSchemas: {
          ...state.formSchemas,
          uiSchema: action.payload
        },
        reactoryForm: {
          ...state.reactoryForm,
          uiSchema: action.payload
        }
      };
    case 'UPDATE_SCHEMA_VALIDATION':
      return {
        ...state,
        validationState: {
          ...state.validationState,
          schema: action.payload
        }
      };
    case 'UPDATE_UI_SCHEMA_VALIDATION':
      return {
        ...state,
        validationState: {
          ...state.validationState,
          uiSchema: action.payload
        }
      };
    default:
      return state;
  }
};

export const useFormEditorState = (initialFormData?: any): [FormEditorState, FormEditorActions] => {
  const [state, dispatch] = useReducer(formEditorReducer, {
    ...initialState,
    reactoryForm: initialFormData || initialState.reactoryForm,
    formSchemas: {
      ...initialState.formSchemas,
      schema: initialFormData?.schema || initialState.formSchemas.schema,
      uiSchema: initialFormData?.uiSchema || initialState.formSchemas.uiSchema
    }
  });

  const actions = useMemo<FormEditorActions>(() => ({
    setReactoryForm: (form: any) => dispatch({ type: 'SET_FORM_DATA', payload: form }),
    setFormSchemas: (schemas: any) => dispatch({ type: 'SET_FORM_SCHEMAS', payload: schemas }),
    updateSchemaValidation: (isValid: boolean, errors: string[] = []) => 
      dispatch({ type: 'UPDATE_SCHEMA_VALIDATION', payload: { isValid, errors } }),
    updateUISchemaValidation: (isValid: boolean, errors: string[] = []) => 
      dispatch({ type: 'UPDATE_UI_SCHEMA_VALIDATION', payload: { isValid, errors } }),
    updateSchema: (schema: any) => dispatch({ type: 'UPDATE_SCHEMA', payload: schema }),
    updateUISchema: (uiSchema: any) => dispatch({ type: 'UPDATE_UI_SCHEMA', payload: uiSchema })
  }), [dispatch]);

  return [state, actions];
};