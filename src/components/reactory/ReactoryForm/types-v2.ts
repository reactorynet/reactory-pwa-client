/**
 * Enhanced TypeScript types for ReactoryForm
 * Phase 1.1: Type System Overhaul
 * 
 * This file provides improved type safety, runtime validation,
 * and comprehensive documentation for the ReactoryForm component.
 */

import { ApolloError } from "@apollo/client";
import { Breakpoint } from '@mui/material';
import Reactory from "@reactory/reactory-core";
import { Params } from "react-router";

// ============================================================================
// CORE TYPE DEFINITIONS
// ============================================================================

/**
 * Enhanced error type with better type safety
 */
export interface ReactoryComponentError {
  /** Type of error that occurred */
  errorType: "graph" | "runtime" | "validation" | "network" | "unknown";
  /** The actual error object */
  error: Error | ApolloError;
  /** Additional context about the error */
  context?: Record<string, any>;
  /** Timestamp when the error occurred */
  timestamp: Date;
  /** User-friendly error message */
  userMessage?: string;
}

/**
 * Screen size configuration with validation
 */
export type ScreenSizeKey = Breakpoint | number;

/**
 * Validates if a value is a valid screen size
 */
export const isValidScreenSize = (size: any): size is ScreenSizeKey => {
  if (typeof size === 'number') return size > 0;
  if (typeof size === 'string') {
    return ['xs', 'sm', 'md', 'lg', 'xl'].includes(size);
  }
  return false;
};

/**
 * Enhanced initial data function with better typing
 */
export type InitialDataFunction<TData> = (props?: {
  formId?: string;
  formContext?: Reactory.Client.IReactoryFormContext<TData>;
  params?: Record<string, any>;
}) => Promise<TData>;

/**
 * Validates if a value is a valid initial data function
 */
export const isInitialDataFunction = <TData>(value: any): value is InitialDataFunction<TData> => {
  return typeof value === 'function' && value.constructor.name === 'AsyncFunction';
};

// ============================================================================
// COMPONENT MAP TYPES
// ============================================================================

/**
 * Enhanced component map with better type safety
 */
export type DefaultComponentMap = {
  Loading: React.ComponentType<{ message?: string; size?: 'small' | 'medium' | 'large' }>;
  Logo: React.ComponentType<{ size?: 'small' | 'medium' | 'large' }>;
  FullScreenModal: React.ComponentType<{ 
    open: boolean; 
    onClose: () => void; 
    children: React.ReactNode;
    title?: string;
  }>;
  DropDownMenu: React.ComponentType<{ 
    items: Array<{ label: string; action: () => void }>;
    anchorEl?: HTMLElement;
    onClose: () => void;
  }>;
  HelpMe: React.ComponentType<{ 
    content: string | React.ReactNode;
    title?: string;
  }>;
  ReportViewer: React.ComponentType<{ 
    reportId: string;
    data?: any;
  }>;
  ReactorFormEditor: React.ComponentType<{ 
    formDefinition: Reactory.Forms.IReactoryForm;
    onSave?: (form: Reactory.Forms.IReactoryForm) => void;
  }>;
};

/**
 * Validates if a value is a valid component map
 */
export const isValidComponentMap = (value: any): value is DefaultComponentMap => {
  if (!value || typeof value !== 'object') return false;
  
  const requiredComponents = [
    'Loading', 'Logo', 'FullScreenModal', 'DropDownMenu', 
    'HelpMe', 'ReportViewer', 'ReactorFormEditor'
  ];
  
  return requiredComponents.every(component => 
    typeof value[component] === 'function'
  );
};

// ============================================================================
// DATA MANAGER TYPES
// ============================================================================

/**
 * Enhanced data manager props with validation
 */
export type ReactoryFormDataManagerProps<TData> = {
  formContext: Reactory.Client.IReactoryFormContext<TData>;
  initialData: TData | InitialDataFunction<TData>;
  /** Validation function for initial data */
  validateInitialData?: (data: TData) => boolean;
  /** Transform function for initial data */
  transformInitialData?: (data: any) => TData;
};

