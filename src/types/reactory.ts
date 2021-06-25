
import moment from 'moment';
import { TemplateOptions } from 'lodash';
import { TemplateType, UIFrameWork } from './constants';
import {
  ApolloClient,
  MutationResult,
  QueryResult
} from "@apollo/client";
import React from 'react';
import Module from 'module';
import GoogleMap from 'react-google-maps/lib/components/GoogleMap';

namespace Reactory {

  export interface IComponentFqnDefinition {
    nameSpace: string
    name: string
    version: string
  }

  export interface IPalette {
    light: string,
    main: string,
    dark: string,
    contrastText: string
  }

  export interface IThemePalette {
    primary1Color: string
    primary: IPalette
    secondary: IPalette
    report: IPalette
  }

  export interface ITheme {
    type: string
    palette: IThemePalette
  }

  export interface IRouteDefinition {
    [key: string]: any
    key: string,
    componentFqn: string,
    path: string,
    exact: boolean
    render: (props) => React.ReactElement
  }
  export namespace Client {

    export interface LoadashTemplateExecutor {
      (data?: object): string;
      source: string;
    }

    export interface NotificationProperties {
      title: string,
      options: NotificationOptions
    }

    export interface ClientUtils {
      omitDeep(): any,
      queryString(): any,
      hashCode: (inputString: string) => any,
      injectResources(sources: any[]): void,
      componentFqn(fqn: Reactory.IComponentFqnDefinition): string,
      pluginDefinitionValid(definition: any): boolean,
      moment: moment.Moment,
      objectMapper(src: any, map: any): any,
      template(
        string?: string,
        options?: TemplateOptions
      ): LoadashTemplateExecutor
      humanNumber(value: any | number)
    }

    export interface IReactoryApi {
      history: any;
      queries: any;
      mutations: any;
      props: any;
      componentRegister: any;
      client: ApolloClient<any>;
      login: Function;
      register: Function;
      reset: Function;
      forgot: Function;
      utils: any;
      companyWithId: Function;
      $func: any;
      rest: any;
      tokenValidated: boolean;
      lastValidation: number;
      tokenValid: boolean;
      getAvatar: Function;
      getOrganizationLogo: Function;
      getUserFullName: Function;
      CDN_ROOT: string;
      API_ROOT: string;
      CLIENT_KEY: string;
      CLIENT_PWD: string;
      formSchemas: Reactory.IReactoryForm[];
      formSchemaLastFetch: moment.Moment;
      assets: any;
      amq: any;
      statistics: any;
      __form_instances: any;
      flushIntervalTimer: any;
      __REACTORYAPI: boolean;
      publishingStats: boolean;
      reduxStore: any;
      muiTheme: any;
      queryObject: any;
      queryString: any;
      objectToQueryString: Function;

      [key: string]: any;

      createNotification(title: string, notificationProperties: NotificationProperties | any);

      goto(where, state): void;

      registerFunction(fqn, functionReference, requiresApi): void;

      log(message, params: any, kind): void;

      publishstats(): void;

      flushstats(save): void;

      stat(key, statistic): void;

      trackFormInstance(formInstance): void;

      graphqlMutation(mutation, variables, options: any): Promise<MutationResult>;

      graphqlQuery(query, variables, options: any): Promise<QueryResult>;

      afterLogin(user): any;

      loadComponent(Component, props, target): void;

      loadComponentWithFQN(fqn, props, target): void;

      renderForm(componentView): any;

      forms(): void;

      raiseFormCommand(commandId, commandDef, formData): Promise<any>;

      startWorkFlow(workFlowId, data): void;

      onFormCommandEvent(commandId, func): void;

      hasRole(itemRoles, userRoles): boolean;

      isAnon(): boolean;

      addRole(user, organization, role): boolean;

      removeRole(user, organization, role): boolean;

      getMenus(target): any[];

      getTheme(): any;

      getRoutes(): any[];

      getApplicationRoles(): any[];

      setUser(user): void;

      setAuthToken(token): void;

      getAuthToken(): string;

      setLastUserEmail(email): void;

      getLastUserEmail(): void;

      registerComponent(nameSpace, name, version, component: any, tags, roles, wrapWithApi): void;

      getComponents(componentFqns): {};

      getComponent(fqn): any;

      getNotFoundComponent(notFoundComponent): { [key: string]: any };

      getNotAllowedComponent(notAllowedComponentFqn): any;

      mountComponent(ComponentToMount, props, domNode, theme, callback): void;

