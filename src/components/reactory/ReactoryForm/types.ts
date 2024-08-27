import { ApolloError } from "@apollo/client";

import { Breakpoint } from '@mui/material';
import Reactory from "@reactory/reactory-core";
import { Params } from "react-router";

export interface ReactoryComponentError {
  errorType: string | "graph" | "runtime",
  error: Error | ApolloError
}

export type ScreenSizeKey = Breakpoint | number;

export type InitialStateFunction<TData> = (props?: any) => Promise<TData>;

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
  initialData: TData | InitialStateFunction<TData>
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
  validate: Reactory.Forms.SchemaFormValidationFunctionSync<TData> | Reactory.Forms.SchemaFormValidationFunctionAsync<TData>
  errorSchema?: Reactory.Schema.IErrorSchema
  errors: any[]
  SubmitButton: React.FC<{}>
  paging: ReactoryFormDataPaging
  PagingWidget: React.FC<{}>  
}

export type ReactoryFormDefinitionHook = <TData>(props: Reactory.Client.IReactoryFormProps<TData>) => { 
  formDefinition: Reactory.Forms.IReactoryForm, 
  resetFormDefinition: () => void 
};


export type ReactoryFormContextHook<TData> = (props:  Reactory.Client.IReactoryFormProps<TData>) => Reactory.Client.IReactoryFormContext<TData>;

export type ReactoryFormDataManagerHook<TData> = (props: Reactory.Client.IReactoryFormProps<TData>) => ReactoryFormDataManagerHookResult<TData>

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
  mode?: string | "edit" | "view" | "create" | "delete",
  params?: Readonly<Params<string>>
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
  }) => ReactoryFormSchemaHookResult

export type ReactoryFormHelpHookResult = { 
  HelpModal: React.FC<{ }>,
  HelpButton: React.FC<{ }>
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