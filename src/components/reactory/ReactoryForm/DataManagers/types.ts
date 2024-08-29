
export interface IReactoryFormDataManagerHookResult {
  type: string | 'graphql' | 'rest' | 'local' | 'grpc' | 'socket'  
  onSubmit: <TData>(data: TData) => Promise<TData>
  onChange: <TData>(data: TData) => Promise<TData>
  getData: <TData>(props: any) => Promise<TData>
  refresh: () => void
}

export type ReactoryFormDataManagerHook = (form: Reactory.Forms.IReactoryForm) => IReactoryFormDataManagerHookResult

export interface ReactoryFormDataManagerProviderHookResult {
  dataManagers: IReactoryFormDataManagerHookResult[]
}

export interface ReactoryFormDataManagerProviderHookProps {
  formDefinition: Reactory.Forms.IReactoryForm
}

export type ReactoryFormDataManagerProviderHook = (props: ReactoryFormDataManagerProviderHookProps) => ReactoryFormDataManagerProviderHookResult