      showModalWithComponentFqn(componentFqn, title, props, modalProps, domNode, theme, callback): void;

      showModalWithComponent(title, ComponentToMount, props, modalProps: any, domNode, theme, callback): void;

      createElement(ComponentToCreate, props): React.DetailedReactHTMLElement<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

      unmountComponent(node): boolean;

      logout(refreshStatus): void;

      getLastValidation(): number | any;

      getTokenValidated(): boolean | any;

      getUser(): any;

      saveUserLoginCredentials(provider, props): Promise<any>;

      getUserLoginCredentials(provider): Promise<any>;

      storeObjectWithKey(key, objectToStore): void;

      readObjectWithKey(key): any;

      deleteObjectWithKey(key): void;

      status(options): void;

      validateToken(token): any;

      resetPassword({ password, confirmPassword, resetToken }): void;

      setViewContext(context): void;

      getViewContext(): any;

      extendClientResolver(resolver: any);
    }

    export interface IReactoryWiredComponent {
      /**
       * The api reference will be phased out and only the reactory reference must be used.
       */
      api: IReactoryApi,

      /**
       * The global reactory variable that represent the reactory api instance
       */
      reactory: IReactoryApi,
    };

    export interface IFrameProperties {
      url: string
      height: string
      width: string
      styles: any
    }

    export interface IMessageHandler {
      id: string
      name: string
      type: string
      uri: string
      component: string
    }

    export interface IFramedWindowProperties {
      proxyRoot?: string
      frameProps?: IFrameProperties
      messageHandlers?: IMessageHandler[]
    }

    export interface IReactoryFormContext {

      [key: string]: any
    }

    export interface IReactoryFormProps extends IReactoryWiredComponent {
      formId: string
      uiSchemaId: string
      uiFrameWork: string
    }

    /**
     * The base widget property set. Additional property type created 
     * by extending this interface for your specfic form type
     */
    export interface IReactoryWidgetProps<T> extends IReactoryWiredComponent {
      formData: T,
      schema: Reactory.ISchema,
      uiSchema: any,
      idSchema: any,
      formContext: Reactory.Client.IReactoryFormContext,
      [key: string]: any
    }
  }

  export interface IAuthentication {
    provider: string
    props: any
    lastLogin: Date
  }


  export interface ITemplateParam {
    name: string
    type: string
  }

  export interface ITemplate {
    enabled: boolean
    organization?: string
    client: string
    view: string
    kind: TemplateType
    format: string
    content: string
    description?: string
    name?: string
    locale?: string
    elements: Array<ITemplate>
    parameters: Array<ITemplateParam>
  }


  export interface IPartner {
    id: string
    key: string
    name: string
  }

  export interface IOrganization {
    id: string
    name: string
    code: string
    logo: string
    businessUnits: Array<IBusinessUnit>
  }

  export interface IBusinessUnit {
    id: string
    name: string
  }

  export interface IMemberShip {
    id: string
    clientId: string | any
    organizationId: string | any
    businessUnitId: string | any
    enabled: boolean
    authProvider: string
    providerId: string
    lastLogin: Date
    roles: [string]
  }

  export interface IUser {
    id: string
    email: string
    firstName: string
    lastName: string
    fullName(email: boolean): string
    authentications: any[]
    addRole(clientId: string, role: string, organizationId: string, businessUnitId: string): boolean
    removeRole(clientId: string, role: string, organizationId: string): IMemberShip[],
    removeAuthentication(provider: string): boolean
    getAuthentication(provider: string): IAuthentication
  }


  export interface ISchema {
    type: string,
    title?: string | undefined,
    description?: string | undefined,
    default?: any | undefined
  }

  export interface IObjectProperties {
    [field: string]: ISchema
  }

  export interface IObjectSchema extends ISchema {
    properties: IObjectProperties,
  }

  export interface IArraySchema extends ISchema {
    items: IObjectSchema | IArraySchema
  }

  export type AnySchema = ISchema | IObjectSchema | IArraySchema
  export interface IReactoryFormQueryErrorHandlerDefinition {
    componentRef: string,
    method: string
  }

  export interface IReactoryEvent {
    name: string,
    data?: any | undefined,
    dataMap?: any | undefined,
    spreadProps?: boolean
  }


