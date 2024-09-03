import { ApolloError } from "@apollo/client";

import { Breakpoint } from '@mui/material';
import Reactory from "@reactory/reactory-core";
import { Params } from "react-router";

export interface ReactoryComponentError {
  errorType: string | "graph" | "runtime",
  error: Error | ApolloError
}

export type ScreenSizeKey = Breakpoint | number;

/**
 * A function that returns a promise of the initial data for a form.
 */
export type InitialDataFunction<TData> = (props?: any) => Promise<TData>;

export type DefaultComponentMap = {
  Loading: React.ComponentType<{}>,
  Logo: React.ComponentType<{}>,
  FullScreenModal: React.ComponentType<{}>,
  DropDownMenu: React.ComponentType<{}>,
  HelpMe: React.ComponentType<{}>,
  ReportViewer: React.ComponentType<{}>,
  ReactorFormEditor: React.ComponentType<{}>
}

export type ReactoryFormDataManagerProps<TData> = {
  formContext: Reactory.Client.IReactoryFormContext<TData>, 
  initialData: TData | InitialDataFunction<TData>
};

export type ReactoryFormDataPaging = {
  page: number,
  pageSize: number,
  total: number,
  totalPages: number,
}

export type ReactoryFormDataManagerHookResult<TData> = {
  canRefresh: boolean,
  formData: TData,
  isDataLoading: boolean,
  onSubmit: (
    data: TData, 
    errorSchema?: Reactory.Schema.IErrorSchema,
    errors?: any[],
  ) => void,
  onChange: ( 
    data: TData, 
    errorSchema?: Reactory.Schema.IErrorSchema,
    errors?: any[],) => void, 
  reset: () => void
  refresh: () => void
  RefreshButton: React.FC<{}>
  isValidating: boolean,
  validate: Reactory.Forms.SchemaFormValidationFunctionSync<TData> | 
    Reactory.Forms.SchemaFormValidationFunctionAsync<TData>,
  errorSchema?: Reactory.Schema.IErrorSchema
  errors: any[]
  SubmitButton: React.FC<{}>
  paging: ReactoryFormDataPaging
  PagingWidget: React.FC<{}>  
}

