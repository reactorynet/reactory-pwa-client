import { ApolloError } from "@apollo/client"
import { GraphQLError } from "graphql"

export interface IReactoryFormDataManagerHookResult {
  type: string | 'graphql' | 'rest' | 'local' | 'grpc' | 'socket'
  isBusy: boolean
  available: boolean  
  onSubmit: <TData>(data: TData) => Promise<TData>
  onChange: <TData>(data: TData) => Promise<TData>
  getData: <TData>(props: any) => Promise<TData>
  refresh: () => void
}


export interface ReactoryFormDataManagerProviderHookResult {
  graphqlDataManager: IReactoryFormDataManagerHookResult,
  restDataManager: IReactoryFormDataManagerHookResult,
  localDataManager: IReactoryFormDataManagerHookResult,
  grpcDataManager: IReactoryFormDataManagerHookResult,
  socketDataManager: IReactoryFormDataManagerHookResult
}

export interface ReactoryErrorHandlerProps {
  errors: GraphQLError[],
  extensions: any,
  data: any,
  form: Reactory.Forms.IReactoryForm,
  formContext: Reactory.Client.IReactoryFormContext<any>,
  reactory: Reactory.Client.ReactorySDK
}


export interface ReactoryFormDataManagerHookProps {
  form: Reactory.Forms.IReactoryForm,
  formContext: Reactory.Client.IReactoryFormContext<any>,
  formData: any,
  mode: string | 'view' | 'edit' | 'new' | 'onChange' | 'onSubmit' | 'onError' | 'onLoad';
  props: any,
}

export interface ReactoryFormDataManagerProviderHookProps extends ReactoryFormDataManagerHookProps {
  graphDefinition?: Reactory.Forms.IFormGraphDefinition,
  grpcDefintion?: Reactory.Forms.IFormGrpcDefinition,
  restDefinition?: Reactory.Forms.IFormRESTDefinition,
}

export type ReactoryFormDataManagerHook = (propds: ReactoryFormDataManagerProviderHookProps) => IReactoryFormDataManagerHookResult

export type ReactoryFormDataManagerProviderHook = (props: ReactoryFormDataManagerProviderHookProps) => ReactoryFormDataManagerProviderHookResult