  export interface IReactoryFormQuery {
    name: string,
    text: string,
    resultMap?: Object,
    queryMessage?: string,
    variables: Object,
    formData?: any,
    edit?: boolean,
    new?: boolean,
    delete?: boolean,
    options?: any,
    autoQuery?: boolean,
    autoQueryDelay?: number,
    waitUntil?: string,
    interval?: number,
    waitTimeout?: number,
    useWebsocket?: boolean,
    onError?: IReactoryFormQueryErrorHandlerDefinition,
    resultType?: string,
    //used where want to extract a single element from an object
    resultKey?: string,
    refreshEvents?: IReactoryEvent[]
  }

  export interface IReactoryFormMutation {
    name: string,
    text: string,
    objectMap: boolean,
    updateMessage?: string,
    resultMap?: Object,
    resultType?: string,
    variables?: Object,
    formData?: Object,
    onSuccessMethod?: string | "redirect" | "notification" | "function",
    onSuccessEvent?: IReactoryEvent | undefined,
    refreshEvents?: IReactoryEvent[] | undefined
    onSuccessUrl?: string,
    onSuccessRedirectTimeout?: number,
    onError?: IReactoryFormQueryErrorHandlerDefinition,
    options?: any,
    notification?: any,
    handledBy?: string | 'onChange' | 'onSubmit'
  }

  export interface IReactoryFormMutations {
    new?: IReactoryFormMutation,
    edit?: IReactoryFormMutation,
    delete?: IReactoryFormMutation
  }

  export interface IFormGraphDefinition {
    query?: IReactoryFormQuery,
    queries?: {
      [key: string]: IReactoryFormQuery
    },
    mutation?: IReactoryFormMutations,
    //when true the  will be enabled.
    debug?: boolean
  }

  export interface IWidgetMap {
    component: string | any;
    componentFqn: string,
    widget: string
  }

  export interface IFieldMap {
    component: string | any;
    componentFqn: string,
    field: string
  }

  export interface IObjectMap {
    [key: string]: string | Array<any> | object
  }

  export interface IReactoryPdfReport extends Client.IFramedWindowProperties {
    title?: string,
    report: string,
    folder: string,
    icon?: string,
    reportTitle?: string,
    waitingText?: string,
    dataMap?: IObjectMap
  }



  export interface IExcelColumnDefinition {
    title: string
    propertyField: string
    format: string
    type: string
    width?: number,
    key?: string,
    required: boolean,
    style?: any
  }

  export interface IExcelSheet {
    name: string
    index: number
    arrayField: string
    startRow: number
    columns: IExcelColumnDefinition[]
  }

  export interface IExcelExportOptions {
    filename: string
    sheets: IExcelSheet[]
  }

  export interface IExport extends Client.IFramedWindowProperties {
    title?: string
    engine?: string
    useClient?: boolean
    mappingType?: string
    mapping?: any
    icon?: string
    exportOptions?: any | IExcelExportOptions
    disabled?: string
  }

  export interface IUISchemaMenuItem {
    id: string,
    title: string,
    key: string,
    description: string,
    icon: string,
    uiSchema: any,
    //used to override the graphql definitions for that view type
    graphql?: IFormGraphDefinition,
    modes?: string
    sizes?: string
    minWidth?: number
  }

  export interface IReactoryComponentDefinition {
    fqn?: string,
    dependencies?: IReactoryComponentDefinition[]
    props?: any,
    propsMap?: any,
    componentType: string | "component" | "object" | "function" | "module" | "plugin"
  }



  export interface IEventBubbleAction {
    eventName: string,
    action: string | "bubble" | "swallow" | "function",
    functionFqn?: string,
  }
  export interface IReactoryForm {
    id: string,
    uiFramework: string,
    uiSupport: string[],
    uiResources?: any[],
    title: string,
    tags?: string[],
    helpTopics?: string[]
    schema: ISchema | IObjectSchema | IArraySchema,
    sanitizeSchema?: ISchema | IObjectSchema | IArraySchema,
    uiSchema?: any,
    uiSchemas?: IUISchemaMenuItem[],
    defaultUiSchemaKey?: string
    registerAsComponent: boolean,
    nameSpace: string,
    name: string,
    description?: string,
    version: string,
    roles?: string[],
    components?: string[],
    graphql?: IFormGraphDefinition,
    defaultFormValue?: any,
    defaultPdfReport?: IReactoryPdfReport,
    defaultExport?: IExport,
    reports?: IReactoryPdfReport[],
    exports?: IExport[],
    refresh?: any,
    widgetMap?: IWidgetMap[],
    fieldMap?: IFieldMap[];
    backButton?: Boolean,
    workflow?: Object,
    noHtml5Validate?: boolean,
    formContext?: any,
    fields?: any,
    widgets?: any,
    wrap?: boolean,
    eventBubbles?: IEventBubbleAction[],