export type ReactoryFormDefinitionHook = <TData>(props: Reactory.Client.IReactoryFormProps<unknown>) => ReactoryFormDataManagerHookResult<TData> & {
  instanceId: string,

  schema: Reactory.Schema.AnySchema,

  uiSchema: Reactory.Schema.IFormUISchema,

  SchemaSelector: React.FC<{}>,

  uiOptions: Reactory.Schema.IFormUIOptions,

  isUiSchemaLoading: boolean,

  errorSchema: Reactory.Schema.IErrorSchema,

  /**
   * Updates the form definition.
   * @param form 
   * @returns 
   */
  setForm: (form: Reactory.Forms.IReactoryForm) => void, 
  /**
   * The form definition.
   */
  form: Reactory.Forms.IReactoryForm,
  /**
   * The form data.
   */
  formData: TData,

  isDataLoading: boolean,

  /**
   * The form FQN.
   */
  FQN: string | Reactory.FQN,
  /**
   * The form signature. (includes instance id and version)
   */
  SIGN: string,
  /**
   * A customer graph definition to use for the form.
   */
  graphDefinition?: Reactory.Forms.IFormGraphDefinition,
  /**
   * The form context object.
   */
  formContext: Reactory.Client.IReactoryFormContext<TData>,
  /**
   * The form validation function
   */
  validate: Reactory.Forms.SchemaFormValidationFunctionSync<TData> | 
    Reactory.Forms.SchemaFormValidationFunctionAsync<TData>,

  /**
   * 
   * @param data 
   * @param errors 
   * @param errorSchema 
   * @returns 
   */
  onChange: (data: TData, errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>,

  /**
   * 
   * @param data 
   * @param errors 
   * @param errorSchema 
   * @returns 
   */
  onSubmit: (data: TData, errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>,

  /**
   * 
   * @param errors 
   * @param errorSchema 
   * @returns 
   */
  onError: (errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => Promise<void>,
};


export type ReactoryFormContextHook<TData> = (props:  Reactory.Client.IReactoryFormProps<TData>) => Reactory.Client.IReactoryFormContext<TData>;

export type ReactoryFormDataManagerHook<TData> = (props: {
  formId: string | Reactory.FQN,
  formDefinition: Reactory.Forms.IReactoryForm,
  FQN: string | Reactory.FQN,
  SIGN: string,
  route: Reactory.Routing.IReactoryRoute,
  formContext: Reactory.Client.IReactoryFormContext<TData>,
  initialData: TData | InitialDataFunction<TData>,
  /**
   * A custom graph definition to use for the form.
   * This could be provided by the active uiSchema.
   */
  graphDefinition?: Reactory.Forms.IFormGraphDefinition,
  /**
   * 
   * @param data 
   * @param formContext 
   * @returns 
   */
  onBeforeQuery?: (data: TData, formContext: Reactory.Client.IReactoryFormContext<TData>) => boolean,
  onBeforeSubmit?: (data: TData, formContext: Reactory.Client.IReactoryFormContext<TData>) => boolean,
  onBeforeMutation?: (data: TData, formContext: Reactory.Client.IReactoryFormContext<TData>) => boolean,
  onSubmit?: (data: TData, 
    errors: any[],
    errorSchema: Reactory.Schema.IErrorSchema, 
    formContext: Reactory.Client.IReactoryFormContext<TData>) => void,
  mode: string | "edit" | "view" | "create" | "delete",
  onError: (errors: any[], errorSchema: Reactory.Schema.IErrorSchema) => void,
}) => ReactoryFormDataManagerHookResult<TData>

export type ReactoryFormComponentsHook<TComponents> = (dependencies: Reactory.Client.ComponentDependency[]) => TComponents;

export type ReactoryFormUISchemaManagerHookResult = {
  uiOptions: Reactory.Schema.IFormUIOptions, 
  uiSchema: Reactory.Schema.IFormUISchema,
  uiSchemaActiveMenuItem: Reactory.Forms.IUISchemaMenuItem,
  uiSchemasAvailable: Reactory.Forms.IUISchemaMenuItem[],
  uiSchemaActiveGraphDefintion?: Reactory.Forms.IFormGraphDefinition,
  SchemaSelector: React.FC<{}>
  loading: boolean,
  onSelectUISChema: (key: string) => void, 
  reset: () => void
}

export type ReactoryFormUISchemaManagerHook<TData> = (props: {
  formDefinition: Reactory.Forms.IReactoryForm,
  uiSchemaKey?: string,
  uiSchemaId?: string,
  mode?: string | "edit" | "view" | "create" | "delete",
  params?: Readonly<Params<string>>
  FQN: string | Reactory.FQN,
  SIGN: string,
}) => ReactoryFormUISchemaManagerHookResult;

export type ReactoryFormSchemaHookResult = { 
  schema:  Reactory.Schema.AnySchema,
  busy: boolean,
}

export type ReactoryFormSchemaHook<TData> = 
  (props: { 
    schema?: Reactory.Schema.AnySchema,
    uiSchemaActiveMenuItem?: Reactory.Forms.IUISchemaMenuItem,
    formId?: string | Reactory.FQN,
    FQN: string | Reactory.FQN,
    SIGN: string, 
  }) => ReactoryFormSchemaHookResult

export type ReactoryFormHelpHookResult = { 
  HelpModal: React.FC<{ }>,
  HelpButton: React.FC<{ }>,
  toggleHelp: () => void
}

export type ReactoryFormHelpHook = (props: {
  formDefinition: Reactory.Forms.IReactoryForm,
}) => ReactoryFormHelpHookResult;

export type ReactoryFormReportsHookResult = { 
  ReportModal: React.FC<{ }>,
  ReportButton: React.FC<{ }>
}

export type ReactoryFormReportsHook = (props: {
  formDefinition: Reactory.Forms.IReactoryForm,
}) => ReactoryFormReportsHookResult;

export type ReactoryFormExportHookResult = { 
  ExportModal: React.FC<{ }>,
  ExportButton: React.FC<{ }>
}

export type ReactoryFormExportHook = (props: { 
  formDefinition: Reactory.Forms.IReactoryForm,
  formData: any
}) => ReactoryFormExportHookResult;

export type ReactoryFormToolbarHookResult = { 
  Toolbar: React.FC<{}>  
}

export type ReactoryFormToolbarHook = (props: {
  formDefinition: Reactory.Forms.IReactoryForm,
  formData: any
  uiOptions: Reactory.Schema.IFormUIOptions,
  onSubmit: (data: any, errorSchema?: Reactory.Schema.IErrorSchema, errors?: any[]) => void,
  refresh: () => void,
  toggleHelp: () => void,
  errorSchema: Reactory.Schema.IErrorSchema,
  errors: any[],
  SchemaSelector: React.FC<{}>
  SubmitButton: React.FC<{}>
}) => ReactoryFormToolbarHookResult;  
   
export interface ReactoryFormState {
  loading: boolean,
  allowRefresh?: boolean,
  forms_loaded: boolean,
  forms: Reactory.Forms.IReactoryForm[],
  uiFramework: string,
  uiSchemaKey: string,
  activeUiSchemaMenuItem?: Reactory.Forms.IUISchemaMenuItem,
  formDef?: Reactory.Forms.IReactoryForm,
  formData?: any,
  dirty: boolean,
  queryComplete: boolean,
  showHelp: boolean,
  showReportModal: boolean,
  showExportWindow: boolean,
  activeExportDefinition?: Reactory.Forms.IExport,
  activeReportDefinition?: Reactory.Forms.IReactoryPdfReport,
  query?: any,
  busy: boolean,
  liveUpdate: boolean,
  pendingResources: any,
  _instance_id: string,
  plugins?: any,
  queryError?: any,
  message?: string,
  formError?: any,
  autoQueryDisabled?: boolean,
  boundaryError?: Error,
  notificationComplete: boolean,
  mutate_complete_handler_called: boolean,
  last_query_exec?: number,
  form_created: number
}