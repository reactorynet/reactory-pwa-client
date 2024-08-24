import { ApolloError } from "@apollo/client";

import { Breakpoint } from '@mui/material';

export interface ReactoryComponentError {
  errorType: string | "graph" | "runtime",
  error: Error | ApolloError
}

export type ScreenSizeKey = Breakpoint | number;

export type InitialStateFunction<TData> = (props?: any) => Promise<any>;

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
  formContext: Reactory.Forms.ReactoryFormContext<TData, unknown[]>, 
  initialData: TData | InitialStateFunction<TData>
};

export type ReactoryFormDataManagerHookResult<TData> = { 
  formData: TData,
  loading: boolean,
  onSubmit: (data: TData) => void,
  onChange: (data: TData) => void, 
  reset: () => void
}

export type ReactoryFormDefinitionHook = <TData>(props: Reactory.Client.IReactoryFormProps<TData>) => { 
  formDefinition: Reactory.Forms.IReactoryForm, 
  resetFormDefinition: () => void 
};

export type ReactoryFormContextHook<TData> = (props:  Reactory.Client.IReactoryFormProps<TData>) => Reactory.Forms.ReactoryFormContext<TData, unknown[]>;

export type ReactoryFormDataManagerHook<TData> = (props: Reactory.Client.IReactoryFormProps<TData>) => ReactoryFormDataManagerHookResult<TData>

export type ReactoryFormUISchemaManagerHook<TData> = (props: Reactory.Client.IReactoryFormProps<TData>) => ReactoryFormUISchemaManagerHookResult;

export type ReactoryFormComponentsHook<TComponents> = (dependencies: Reactory.Client.ComponentDependency[]) => TComponents;

export type ReactoryFormUISchemaManagerHookResult = { 
  uiSchema: Reactory.Schema.IFormUISchema,
  availableSchemas: Reactory.Forms.IUISchemaMenuItem[],
  loading: boolean,
  onSelectUISChema: (key: string) => void, 
  reset: () => void
}

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