export type InitialStateFunction<TData> = (props?: any) => Promise<any>;

export type ReactoryFormDataManagerProps<TData> = {
  formContext: Reactory.Forms.ReactoryFormContext<TData, unknown[]>, 
  initialData: TData | InitialStateFunction<TData>
};

export type ReactoryFormDataManagerHookResult<TData> = { 
  formData: TData,
  loading: boolean,
  onChange: (data: TData) => void, 
  reset: () => void
}

export type ReactoryFormContextHook<TData> = (props:  Reactory.Client.IReactoryFormProps) => Reactory.Forms.ReactoryFormContext<TData, unknown[]>;

export type ReactoryFormDataManagerHook<TData> = (props: Reactory.Client.IReactoryFormProps) => ReactoryFormDataManagerHookResult<TData>

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