    FieldTemplate?: Function,
    ObjectFieldTemplate?: Function,
    /**
     * components to mount in the componentDef propertie
     */
    componentDefs?: string[]
    /**
     * object map to use for mapping querystring
     */
    queryStringMap?: any,

    /**
     * Array of dependencies this form or it's children 
     * may relay on in order to successfully load.
     */
    dependencies?: IReactoryComponentDefinition[]
  }

  export interface IGraphShape {
    Query: Object,
    Mutation: Object,
  }

  export interface IGraphDefinitions {
    Resolvers: IGraphShape
    Types: string[]
  }

  export interface IWorkflow {
    id: string
    nameSpace: string
    name: string
    version: string
    component: any
    category: string,
    autoStart?: boolean
    props?: any
  }

  export interface IReactoryModule {
    nameSpace: string
    name: string
    version: string
    dependencies?: string[]
    priority: number,
    graphDefinitions?: IGraphDefinitions,
    workflows?: IWorkflow[],
    forms?: IReactoryForm[],
    services?: IReactoryServiceDefinition[],
  }

  export interface IReactoryServiceResult<T> {
    data?: T,
    errors?: Error[],
  }

  export interface IReactoryResultService<T> {
    (props: any, context: any): IReactoryServiceResult<T>;
  }

  export interface IReactoryServiceDefinition {
    id: string
    name: string
    description: string
    isAsync?: boolean
    service: Function,
    serviceType?: string
    dependencies?: string[]
  }

  export namespace Service {

  }

  export interface IPagingRequest {
    page: number
    pageSize: number
  }

  export interface IPagingResult {
    total: number
    page: number
    hasNext: boolean
    pageSize: number
  }

  export interface IPagedResponse<T> {
    paging: IPagingResult,
    items: T[]
    [key: string]: any
  }

  export interface IReactoryContext {
    user: Reactory.IUser
    partner: Reactory.IPartner
  }

  /**
 * Data interface for reactory marker data
 */
  export interface IReactoryMarkerData {
    id: string,
    type: string | "existing" | "google",
    title: string,

    address?: any,
    place?: google.maps.places.PlaceResult,

    allow_move?: boolean,
    is_updating?: boolean,
    selected?: boolean,
    show_detail?: boolean,

    componentFqn?: string,
    componentProps?: any,
    propertyMap?: {
      [key: string]: string,
    },

    [property: string]: any
  };


  /**
 * Properties inferface for the ReactoryMarker component
 */
  export interface IReactoryMarkerProps {
    index?: number,
    reactory?: Reactory.Client.IReactoryApi,
    onAddressDeleted?: Function,
    onAddressEdited?: Function,
    onAddressSelected?: Function,
    classes?: any,
    marker: IReactoryMarkerData,
    onMarkerClicked?: (marker: IReactoryMarkerData, index: number) => void,
    onToggleShowDetail?: () => void,
    [property: string]: any;
  };


  export interface IReactoryCustomWindowProps {
    reactory?: Reactory.Client.IReactoryApi,
    marker: IReactoryMarkerData,
    classes?: any,
    new_address_form?: string,

    onAddressSelected?: Function,
    onAddressDeleted?: Function,
    onAddressEdited?: Function,

    onClose?: Function,

    [property: string]: any;
  };

  export interface IAddressListProps {
    /**
     * Array of address items.
     * Object needs to have a title, lat & lng and type
     */
    items: Reactory.IReactoryMarkerData[],
    primaryTextField: string | Function,
    secondaryTextField: string | Function,
    avatarField?: string | Function,
    map?: google.maps.Map,
    show_avatar?: boolean,
    multiSelect?: boolean,
    onSelectionChanged?: (items: any[]) => void,
    onListItemClicked?: (item: Reactory.IReactoryMarkerData, index) => void,
    onListItemSelected?: (item: Reactory.IReactoryMarkerData, index) => void,
    [key: string]: any
  }

  export interface IReactoryMapOnChangeEvent {
    target: GoogleMap,
    value: IReactoryMarkerData,
    change: string | "add" | "edit" | "delete" | "hide" | "detail" | "select" | "zoom",
    index?: number,
    markers?: IReactoryMarkerData[]
  }
  export interface IReactoryMapProps {
    reactory?: Reactory.Client.IReactoryApi,
    searchTerm: string,
    onChange: (evt: IReactoryMapOnChangeEvent) => void
    [key: string]: any
  }


}

export default Reactory;