/**
 * Enhanced paging configuration
 */
export type ReactoryFormDataPaging = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Whether there are more pages */
  hasNext: boolean;
  /** Whether there are previous pages */
  hasPrevious: boolean;
  /** Current page items */
  items: any[];
};

/**
 * Validates paging configuration
 */
export const isValidPaging = (paging: any): paging is ReactoryFormDataPaging => {
  if (!paging || typeof paging !== 'object') return false;
  
  return (
    typeof paging.page === 'number' && paging.page >= 0 &&
    typeof paging.pageSize === 'number' && paging.pageSize > 0 &&
    typeof paging.total === 'number' && paging.total >= 0 &&
    typeof paging.totalPages === 'number' && paging.totalPages >= 0 &&
    typeof paging.hasNext === 'boolean' &&
    typeof paging.hasPrevious === 'boolean' &&
    Array.isArray(paging.items)
  );
};

/**
 * Enhanced schema form event props
 */
export type SchemaFormOnChangeEventProps<TData> = {
  formData: TData;
  schema: Reactory.Schema.AnySchema;
  idSchema: Reactory.Schema.IDSchema;
  edit: boolean;
  errors: Array<{
    name: string;
    message: string;
    stack?: string;
  }>;
  errorSchema: Reactory.Schema.IErrorSchema;
  /** Additional context */
  context?: Record<string, any>;
  /** Timestamp of the change */
  timestamp: Date;
};

/**
 * Enhanced submit event props
 */
export type SchemaFormOnSubmitEventProps<TData> = SchemaFormOnChangeEventProps<TData> & {
  /** Whether the form is being submitted */
  isSubmitting: boolean;
  /** Submission metadata */
  metadata?: Record<string, any>;
};

/**
 * Enhanced data manager hook result
 */
export type ReactoryFormDataManagerHookResult<TData> = {
  canRefresh: boolean;
  formData: TData;
  isDataLoading: boolean;
  onSubmit: (props: SchemaFormOnSubmitEventProps<TData>) => Promise<void>;
  onChange: (props: SchemaFormOnChangeEventProps<TData>) => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
  RefreshButton: React.FC<{ disabled?: boolean; loading?: boolean }>;
  isValidating: boolean;
  validate: Reactory.Forms.SchemaFormValidationFunctionSync<TData> | 
    Reactory.Forms.SchemaFormValidationFunctionAsync<TData>;
  errorSchema?: Reactory.Schema.IErrorSchema;
  errors: Array<{
    name: string;
    message: string;
    stack?: string;
  }>;
  SubmitButton: React.FC<{ 
    disabled?: boolean; 
    loading?: boolean;
    text?: string;
  }>;
  paging: ReactoryFormDataPaging;
  PagingWidget: React.FC<{ 
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  }>;
  /** Data validation status */
  isValid: boolean;
  /** Last validation timestamp */
  lastValidated?: Date;
  /** Data transformation status */
  isTransforming: boolean;
};

// ============================================================================
// FORM DEFINITION TYPES
// ============================================================================

/**
 * Enhanced form definition hook result
 */
export type ReactoryFormDefinitionHook = <TData>(props: Reactory.Client.IReactoryFormProps<unknown>) => ReactoryFormDataManagerHookResult<TData> & {
  instanceId: string;
  schema: Reactory.Schema.AnySchema;
  uiSchema: Reactory.Schema.IFormUISchema;
  SchemaSelector: React.FC<{ 
    options?: Array<{ label: string; value: string }>;
    onSelect?: (schema: Reactory.Schema.AnySchema) => void;
  }>;
  uiOptions: Reactory.Schema.IFormUIOptions;
  isUiSchemaLoading: boolean;
  errorSchema: Reactory.Schema.IErrorSchema;
  
  /**
   * Updates the form definition with validation
   */
  setForm: (form: Reactory.Forms.IReactoryForm) => Promise<void>;
  
  /**
   * The form definition with enhanced typing
   */
  form: Reactory.Forms.IReactoryForm;
  
  /**
   * The form data with validation
   */
  formData: TData;
  
  isDataLoading: boolean;
  FQN: string | Reactory.FQN;
  SIGN: string;
  graphDefinition?: Reactory.Forms.IFormGraphDefinition;
  formContext: Reactory.Client.IReactoryFormContext<TData>;
  
  /**
   * Enhanced validation function
   */
  validate: Reactory.Forms.SchemaFormValidationFunctionSync<TData> | 
    Reactory.Forms.SchemaFormValidationFunctionAsync<TData>;
  
  /**
   * Enhanced change handler with validation
   */
  onChange: (data: TData, errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>;
  
  /**
   * Enhanced submit handler with validation
   */
  onSubmit: (data: TData, errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>;
  
  /**
   * Enhanced error handler
   */
  onError: (errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>;
  
  /** Form validation status */
  isFormValid: boolean;
  /** Last form validation timestamp */
  lastFormValidation?: Date;
  /** Form modification status */
  isFormModified: boolean;
};

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Enhanced form context hook
 */
export type ReactoryFormContextHook<TData> = (props: Reactory.Client.IReactoryFormProps<TData>) => Reactory.Client.IReactoryFormContext<TData> & {
  /** Context validation status */
  isValid: boolean;
  /** Context modification timestamp */
  lastModified?: Date;
  /** Context metadata */
  metadata?: Record<string, any>;
};

// ============================================================================
// DATA MANAGER HOOK TYPES
// ============================================================================

/**
 * Enhanced data manager hook
 */
export type ReactoryFormDataManagerHook<TData> = (props: {
  formId: string | Reactory.FQN;
  formDefinition: Reactory.Forms.IReactoryForm;
  FQN: string | Reactory.FQN;
  SIGN: string;
  route: Reactory.Routing.IReactoryRoute;
  formContext: Reactory.Client.IReactoryFormContext<TData>;
  initialData: TData | InitialDataFunction<TData>;
  graphDefinition?: Reactory.Forms.IFormGraphDefinition;
  
  /**
   * Enhanced before query handler
   */
  onBeforeQuery?: (data: TData, formContext: Reactory.Client.IReactoryFormContext<TData>) => boolean | Promise<boolean>;
  
  /**
   * Enhanced before submit handler
   */
  onBeforeSubmit?: (data: TData, formContext: Reactory.Client.IReactoryFormContext<TData>) => boolean | Promise<boolean>;
  
  /**
   * Enhanced before mutation handler
   */
  onBeforeMutation?: (data: TData, formContext: Reactory.Client.IReactoryFormContext<TData>) => boolean | Promise<boolean>;
  
  /**
   * Enhanced submit handler
   */
  onSubmit?: (data: TData, 
    errors: any[],
    errorSchema: Reactory.Schema.IErrorSchema, 
    formContext: Reactory.Client.IReactoryFormContext<TData>) => Promise<void>;
  
  mode: "edit" | "view" | "create" | "delete";
  
  /**
   * Enhanced error handler
   */
  onError: (errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>;
  
  props: any;
  
  /** Validation configuration */
  validation?: {
    enabled: boolean;
    strict: boolean;
    customValidators?: Record<string, (value: any) => boolean>;
  };
  
  /** Transformation configuration */
  transformation?: {
    enabled: boolean;
    transformers?: Record<string, (value: any) => any>;
  };
}) => ReactoryFormDataManagerHookResult<TData>;

// ============================================================================
// COMPONENT HOOK TYPES
// ============================================================================

/**
 * Enhanced component hook
 */
export type ReactoryFormComponentsHook<TComponents> = (dependencies: Reactory.Client.ComponentDependency[]) => TComponents & {
  /** Component loading status */
  isLoading: boolean;
  /** Component error status */
  hasError: boolean;
  /** Component error details */
  error?: ReactoryComponentError;
  /** Component metadata */
  metadata?: Record<string, any>;
};

// ============================================================================
// UI SCHEMA TYPES
// ============================================================================

/**
 * Enhanced UI schema manager hook result
 */
export type ReactoryFormUISchemaManagerHookResult = {
  uiOptions: Reactory.Schema.IFormUIOptions;
  uiSchema: Reactory.Schema.IFormUISchema;
  uiSchemaActiveMenuItem: Reactory.Forms.IUISchemaMenuItem;
  uiSchemasAvailable: Reactory.Forms.IUISchemaMenuItem[];
  uiSchemaActiveGraphDefintion?: Reactory.Forms.IFormGraphDefinition;
  SchemaSelector: React.FC<{ 
    options?: Array<{ label: string; value: string }>;
    onSelect?: (schema: Reactory.Schema.IFormUISchema) => void;
  }>;
  loading: boolean;
  onSelectUISChema: (key: string) => Promise<void>;
  reset: () => void;
  
  /** UI Schema validation status */
  isValid: boolean;
  /** UI Schema modification timestamp */
  lastModified?: Date;
  /** UI Schema metadata */
  metadata?: Record<string, any>;
};

/**
 * Enhanced UI schema manager hook
 */
export type ReactoryFormUISchemaManagerHook<TData> = (props: {
  formDefinition: Reactory.Forms.IReactoryForm;
  uiSchemaKey?: string;
  uiSchemaId?: string;
  mode?: "edit" | "view" | "create" | "delete";
  params?: Readonly<Params<string>>;
  FQN: string | Reactory.FQN;
  SIGN: string;
  
  /** UI Schema validation configuration */
  validation?: {
    enabled: boolean;
    strict: boolean;
  };
  
  /** UI Schema transformation configuration */
  transformation?: {
    enabled: boolean;
    transformers?: Record<string, (schema: Reactory.Schema.IFormUISchema) => Reactory.Schema.IFormUISchema>;
  };
}) => ReactoryFormUISchemaManagerHookResult;

// ============================================================================
// SCHEMA TYPES
// ============================================================================

/**
 * Enhanced schema hook result
 */
export type ReactoryFormSchemaHookResult = {
  schema: Reactory.Schema.AnySchema;
  busy: boolean;
  
  /** Schema validation status */
  isValid: boolean;
  /** Schema modification timestamp */
  lastModified?: Date;
  /** Schema metadata */
  metadata?: Record<string, any>;
  /** Schema validation errors */
  validationErrors?: Array<{
    path: string;
    message: string;
  }>;
};

/**
 * Enhanced schema hook
 */
export type ReactoryFormSchemaHook<TData> = (props: {
  schema?: Reactory.Schema.AnySchema;
  uiSchemaActiveMenuItem?: Reactory.Forms.IUISchemaMenuItem;
  formId?: string | Reactory.FQN;
  FQN: string | Reactory.FQN;
  SIGN: string;
  
  /** Schema validation configuration */
  validation?: {
    enabled: boolean;
    strict: boolean;
    customValidators?: Record<string, (schema: Reactory.Schema.AnySchema) => boolean>;
  };
  
  /** Schema transformation configuration */
  transformation?: {
    enabled: boolean;
    transformers?: Record<string, (schema: Reactory.Schema.AnySchema) => Reactory.Schema.AnySchema>;
  };
}) => ReactoryFormSchemaHookResult;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Enhanced help hook result
 */
export type ReactoryFormHelpHookResult = {
  HelpModal: React.FC<{ 
    open: boolean;
    onClose: () => void;
    content?: string | React.ReactNode;
  }>;
  HelpButton: React.FC<{ 
    disabled?: boolean;
    loading?: boolean;
  }>;
  toggleHelp: () => void;
  
  /** Help content validation status */
  isValid: boolean;
  /** Help content modification timestamp */
  lastModified?: Date;
};

/**
 * Enhanced help hook
 */
export type ReactoryFormHelpHook = (props: {
  formDefinition: Reactory.Forms.IReactoryForm;
  formContext: Reactory.Client.IReactoryFormContext<any>;
  formData: any;
  
  /** Help configuration */
  help?: {
    enabled: boolean;
    content?: string | React.ReactNode;
    validation?: {
      enabled: boolean;
      strict: boolean;
    };
  };
}) => ReactoryFormHelpHookResult;

/**
 * Enhanced reports hook result
 */
export type ReactoryFormReportsHookResult = {
  ReportModal: React.FC<{ 
    open: boolean;
    onClose: () => void;
    reportId?: string;
  }>;
  ReportButton: React.FC<{ 
    disabled?: boolean;
    loading?: boolean;
  }>;
  
  /** Reports validation status */
  isValid: boolean;
  /** Reports modification timestamp */
  lastModified?: Date;
};

/**
 * Enhanced reports hook
 */
export type ReactoryFormReportsHook = (props: {
  formDefinition: Reactory.Forms.IReactoryForm;
  
  /** Reports configuration */
  reports?: {
    enabled: boolean;
    availableReports?: Array<{ id: string; name: string; description?: string }>;
    validation?: {
      enabled: boolean;
      strict: boolean;
    };
  };
}) => ReactoryFormReportsHookResult;

/**
 * Enhanced export hook result
 */
export type ReactoryFormExportHookResult = {
  ExportModal: React.FC<{ 
    open: boolean;
    onClose: () => void;
    formats?: Array<{ id: string; name: string; extension: string }>;
  }>;
  ExportButton: React.FC<{ 
    disabled?: boolean;
    loading?: boolean;
  }>;
  
  /** Export validation status */
  isValid: boolean;
  /** Export modification timestamp */
  lastModified?: Date;
};

/**
 * Enhanced export hook
 */
export type ReactoryFormExportHook = (props: {
  formDefinition: Reactory.Forms.IReactoryForm;
  formData: any;
  
  /** Export configuration */
  export?: {
    enabled: boolean;
    formats?: Array<{ id: string; name: string; extension: string }>;
    validation?: {
      enabled: boolean;
      strict: boolean;
    };
  };
}) => ReactoryFormExportHookResult;

/**
 * Enhanced toolbar hook result
 */
export type ReactoryFormToolbarHookResult = {
  Toolbar: React.FC<{ 
    disabled?: boolean;
    loading?: boolean;
  }>;
  
  /** Toolbar validation status */
  isValid: boolean;
  /** Toolbar modification timestamp */
  lastModified?: Date;
};

/**
 * Enhanced toolbar hook
 */
export type ReactoryFormToolbarHook = (props: {
  formDefinition: Reactory.Forms.IReactoryForm;
  formData: any;
  formContext: Reactory.Client.IReactoryFormContext<any>;
  uiOptions: Reactory.Schema.IFormUIOptions;
  onSubmit: (data: any, errorSchema?: Reactory.Schema.IErrorSchema, errors?: any[]) => Promise<void>;
  refresh: () => Promise<void>;
  toggleHelp: () => void;
  errorSchema: Reactory.Schema.IErrorSchema;
  errors: any[];
  SchemaSelector: React.FC<{}>;
  SubmitButton: React.FC<{}>;
  
  /** Toolbar configuration */
  toolbar?: {
    enabled: boolean;
    items?: Array<{ id: string; label: string; action: () => void; disabled?: boolean }>;
    validation?: {
      enabled: boolean;
      strict: boolean;
    };
  };
}) => ReactoryFormToolbarHookResult;

// ============================================================================
// STATE TYPES
// ============================================================================

/**
 * Enhanced form state with better type safety
 */
export interface ReactoryFormState {
  loading: boolean;
  allowRefresh?: boolean;
  forms_loaded: boolean;
  forms: Reactory.Forms.IReactoryForm[];
  uiFramework: string;
  uiSchemaKey: string;
  activeUiSchemaMenuItem?: Reactory.Forms.IUISchemaMenuItem;
  formDef?: Reactory.Forms.IReactoryForm;
  formData?: any;
  dirty: boolean;
  queryComplete: boolean;
  showHelp: boolean;
  showReportModal: boolean;
  showExportWindow: boolean;
  activeExportDefinition?: Reactory.Forms.IExport;
  activeReportDefinition?: Reactory.Forms.IReactoryPdfReport;
  query?: any;
  busy: boolean;
  liveUpdate: boolean;
  pendingResources: any;
  _instance_id: string;
  plugins?: any;
  queryError?: ReactoryComponentError;
  message?: string;
  formError?: ReactoryComponentError;
  autoQueryDisabled?: boolean;
  boundaryError?: Error;
  notificationComplete: boolean;
  mutate_complete_handler_called: boolean;
  last_query_exec?: number;
  form_created: number;
  
  /** Enhanced validation status */
  isValid: boolean;
  /** Last validation timestamp */
  lastValidated?: Date;
  /** State modification timestamp */
  lastModified?: Date;
  /** State metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// RUNTIME VALIDATION UTILITIES
// ============================================================================

/**
 * Validates if a value is a valid form state
 */
export const isValidFormState = (state: any): state is ReactoryFormState => {
  if (!state || typeof state !== 'object') return false;
  
  const requiredFields = [
    'loading', 'forms_loaded', 'forms', 'uiFramework', 'uiSchemaKey',
    'dirty', 'queryComplete', 'showHelp', 'showReportModal', 'showExportWindow',
    'busy', 'liveUpdate', 'pendingResources', '_instance_id',
    'notificationComplete', 'mutate_complete_handler_called', 'last_query_exec', 'form_created'
  ];
  
  return requiredFields.every(field => field in state);
};

/**
 * Validates if a value is a valid form definition
 */
export const isValidFormDefinition = (form: any): form is Reactory.Forms.IReactoryForm => {
  if (!form || typeof form !== 'object') return false;
  
  const requiredFields = ['id', 'name', 'version'];
  
  return requiredFields.every(field => field in form);
};

/**
 * Validates if a value is a valid schema
 */
export const isValidSchema = (schema: any): schema is Reactory.Schema.AnySchema => {
  if (!schema || typeof schema !== 'object') return false;
  
  return 'type' in schema || 'properties' in schema || '$ref' in schema;
};

/**
 * Validates if a value is a valid UI schema
 */
export const isValidUISchema = (uiSchema: any): uiSchema is Reactory.Schema.IFormUISchema => {
  if (!uiSchema || typeof uiSchema !== 'object') return false;
  
  return true; // UI Schema can be empty object
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ReactoryComponentError
 */
export const isReactoryComponentError = (error: any): error is ReactoryComponentError => {
  return (
    error &&
    typeof error === 'object' &&
    'errorType' in error &&
    'error' in error &&
    'timestamp' in error &&
    typeof error.errorType === 'string' &&
    error.error instanceof Error
  );
};

/**
 * Type guard for ReactoryFormState
 */
export const isReactoryFormState = (state: any): state is ReactoryFormState => {
  return isValidFormState(state);
};

/**
 * Type guard for ReactoryFormDataManagerHookResult
 */
export const isReactoryFormDataManagerHookResult = <TData>(result: any): result is ReactoryFormDataManagerHookResult<TData> => {
  if (!result || typeof result !== 'object') return false;
  
  const requiredFields = [
    'canRefresh', 'formData', 'isDataLoading', 'onSubmit', 'onChange',
    'reset', 'refresh', 'RefreshButton', 'isValidating', 'validate',
    'errors', 'SubmitButton', 'paging', 'PagingWidget'
  ];
  
  return requiredFields.every(field => field in result);
};

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// All types are already exported above 