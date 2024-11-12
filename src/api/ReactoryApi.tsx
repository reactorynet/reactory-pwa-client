import React from "react";
import i18next, { i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ReactDOM from 'react-dom';
import PropTypes from "prop-types";
import EventEmitter from 'eventemitter3';
import inspector from 'schema-inspector';
import { v4 as uuid } from 'uuid';
import classNames from 'classnames';
import { NavigateFunction, BrowserRouter as Router, } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ApolloClient, gql, ApolloProvider, NormalizedCacheObject, Resolvers, MutationOptions, ApolloQueryResult, QueryResult, RefetchQueriesOptions, MutationResult, FetchResult, ApolloError, ServerError } from '@apollo/client';
import localForage from 'localforage';
import { CssBaseline } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/styles';
import lodash, { intersection, isArray, isEmpty, isNil, template, LoDashWrapper, LoDashStatic, TemplateExecutor, TemplateOptions } from 'lodash';
import moment from 'moment';
import objectMapper from 'object-mapper';
import {
  attachComponent,
  getAvatar,
  getOrganizationLogo,
  getUserFullName,
  ThemeResource,
  injectResources,
  omitDeep,
  makeSlug,
  deepEquals,
  CDNResource,
  isEmail,
  isValidPassword,
  nil,
  nilStr,
} from '../components/util';

import amq from '../amq';
import * as RestApi from './RestApi';
import GraphQL from '@reactory/client-core/api/graphql';
import { Theme, Typography } from "@mui/material";
import icons from '../assets/icons';
import * as queryString from '../components/utility/query-string';
import humanNumber from 'human-number';
import humanDate from 'human-date';
import { withReactory, ReactoryProvider } from './ApiProvider';
import { ReactoryLoggedInUser, anonUser, storageKeys } from './local';
import ReactoryApolloClient from './ReactoryApolloClient';
import Reactory from '@reactory/reactory-core';
import { compose } from "redux";
import { ApiStatus as ApiStatusQueryFactory } from './graphql/graph/queries';
import { ApiStatusQueryScope } from "./graphql/graph/queries/ApiStatus";
import { ReactoryResourceLoader } from "./ReactoryResourceLoader";
import { ReactoryPluginLoader } from './ReactoryPluginLoader';

const {
  REACTORY_APPLICATION_ANONUSER_EMAIL = 'anonymous@reactory.local',
  REACTORY_APPLICATION_ANONUSER_PASSWORD = 'anonymous-password',
} = process.env;

const pluginDefinitionValid = (definition) => {
  const pass = {
    nameSpace: false,
    name: false,
    component: false,
    version: false
  };

  if (isNil(definition) === true) return false;

  Object.keys(definition).forEach((property) => {
    pass[property] = isNil(definition[property]) === false;
  });

  return pass.nameSpace && pass.name && pass.component && pass.version;
};


export const ReactoryApiEventNames = {
  onLogout: 'loggedOut',
  onLogin: 'loggedIn',
  onPluginLoaded: 'onPluginLoaded',
  onApiStatusUpdate: 'onApiStatusUpdate',
  onRouteChanged: 'onRouteChanged',
  onShowNotification: 'onShowNotification',
  onThemeChanged: 'onThemeChanged',
  onHideMenu: 'onHideMenu',
  onShowMenu: 'onShowMenu',
  onComponentRegistered: 'onComponentRegistered',
};

export const EmptyComponent = (fqn) => {
  return (<Typography>No Component For Fqn: {fqn}</Typography>)
};

const componentFqn = ({ nameSpace, name, version }) => {
  return `${nameSpace}.${name}@${version}`;
};

export const reactoryDomNode = () => {
  const domNode = document.createElement("div");
  domNode.setAttribute('reactory', 'generated')
  domNode.id = `reactory_modal_widget_${uuid().replace("-", "_")}`;
  return domNode;
}
/**
 * This function allows you to pass in a templated object definition.
 * The function iterates over every propery of the object and then
 * checks the value of that property.
 *
 * If the property is a string, we check for a template pattern ${...}
 * and then parse the template against the input propety bag data.
 * @param templateObject
 * @param props
 */
export function parseTemplateObject(templateObject: Object, props: any): any {

  if (templateObject === null || templateObject === undefined) return null;

  let _$ret: any = {};

  Object.keys(templateObject).forEach((ep) => {
    let toep = typeof templateObject[ep];
    switch (toep) {
      case "string": {
        if (templateObject[ep].indexOf("${") >= 0) {
          _$ret[ep] = template(templateObject[ep])(props);
        } else {
          _$ret[ep] = templateObject[ep];
        }
        break;
      }
      case "object": {
        _$ret[ep] = parseTemplateObject(templateObject[ep], props);
        break;
      }
      default: {
        _$ret[ep] = templateObject[ep];
      }
    }
  });

  return _$ret;
}


export const componentPartsFromFqn = (fqn: string) => {
  if (typeof fqn === 'string' && fqn.length > 0) {
    if (fqn.indexOf('.') >= 1) {
      let _fqn = fqn;
      const atpos = fqn.indexOf('@');
      const componentMeta = {
        nameSpace: '',
        name: '',
        version: '',
      };

      if (atpos >= 3) {
        //shortest possible compnonent name a.b@1
        const versionParts = fqn.split('@')
        componentMeta.version = versionParts[1];
        _fqn = versionParts[0];
      }

      const nameParts = _fqn.split('.')

      if (nameParts.length === 2) {
        componentMeta.nameSpace = nameParts[0];
        componentMeta.name = nameParts[1];
      }

      if (nameParts.length === 1) {
        componentMeta.nameSpace = '__runtime__';
        componentMeta.name = nameParts[0];
      }

      if (nameParts.length > 2) {
        componentMeta.name = nameParts[nameParts.length];
        for (let p: number = 0; p < nameParts.length - 1; p += 1) {
          if (p === nameParts.length - 1) {
            componentMeta.nameSpace += nameParts[p]
          } else {
            componentMeta.nameSpace += `${nameParts[p]}.`
          }
        }
      }


      return componentMeta;

    }
  }
  throw new Error('Component FQN not valid, must have at least nameSpace.name with version being options i.e. nameSpace.name@version')
}


export interface WindowSizeSpec {
  innerHeight: number,
  innerWidth: number,
  outerHeight: number,
  outerWidth: number,
  view: string,
  resolution: {
    height: number,
    width: number,
  },
  ratio: number,
  size: string
}

interface ReactoryTheme extends Theme {
  [key: string]: any
}



const FORM_QUERY_SEGMENTS = {
  FORM_CORE_ELEMENTS: `
    id
    uiFramework
    uiSupport
    registerAsComponent
    title
    tags
    display
    name
    nameSpace
    description
    version
    className
    style
    helpTopics
    defaultUiSchemaKey
    defaultFormValue
    roles
  `,
  FORM_SCHEMAS: `
    schema
    uiSchema
    sanitizeSchema
    modules {
      id
      src
      url
      signed
      signature
      compiler
      compilerOptions
      roles
    }
    uiResources {
      id
      name
      type
      required
      expr
      uri
    }
    uiSchemas {
      id
      title
      key
      description
      icon
      graphql {
        query
        mutation
        queries
        clientResolvers
      }
      uiSchema
      modes
    }
    graphql {
      query
      mutation
      queries
      clientResolvers
    }
  `,
  ADDITIONAL: `
    components  
    defaultPdfReport
    defaultExport
    exports
    reports    
    refresh
    widgetMap {
      componentFqn
      component
      widget
    }
    backButton
    workflow
    noHtml5Validate
    formContext
    eventBubbles {
      eventName
      action
      functionFqn
    }
    componentDefs
    queryStringMap
    dependencies {
      fqn
      props
      propsMap
      componentType
    }
  `
}

class ReactoryApi extends EventEmitter implements Reactory.Client.IReactoryApi {
  [key: string]: unknown;
  $windowSize: Reactory.Client.IWindowSizeSpec = null;
  $user: any;
  history: any;
  params: any;
  queries: any;
  mutations: any;
  props: Object;
  componentRegister: Reactory.Client.IReactoryComponentRegister;
  //@ts-ignore
  client: ApolloClient<NormalizedCacheObject>;
  login: (username: string, password: string) => Promise<Reactory.Client.ILoginResult>;
  log: (message: string, params?: unknown) => void;
  debug: (message: string, params?: unknown) => void;
  warning: (message: string, params?: unknown) => void;
  error: (message: string, params?: unknown) => void;
  info: (message: string, params?: unknown) => void;
  register: (username: string, password: string) => void;
  reset: (email: string, password: string) => void;
  forgot: (email: string) => void;
  utils: Reactory.Client.IReactoryApiUtils;
  companyWithId: (id: string) => Promise<Reactory.Models.IOrganization>;
  $func: { [key: string]: (kwargs: unknown[]) => unknown; };
  rest: Object = null;
  tokenValidated: boolean = false;
  lastValidation: number;
  tokenValid: boolean = false;
  getAvatar: (profile: Reactory.Models.IUser, alt?: string) => string;
  getOrganizationLogo: (organizationId: string, file: string) => string;
  getUserFullName: (user: Reactory.Models.IUser) => string;
  getThemeResource: (path?: string) => string;
  getCDNResource: (path: string) => string;
  CDN_ROOT: string = process.env.REACT_APP_CDN || 'http://localhost:4000/cdn';
  API_ROOT: string = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:4000';
  CLIENT_KEY: string = process.env.REACT_APP_CLIENT_KEY;
  CLIENT_PWD: string = process.env.REACT_APP_CLIENT_PASSWORD;
  formSchemas: Reactory.Forms.IReactoryForm[]
  /**
   * This is a map of form schemas that have been loaded from the server
   */
  formSchemaMap: {
    [key: string]: { 
      form: Reactory.Forms.IReactoryForm,
      lastFetch: Date,
      hash: number,
      index: number,
    }
  }
  formValidationMaps: any;
  formTranslationMaps: any;
  formSchemaLastFetch: Date = null;
  assets: {
    logo: string;
    avatar: string;
    icons: {
      16: string;
      32: string;
      44: string;
      64: string;
      144: string;
      192: string;
      512: string;
    };
  } = null;
  amq: any = null;
  statistics: any = null;
  __form_instances: any = null;
  flushIntervalTimer: any = null;
  __REACTORYAPI: boolean = true;
  publishingStats: boolean;
  reduxStore: any;
  muiTheme: any;
  queryObject: any;
  queryString: any;
  objectToQueryString: (obj: unknown) => string;
  clearCache: () => void;
  ws_link: any;
  $development_mode: boolean = false;
  __uuid: string;
  React: typeof React;
  i18n: i18n = i18next;
  navigation: NavigateFunction;
  location: any;
  constructor(props) {
    super();

    this.history = null;
    this.props = props;
    this.componentRegister = {
      "core.ReactoryResourceLoader@1.0.0": {
        component: ReactoryResourceLoader,
        nameSpace: 'core',
        name: 'ReactoryResourceLoader',
        version: '1.0.0',
        description: 'Default Reactory Resource Loader',
        componentType: 'function',
        roles: ['ADMIN', 'USER', 'ANON'],
        tags: ['core', 'resource', 'loader'],
        title: 'Reactory Resource Loader',
      },
      "core.ReactoryPluginLoader@1.0.0": {
        component: ReactoryPluginLoader,
        nameSpace: 'core',
        name: 'ReactoryPluginLoader',
        version: '1.0.0',
        description: 'Default Reactory Plugin Loader',
        componentType: 'function',
        roles: ['ADMIN', 'USER', 'ANON'],
        tags: ['core', 'plugin', 'loader'],
        title: 'Reactory Plugin Loader',
      }
    };
    this.queries = GraphQL.queries;
    this.mutations = GraphQL.mutations;
    this.login = RestApi.login.bind(this);
    this.companyWithId = RestApi.companyWithId;
    this.register = RestApi.register;
    this.reset = RestApi.reset;
    this.forgot = RestApi.forgot;
    this.forms = this.forms.bind(this);
    this.form = this.form.bind(this);
    this.React = React;

    this.utils = {
      omitDeep,
      queryString,
      hashCode: (inputString: string) => {
        let i = 0;
        let h = 0;
        for (i < inputString.length; i += 1;) {
          h = Math.imul(31, h) + inputString.charCodeAt(i) | 0;
          return h;
        }
      },
      injectResources,
      componentFqn,
      componentPartsFromFqn,
      //componentDefinitionFromFqn,
      pluginDefinitionValid,
      nil,
      nilStr,
      lodash,
      moment,
      objectMapper,
      template,
      humanNumber,
      inspector,
      gql,
      humanDate,
      slugify: makeSlug,
      deepEquals,
      templateObject: parseTemplateObject,
      classNames,
      uuid,
      collectData: (forms: any[], shape: any) => {
        let data = forms.map((reactoryForm) => {
          if (reactoryForm.formRef && reactoryForm.formRef.current) {
            return reactoryForm.formRef.current.state.formData
          }
        });

        if (shape) return objectMapper(data, shape);
        return data;
      },
      localForage,
      isEmail,
      isValidPassword
    };
    this.$func = {
      'core.NullFunction': (params) => {
        this.log('An extension function was not found', [params]);;
        return 0;
      }
    };
    this.registerFunction = this.registerFunction.bind(this);
    this.rest = {
      json: {
        get: RestApi.getRemoteJson,
        post: RestApi.postRemoteJson,
      },
      text: {
        get: RestApi.getContent
      }
    };
    this.tokenValidated = false;
    this.tokenValid = null;
    this.lastValidation = null;
    this.validateToken = this.validateToken.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.logout = this.logout.bind(this);
    this.setUser = this.setUser.bind(this);
    this.afterLogin = this.afterLogin.bind(this);
    this.registerComponent = this.registerComponent.bind(this);
    this.getComponent = this.getComponent.bind(this);
    this.mountComponent = this.mountComponent.bind(this);
    this.showModalWithComponent = this.showModalWithComponent.bind(this);
    this.getComponents = this.getComponents.bind(this);
    this.getGlobalComponents = this.getGlobalComponents.bind(this);
    this.status = this.status.bind(this);
    this.getAvatar = getAvatar;
    this.getOrganizationLogo = getOrganizationLogo;
    this.getUserFullName = getUserFullName;
    this.getTheme = this.getTheme.bind(this);
    this.getRoutes = this.getRoutes.bind(this);
    this.getNotFoundComponent = this.getNotFoundComponent.bind(this);
    this.isAnon = this.isAnon.bind(this);
    this.raiseFormCommand = this.raiseFormCommand.bind(this);
    this.onFormCommandEvent = this.onFormCommandEvent.bind(this);
    this.startWorkFlow = this.startWorkFlow.bind(this);
    this.CDN_ROOT = process.env.REACT_APP_CDN || 'http://localhost:4000/cdn';
    this.API_ROOT = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:4000';
    this.CLIENT_KEY = process.env.REACT_APP_CLIENT_KEY;
    this.CLIENT_PWD = process.env.REACT_APP_CLIENT_PASSWORD;
    this.formSchemas = [];
    this.formSchemaMap = {};
    this.formValidationMaps = {};
    this.formTranslationMaps = {};
    this.formSchemaLastFetch = null;
    this.amq = amq;
    this.loadComponentWithFQN = this.loadComponentWithFQN.bind(this);
    this.loadComponent = this.loadComponent.bind(this);
    this.renderForm = this.renderForm.bind(this);
    this.graphqlMutation = this.graphqlMutation.bind(this);
    this.graphqlQuery = this.graphqlQuery.bind(this);
    this.getLastUserEmail = this.getLastUserEmail.bind(this);
    this.setLastUserEmail = this.setLastUserEmail.bind(this);
    this.saveUserLoginCredentials = this.saveUserLoginCredentials.bind(this);
    this.getUserLoginCredentials = this.getUserLoginCredentials.bind(this);
    this.setAuthToken = this.setAuthToken.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
    this.assets = {
      logo: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/logo.png`,
      avatar: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/avatar.png`,
      icons: {
        16: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-16.png`,
        32: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-32.png`,
        44: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-44.png`,
        64: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-64.png`,
        144: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-144.png`,
        192: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-192.png`,
        512: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-512.png`,
      }
    };
    this.log = window.reactory.logging.log ? console.log.bind(window.console) : () => { };
    this.debug = window.reactory.logging.debug ? console.debug.bind(window.console) : () => { };
    this.warning = window.reactory.logging.debug ? console.warn.bind(window.console) : () => { };
    this.error = window.reactory.logging.error ? console.error.bind(window.console) : () => { };
    this.info = window.reactory.logging.info ? console.info.bind(window.console) : () => { };
    this.stat = this.stat.bind(this);
    this.flushstats = this.flushstats.bind(this);
    this.publishstats = this.publishstats.bind(this);
    this.statistics = {
      __delta: 0,
      __keys: [],
      __lastFlush: null,
      __flushInterval: 5000,
      items: {}
    };
    this.__form_instances = {};
    this.trackFormInstance = this.trackFormInstance.bind(this);
    //bind internal queue listeners
    this.amq.onReactoryPluginEvent('loaded', (data) => {
      this.emit(ReactoryApiEventNames.onPluginLoaded, data);
    });
    this.flushIntervalTimer = setInterval(this.flushstats.bind(this, true), 5000);
    this.__REACTORYAPI = true;
    this.goto = this.goto.bind(this);
    this.createNotification = this.createNotification.bind(this);
    this.getThemeResource = ThemeResource;
    this.getCDNResource = CDNResource;
    this.getUser = this.getUser.bind(this);
    this.extendClientResolver = this.extendClientResolver.bind(this);
    this.setFormTranslationMaps = this.setFormTranslationMaps.bind(this);
    this.setFormValidationMaps = this.setFormValidationMaps.bind(this);
    this.clearStoreAndCache = this.clearStoreAndCache.bind(this);
    this.init = this.init.bind(this);
    this.getSizeSpec = this.getSizeSpec.bind(this);
    this.getThemeMode = this.getThemeMode.bind(this);
    this.isDevelopmentMode = this.isDevelopmentMode.bind(this);
    this.setDevelopmentMode = this.setDevelopmentMode.bind(this);
    this.hydrate = this.hydrate.bind(this);
    this.getApiStatus = this.getApiStatus.bind(this);
    this.__uuid = localStorage.getItem("$reactory_instance_id$");
    if (this.__uuid === null) {
      this.__uuid = uuid();
      localStorage.setItem("$reactory_instance_id$", this.__uuid);
    }
    this.on(ReactoryApiEventNames.onApiStatusUpdate, this.loadPlugins.bind(this));
    this.on(ReactoryApiEventNames.onApiStatusUpdate, this.forms.bind(this));
  }
  

  /**
   * Used to retrieve a anonymous JWT token for use in the application
   * when the user is not logged in, or when the user logs out.
   */
  private async getAnonToken() {
    const result = await this.login(REACTORY_APPLICATION_ANONUSER_EMAIL, REACTORY_APPLICATION_ANONUSER_PASSWORD);
    if (result && result.user.token) {
      this.setAuthToken(result.user.token);
    }
  }

  async init(): Promise<void> {
    const {
      client,
      ws_link,
      clearCache
    } = await ReactoryApolloClient();

    this.clearCache = clearCache;
    this.client = client;
    this.ws_link = ws_link;

    if (isNil(this.getAuthToken()) == true) {
      await this.getAnonToken();
    } else {
      try {
        await this.getApiStatus();
      } catch (error) {
        // this should be handled in the application
      }
    }
    await this.hydrate();
    await this.initi18n();
  }

  /**
   * hydrate function is called to load variables from local storage that we want to 
   * have set in the SDK between sessions.
   */
  async hydrate() {
    this.$development_mode = await localForage.getItem<boolean>(storageKeys.developmentMode).then();
  }

  /**
   * Initializes the i18n instance for the application
   */
  async initi18n() {
    const TRANSLATIONS = `
       query ReactoryTranslation($lang: String) {
        ReactoryTranslation(lang: $lang) {
          id
          i18n {
            id
            ns
            translations
          }          
        }
      }
    `;

    const { data, error }: QueryResult = await this.graphqlQuery(TRANSLATIONS, {}).then()

    let $resources: any = {};
    if (data && data.ReactoryTranslation) {
      const { i18n, id } = data.ReactoryTranslation;
      if (i18n && lodash.isArray(i18n) === true) {
        $resources[id] = {};
        i18n.forEach((e) => {
          if (e && e.translations && e.ns) {
            if (!$resources[id][e.ns] && e.translations) {
              $resources[id][e.ns] = { ...e.translations };
            }
          }
        });
      }

      await i18next
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
          debug: true,
          lng: id,
          fallbackLng: 'en-US',
          interpolation: {
            escapeValue: false
          },
          resources: $resources
        }).then();

      this.i18n = i18next;
    }
  }

  clearStoreAndCache() {
    if (this.client) this.client.resetStore();
    if (this.clearCache) this.clearCache();
  }

  getThemeMode() {
    return localStorage.getItem("$reactory$theme_mode") || "light";
  }

  getSizeSpec() {
    let size = '??';

    const {
      innerHeight,
      outerHeight,
      innerWidth,
      outerWidth,
      screen
    } = window;

    const theme: ReactoryTheme = this.muiTheme;
    //theme.breakpoints.values.lg

    let view = 'landscape';

    if (window.innerHeight > window.innerWidth) {
      view = 'portrait';
    }

    let size_spec: any = {
      innerHeight,
      innerWidth,
      outerHeight,
      outerWidth,
      resolution: {
        width: screen.width * window.devicePixelRatio,
        height: screen.height * window.devicePixelRatio
      },
      ratio: window.devicePixelRatio,
      view,
      size
    }

    let _breakpoints = { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 }


    if (theme && theme.breakpoints) {
      _breakpoints = theme.breakpoints.values;
    }

    if (innerWidth >= _breakpoints.xl) size = 'xl';
    if (innerWidth < _breakpoints.xl && innerWidth >= _breakpoints.lg) size = 'lg';
    if (innerWidth < _breakpoints.lg && innerWidth >= _breakpoints.md) size = 'md';
    if (innerWidth < _breakpoints.md && innerWidth >= _breakpoints.sm) size = 'sm';
    if (innerWidth < _breakpoints.sm && innerWidth >= _breakpoints.xs) size = 'xs';

    size_spec.size = size;
    return size_spec;
  };

  setFormTranslationMaps(maps: any) {
    this.formTranslationMaps = { ...this.formTranslationMaps, ...maps };
  }

  setFormValidationMaps(maps: any) {
    this.formValidationMaps = { ...this.formValidationMaps, ...maps };
  }

  extendClientResolver(resolvers: Resolvers) {
    const { client } = this;
    if (client && resolvers) {
      client.addResolvers(resolvers);
    }
  }

  createNotification(title: string, options: NotificationOptions | any = {}) {
    const that = this;
    that.log('_____ CREATE NOTIFICATION ______', { title, options });
    let defaultNotificationProps = {
      title,
      type: options.type || "info",
      showInAppNotification: true,
      config: {
        canDismiss: true,
        timeOut: 2500,
      }
    }

    if (options.props) {
      defaultNotificationProps.config = { ...defaultNotificationProps.config, ...options?.config }
    }

    if (options.showInAppNotification !== false) {
      that.emit(ReactoryApiEventNames.onShowNotification, { title: title, type: options.type, config: { ...options.config, ...options.props } });
      return;
    }

    const defaultNotificationProperties = {
      title: 'Reactory Notification',
      body: 'Reactory Notification Body',
      icon: `${ThemeResource('images/favicon.ico')}`,
      via: 'NotificationApi',
    };

    const checkNotificationPromise = () => {
      try {
        Notification.requestPermission().then();
      } catch (e) {
        return false;
      }
      return true;
    }

    const requestPermission = () => {
      if (checkNotificationPromise() === true) {
        Notification.requestPermission()
          .then((permission) => {
            if (permission === "granted") {
              that.createNotification(title, { ...defaultNotificationProperties, ...options, body: options.text || "" });
            }
          })
      } else {
        Notification.requestPermission(function (permission) {
          if (permission === "granted") {
            that.createNotification(title, { ...defaultNotificationProperties, ...options, body: options.text || "" });
          }
        });
      }
    };

    if (window && window.Notification) {

      switch (Notification.permission) {
        case "denied": {
          //denied notificaitons, use fallback
          // this.amq.raiseFormCommand("reactory.core.display.notification",
          //   {
          //     title: title,
          //     options: {
          //       ...defaultNotificationProperties,
          //       ...options
          //     }
          //   });
          // return;
          that.emit(ReactoryApiEventNames.onShowNotification, { title: title, type: options.type, config: options.props });
          return;
        }
        case "granted": {
          let notification = new Notification(title, { ...defaultNotificationProperties, ...options, body: options.text });
          setTimeout(notification.close.bind(notification), 4000);
          return;
        }
        case "default":
        default: {
          requestPermission();
        }
      }
    } else {
      this.log('Notification API not supported in this browser', { ...defaultNotificationProperties, ...options });;
    }

  }

  goto(where = "/", state = { __t: new Date().valueOf() }) {
    // redirect the user to the specified location
    window.location.href = where;
  }

  registerFunction(fqn, functionReference, requiresApi = false, signature = '< signature-not-set />') {
    this.log(`${signature} Registering function ${fqn}`, [functionReference, requiresApi]);
    if (typeof functionReference === 'function') {
      if (requiresApi === true) {
        this.$func[fqn] = (props) => {
          return functionReference({ ...props, api: this, reactory: this });
        };
      } else {
        this.$func[fqn] = functionReference;
      }
    }
  };

  publishstats() {
    this.publishingStats = true;
    if (this.statistics.__delta > 0) {
      this.log(`Flushing Collected Statistics (${this.statistics.__delta}) deltas across (${this.statistics.__keys.length}) keys`, []);
      const entries = this.statistics.__keys.map(key => ({ key, stat: this.statistics.items[key] }));
      this.graphqlMutation(gql`mutation PublishStatistics($entries: [StatisticsInput]!){
                CorePublishStatistics(entries: $entries) {
                  id
                  reference
                  createdAt
                }
            }`, {
        entries
      }).then((publishResult) => {
        this.statistics = {
          __delta: 0,
          __keys: [],
          __lastFlush: null,
          __flushInterval: this.statistics.__flushInterval,
          items: {}
        };
        this.log('Statistics published and flushed', [publishResult]);
        this.publishingStats = false;
      }).catch((error) => {
        this.log(error.message, error);
        this.publishingStats = false;
      });
    }
  }

  flushstats(save) {
    if (save === true) {
      this.publishstats();
    } else {
      this.statistics = {
        __delta: 0,
        __keys: [],
        __lastflush: null,
        __flushinterval: this.statistics.__flushinterval,
        items: {}
      };
    }
  };

  stat(key, statistic) {

    try {
      if (this.statistics && this.statistics.items && this.statistics.items[key]) {
        this.statistics.items[key] = { ...this.statistics.items[key], ...statistic };
      } else {

        this.statistics.items[key] = statistic;
        this.statistics.__keys.push(key);
      }
      this.statistics.__delta += 1;
    } catch (statisticsCollectionError) {
      this.log(`Error capturing statistic`, { key, statistic, statisticsCollectionError });
    }

  };

  trackFormInstance(formInstance) {
    const self = this;
    self.log('ApiProvider.trackingFormInstance(formInstance)', [formInstance]);
    this.__form_instances[formInstance.instance_id] = formInstance;
    formInstance.on('componentWillUnmount', (instance) => {
      self.log('ApiProvider.trackingFormInstance(formInstance).on("componentWillUnmount")', [formInstance]);
      delete self.__form_instances[formInstance.state._instance_id];
    });
  }

  graphqlMutation<T, V>(mutation,
    variables: V,
    options: any = { fetchPolicy: "no-cache", refresh: false },
    refetchQueries = []): Promise<FetchResult<T>> {
    const that = this;
    let $mutation = null;
    if (typeof mutation === 'string') {
      try {
        $mutation = gql(mutation);
      } catch (gqlError) {
        that.log(`Error occurred while creating the mutation document from input`, { mutation });
      }
    } else $mutation = mutation;

    return new Promise((resolve, reject) => {
      let mutation_options: MutationOptions<any, any> = { mutation: $mutation, variables };
      mutation_options.refetchQueries = refetchQueries;
      that.client.mutate<T>(mutation_options).then((result) => {
        resolve(result);
      }).catch((clientErr) => {
        that.log(`Error occured executing the mutation: ${clientErr.message}`, { $mutation, clientErr });
        reject(clientErr);
      });
    });
  }

  async graphqlQuery<T, V>(query,
    variables: V,
    options: any = { fetchPolicy: 'network-only' },
    queryDefinition: Reactory.Forms.IReactoryFormQuery = null): Promise<ApolloQueryResult<T>> {
    const that = this;
    let $query = null;
    if (typeof query === 'string') {
      try {
        $query = gql(query);
      } catch (gqlError) {
        that.log(`Error occurred while creating the query document from input`, { query, gqlError });
        that.createNotification('🚨 GRAPHQL ERROR IN QUERY CHECK LOG FOR DETAILS - Test the query in the Developer tools', { type: 'warning', canDismiss: true, timeout: 4000, showInAppNotification: true });
      }
    } else $query = query;

    const result = await that.client.query<T, V>({
      query: $query,
      variables,
      fetchPolicy: navigator.onLine === true ? options.fetchPolicy : 'cache-only',
    });
    const { errors = [] } = result;
    if (errors.length > 0) {
      errors.forEach((error) => {
        if (error) {
          const { extensions } = error;
          if (extensions) {
            const { code } = extensions;
            if (code === 'INTERNAL_SERVER_ERROR') {
              //we know for certain the server had an unhandled error in the resolver chain.
              //the client may not cater for these errors, so we can by default warn the user
              //that the server reported an error - we should log and report the error
              //to the server side error reporting and tracing.
              that.error(`🚨 Server reported an internal error. This is should not occur, all errors need to be gracefully handled, with support info`, { error, variables, options, query, queryDefinition });              
            }
          }
        }
      });
    }
    return result;
  }

  async afterLogin(loginResult: Reactory.Client.ILoginResult): Promise<Reactory.Models.IApiStatus> {
    this.setAuthToken(loginResult.user.token);
    const { client, ws_link, clearCache } = await ReactoryApolloClient();
    this.client = client;
    this.clearCache = clearCache;
    return this.status({ emitLogin: true, forceLogout: true });
  }

  loadComponent(Component, props, target) {
    if (!Component)
      Component = () => (<p>No Component Specified</p>);
    attachComponent(Component, props, target);
  }

  loadComponentWithFQN(fqn, props, target) {
    let Component = this.getComponent(fqn);
    this.loadComponent(Component, props, target);
  }

  renderForm(componentView, wrap: boolean = true) {
    const that = this;

    // if wrap is false, we will not wrap the component in the
    // we just return the component view.
    if (wrap === false) return (<React.Fragment>{componentView}</React.Fragment>)

    return (<React.Fragment>
      <CssBaseline />
      <Provider store={that.reduxStore}>
        <ApolloProvider client={that.client}>
          <MuiThemeProvider theme={that.muiTheme}>
            <Router>
              <ReactoryProvider reactory={that}>
                {componentView}
              </ReactoryProvider>
            </Router>
          </MuiThemeProvider>
        </ApolloProvider>
      </Provider>
    </React.Fragment>);
  }


  /**
   * Function call to render a reactory form component.
   * @param form 
   */
  reactoryForm(form: Reactory.Forms.IReactoryForm): React.ReactElement {
    const ReactoryFormComponent = this.getComponent('core.ReactoryForm') as React.FunctionComponent<Reactory.Client.IReactoryFormProps<unknown>>;
    return <ReactoryFormComponent formDef={form} />
  }

  /**
   * The forms function is executed when the application starts up and 
   * can be called from any component that has the reactory property injected
   * via the component registed..
   * @param bypassCache - if true it will always bypass the cache and and fetch the latest list from 
   * the server.
   * @returns - Promise that contains the formSchemas for the user logged in user.
   */
  async forms(bypassCache: boolean = false): Promise<Reactory.Forms.IReactoryForm[]> {
    const that = this;
    const { debug } = this;
    const refresh = async () => {

      const FORMS_QUERY = `
      query ReactoryForms {
        ReactoryForms {
          ${FORM_QUERY_SEGMENTS.FORM_CORE_ELEMENTS}          
        }
      }
      `;

      const tempSchema: Partial<Reactory.Forms.IReactoryForm> = {
        schema: {
          type: 'string',
          title: ''
        },
        uiSchema: {
          'ui:widget': 'HiddenWidget',
          'ui:options': {
            showSubmit: false,
            style: {
              display: 'none',
              height: '0px',
            }
          },
        },
      }

      const result = await that.graphqlQuery<{ ReactoryForms: Reactory.Forms.IReactoryForm[] }, any>(FORMS_QUERY, {}, { fetchPolicy: 'network-only' });
      const { errors = [], data = { ReactoryForms: [] } } = result;
      const { ReactoryForms } = data;

      if (errors.length > 0) {
        errors.forEach((err, erridx) => {
          debug(`GraphQL ReactoryForms result error #${erridx}`, { err });
        })
      }

      const ReactoryForm = that.getComponent('core.ReactoryForm') as React.FC<Reactory.Client.IReactoryFormProps<unknown>>;
      if (ReactoryForms && ReactoryForms.length > 0) {
        let modified: boolean = false;
        // that.formSchemas = [];
        ReactoryForms.forEach((formDef: Reactory.Forms.IReactoryForm, formDefIndex) => {    
          if (that.formSchemaMap[formDef.id]) {  
            const _hash = that.utils.hashCode(JSON.stringify(formDef));
            if (that.formSchemaMap[formDef.id].hash === _hash) {
              // continue to the next form
              // there is no change in the form structure, so we can skip
              return;
            } else {
              that.formSchemaMap[formDef.id] = { 
                form: formDef, 
                lastFetch: new Date(), 
                hash: _hash,
                index: that.formSchemaMap[formDef.id].index                 
              };
              modified = true;
            }
          }  else {
            const index = that.formSchemas.push(formDef);
            that.formSchemaMap[formDef.id] = { 
              form: formDef, 
              lastFetch: new Date(), 
              hash: that.utils.hashCode(JSON.stringify(formDef)),
              index: index - 1
            };
            modified = true;
          }  
          
          // A form must explicitly be set to false 
          // to not register as a component.
          if (formDef.registerAsComponent !== false && modified === true) {            
            const ReactoryComponent: React.FC<any> = (props: any) => {
              that.debug(`Rendering form ${formDef.id}`, { formDef, props });
              try {
                let $children = null;
                if (props.children) {
                  $children = props.children;
                  delete props.children;
                }
                const renderedCompnent = that.renderForm(
                  <ReactoryForm
                    formId={formDef.id}
                    key={`${formDefIndex}`}
                    formData={formDef.defaultFormValue || props.formData || props.data}
                    before={props.before}
                    {...props}                    
                  >{$children}
                  </ReactoryForm>, formDef.wrap === true);                
                if (renderedCompnent) {
                  return renderedCompnent;
                } else {
                  return <Typography>{formDef.id} returned empty</Typography>
                }
              } catch (error) {
                return <Typography>{formDef.id} returned an error</Typography>
              }
            };
            that.registerComponent(
              formDef.nameSpace,
              formDef.name,
              formDef.version,
              ReactoryComponent,
              formDef.tags,
              formDef.roles,
              true,
              [],
              'form');
          }
        });
        that.formSchemaLastFetch = new Date();
        return ReactoryForms;
      }
    };

    if (that.formSchemaLastFetch !== null && that.formSchemaLastFetch !== undefined && bypassCache === false) {
      if (moment(that.formSchemaLastFetch).add(5, 'minutes').isBefore(moment())) {
        await refresh();
      }
    } else { await refresh() };

    return that.formSchemas;
  }

  /**
   * Returns a form with the specific id.
   * 
   * Before calling this function ensure that the forms function has been called. Otherwise 
   * the function will throw and error.
   * @param id - string id.
   * @returns 
   */
  form(id: string, 
    onFormUpdated: (formDef: Reactory.Forms.IReactoryForm, error?: Error) => void = null,
    options?: any
  ) {
    const that = this;
    const { formSchemas = [] } = this;

    if (formSchemas.length === 0) {
      that.error('No forms have been loaded. Ensure the forms function is called before calling form(id)');
      throw new Error('No forms have been loaded. Ensure the forms function has been called before calling form(id)');
    }
      
    let $formDef = lodash.find(formSchemas, { id });

    if (!$formDef) return null;

    const FORM_QUERY = `
    query ReactoryFormGetById($id: String!, $options: Any) {
      ReactoryFormGetById(id: $id, options: $options) {
        ${FORM_QUERY_SEGMENTS.FORM_CORE_ELEMENTS}
        ${FORM_QUERY_SEGMENTS.FORM_SCHEMAS}        
        ${FORM_QUERY_SEGMENTS.ADDITIONAL}
      }
    }`;

    if (!$formDef.__complete__) {
      that.graphqlQuery<any, any>(FORM_QUERY, { id, options }, { fetchPolicy: 'network-only' }).then(({ data, errors = [] }) => {
        if (data && data.ReactoryFormGetById) {
          let index = lodash.findIndex(this.formSchemas, { id });

          that.formSchemas[index] = { ...data.ReactoryFormGetById, __complete__: true };

          if (onFormUpdated) {
            onFormUpdated(that.formSchemas[index], null);
          }

          that.emit(`onReactoryFormDefinitionUpdate::${id}`, that.formSchemas[index]);
        }
      }).catch((err) => {
        onFormUpdated(null, err);
        that.error('Could not get the form component data', { err })
      });
    }

    return $formDef;
  }

  async raiseFormCommand(commandId, commandDef, formProps) {
    const self = this;
    if (commandDef.action && commandDef.action === 'component') {
      const componentToMount = commandDef.component.componentFqn;
      const _formData = formProps.formData || formProps.formContext.formData;
      this.showModalWithComponentFqn(componentToMount, commandDef.title, { formData: _formData }, { open: true }, null, false, null);
    }

    if (commandDef.hasOwnProperty('graphql')) {
      if (commandDef.graphql.hasOwnProperty('mutation')) {

        let variables = {};
        if (commandDef.graphql.mutation.variables) {
          let data = formProps.formData || formProps.formContext.formData;
          variables = objectMapper(data, commandDef.graphql.mutation.variables);
        }
        if (commandDef.graphql.mutation.staticVariables) {
          variables = { ...commandDef.graphql.mutation.staticVariables, ...variables };
        }

        let mutationText = gql`${commandDef.graphql.mutation.text}`;
        let mutationResult = await this.graphqlMutation(mutationText, { ...variables }).then(result => {
          if (commandDef.graphql.mutation.onSuccessMethod && commandDef.graphql.mutation.onSuccessMethod == 'refresh') {
            self.log(`EXECUTING FORM REFRESH:: ${JSON.stringify(mutationResult)}`);
            formProps.formContext.refresh();
          }

          if (commandDef.graphql.mutation.onSuccessMethod && commandDef.graphql.mutation.onSuccessMethod == 'notification') {

            self.log(`______ MUTATION NOTIFICATION _______`);

            const resultMap = commandDef.graphql.mutation.resultMap || { '*': '*' };
            let notificationProperties = {
              ...(commandDef.graphql.mutation.notificationProperties || {}),
              ...(objectMapper(mutationResult, resultMap))
            };

            self.createNotification(notificationProperties.title || 'No Title', notificationProperties.options || {});
          }
        });

        return mutationResult;
      }

      // TODO IMPLEMENT QUERY

    }

    if (commandId.indexOf('workflow') === 0) {
      return await this.startWorkFlow(commandId, formProps);
    } else {
      this.amq.raiseFormCommand(commandId, formProps);
    }

  }

  startWorkFlow(workFlowId, data) {
    //this.amp.raiseWorkFlowEvent(workFlowId, data);
    const that = this;
    return new Promise((resolve, reject) => {
      that.client.query({
        query: that.mutations.System.startWorkflow,
        variables: { name: workFlowId, data },
        fetchPolicy: 'network-only'
      }).then((result) => {
        if (result.data.startWorkflow === true) {
          resolve(true);
        } else {
          resolve(false);
        }
      }).catch((clientErr) => {
        console.error('Error starting workflow', clientErr);
        resolve(anonUser);
      });
    });
  }

  onFormCommandEvent(commandId, func) {
    this.amq.onFormCommandEvent(commandId, func);
  }

  /**
   * Checks if there is an overlap between the item roles and the user roles. 
   * @param itemRoles - A string[] that represents the allowed roles for the item we want to check. 
   * @param userRoles - The user roles as a string[] that we are checking against.  When no roles are provided the logged in account roles are used.
   * @param organization - Provide a organization if the membership should be checked for a specific organization 
   * @param business_unit - Provide a businessUnit item if the membership should be check for access to a specific business unit
   * @param user_memberships - Provide a memberships[] array to check
   * @returns 
   */
  hasRole(itemRoles = [], userRoles = null, organization?: Reactory.Models.IOrganization, business_unit?: Reactory.Models.IBusinessUnit, user_memberships?: Reactory.Models.IMembership[]) {
    let comparedRoles = userRoles || [];
    const {
      debug,
    } = this;

    if (itemRoles.length === 1 && itemRoles[0] === '*')
      return true;

    if (userRoles === null) {
      const loggedInUser = this.getUser().loggedIn;

      if (organization === null || organization === undefined) {
        comparedRoles = loggedInUser?.roles;
      } else {
        //if there is a organization_id, we check if there is a membership that has the organization id
        let $memberships = user_memberships || loggedInUser?.memberships;
        if ($memberships && $memberships.length > 0) {
          const matched_memberships: Reactory.Models.IMembership[] = lodash.filter($memberships, (membership: Reactory.Models.IMembership) => {

            if (!membership.organization) return false;

            if (membership.organization.id === organization.id) {
              //if the business unit parameter is null, we only care about the organization role.
              //but if the membership we are checking against does have a business unit, we should
              //not use it as a comparable, so we only return true if the membership businessUnit is null.
              if ((business_unit === null || business_unit === undefined) && membership.businessUnit === null) return true;

              //we comapre the business units if there is one of either element
              //@ts-ignore
              if (business_unit && business_unit.id && membership.businessUnit && membership.businessUnit.id) {
                //@ts-ignore
                return business_unit.id === membership.businessUnit.id;
              }
              //not enough information for us to determine there is a match,
              //so return false.
              debug('hasRole() -> false|Not enough information to determine if the user has the role', { business_unit, membership });
              return false;
            }
          });

          if (matched_memberships.length > 0) {
            comparedRoles = [];
            matched_memberships.forEach((membership: Reactory.Models.IMembership) => {
              if (membership.roles) {
                comparedRoles.push(...membership.roles);
              }
            });
            //create a unique list of the roles.
            comparedRoles = lodash.uniq(comparedRoles);
          }
        }
      }
    }

    const result = intersection(itemRoles, comparedRoles);
    return result.length >= 1;
  }

  isAnon() {
    return this.hasRole(['ANON'], this.$user.roles) === true;
  }

  addRole(user, organization, role = 'USER') {
    return true;
  }

  removeRole(user, organization, role = 'USER') {
    return true;
  }

  getMenus() {
    const user = this.getUser();
    const { menus } = user;
    return menus || [];
  }

  getTheme(): Reactory.UX.IReactoryTheme {
    try {
      const user = this.getUser();
      const { activeTheme } = user;
      //add theme extension
      const extensions: any = {
        reactory: {
          icons
        }
      };
      return { ...(activeTheme as Reactory.UX.IReactoryTheme), extensions };
    } catch (error) {
      this.log(`Error getting theme for the logged in user: ${error.message}`, error);
      throw error;
    }

  }

  getRoutes() {
    const user = this.getUser();
    const { routes } = user;
    return routes || [];
  }

  getApplicationRoles(): string[] {
    const { roles } = this.getUser()?.loggedIn;
    return roles || [];
  }

  setUser(user) {
    this.$user = user;
    localStorage.setItem(storageKeys.LoggedInUser, JSON.stringify(user));
  }

  setAuthToken(token) {
    localStorage.setItem(storageKeys.AuthToken, token);
  }

  getAuthToken() {
    return localStorage.getItem(storageKeys.AuthToken);
  }

  setLastUserEmail(email) {
    localStorage.setItem(storageKeys.LastLoggedInEmail, email);
  }

  getLastUserEmail() {
    localStorage.getItem(storageKeys.LastLoggedInEmail);
  }


  private ensureVersion(fqn: Reactory.FQN): Reactory.FQN {
    return `${fqn.trim()}${fqn.indexOf('@') > 0 ? '' : '@1.0.0'}`;
  }

  registerComponent(
    nameSpace: string,
    name: string,
    version: string = '1.0.0',
    component: any = EmptyComponent,
    tags: string[] = [],
    roles: string[] = ['*'],
    wrapWithApi: boolean = false,
    connectors: any[] = [],
    componentType: string = 'component',
    errorBoundary: boolean = true) {
    const fqn = `${nameSpace}.${name}@${version}`;
    if (isEmpty(nameSpace))
      throw new Error(`nameSpace is required for component registration: ${fqn}`);
    if (isEmpty(name))
      throw new Error(`name is required for component registration: ${fqn}`);
    if (isNil(component))
      throw new Error(`component is required to register component: ${fqn}`);

    this.componentRegister[fqn] = {
      nameSpace,
      name,
      version,
      component,
      tags,
      roles,
      connectors,
      useReactory: wrapWithApi === true,
      useErrorBoundary: errorBoundary === true,
      componentType
    };
    this.emit(ReactoryApiEventNames.onComponentRegistered, { fqn, component: this.componentRegister[fqn] });
  }

  getComponentsByType(componentType: string = 'component'): Reactory.Client.IReactoryComponentRegister {
    let _components: Reactory.Client.IReactoryComponentRegister = {};
    Object.keys(this.componentRegister).forEach((fqn) => {
      if (this.componentRegister[fqn].componentType === componentType) {
        _components[fqn] = this.componentRegister[fqn];
      }
    });
    return _components;
  };

  getComponent<T>(fqn): T {
    if (fqn === undefined)
      throw new Error('NO NULL FQN');
    try {
      const found = this.componentRegister[this.ensureVersion(fqn)];
      if (found && found.component) {
        let ComponentToReturn = found.component as T;
        if (found.useReactory === true) {
          ComponentToReturn = compose(withReactory)(ComponentToReturn) as T;
        }
        return ComponentToReturn as T;
      }
      return null; //we must return null, because the component is not found, we cannot automatically return the not found component, that is the responsibility of the component
    } catch (err) {
      this.log(`Bad component name ${err.message}`, fqn);
      if (this.componentRegister && this.componentRegister['core.NotFound@1.0.0']) {
        return this.getNotFoundComponent() as T;
      }
    }
  }


  getComponents<TComponents>(componentFqns: Reactory.Client.ComponentDependency[] = []): TComponents {
    //@ts-ignore
    let componentMap: TComponents = {};
    const { 
      componentRegister, 
      log, 
      getNotFoundComponent,
      getNotAllowedComponent,
      hasRole 
    } = this;

    componentFqns.forEach(fqn => {
      let component = null;
      let $name: string = '';
      if (typeof fqn === 'string') {
        component = componentRegister[`${fqn.trim()}${fqn.indexOf('@') > 0 ? '' : '@1.0.0'}`];
        try {
          if (component) {
            const canUserCreateComponent = isArray(component.roles) === true ? this.hasRole(component.roles) : true;
            $name = component.name;
            componentMap[component.name] = canUserCreateComponent === true ? component.component : this.getNotAllowedComponent(component.name);
            if (component.useReactory === true) {
              componentMap[$name] = compose(withReactory)(componentMap[$name]);
            }
          } else {
            $name = componentPartsFromFqn(fqn).name;
            componentMap[$name] = this.getNotFoundComponent();
          }
        } catch (e) {
          log('Error Occured Loading Component Fqns', [fqn]);
        }
      }
      if (typeof fqn === 'object') { 
        const lookupFqn = fqn.fqn || fqn.id;
        component = componentRegister[`${lookupFqn.trim()}${lookupFqn.indexOf('@') > 0 ? '' : '@1.0.0'}`];
        try {
          if (component) {
            const canUserCreateComponent = isArray(component.roles) === true ? hasRole(component.roles) : true;
            $name = component.name;
            componentMap[$name] = canUserCreateComponent === true ? component.component : getNotAllowedComponent(component.name);
            if (component.useReactory === true) {
              componentMap[$name] = compose(withReactory)(componentMap[$name]);
            }
          } else {
            $name = componentPartsFromFqn(lookupFqn).name;
            componentMap[$name] = getNotFoundComponent();
          }
        } catch (e) {
          log('Error Occured Loading Component Fqns', [lookupFqn]);
        }
      }
    });
    return componentMap;
  }

  getGlobalComponents() {
    const components = [];
    const that = this;
    const { componentRegister } = this;
    const GLOBAL_REGEX_PATTERN = /.\$GLOBAL\$/;
    Object.keys(componentRegister).forEach((componentKey) => {
      if (GLOBAL_REGEX_PATTERN.test(componentKey) === true) {
        const { roles, component } = componentRegister[componentKey];
        if (isArray(roles) === true) {
          if (that.hasRole(roles) === true) components.push(component)
        } else {
          components.push(component);
        }
      }
    });

    return components;
  }

  getNotFoundComponent(notFoundComponent = 'core.NotFound@1.0.0'): Reactory.Client.ValidComponent<any> {
    if (this.componentRegister && this.componentRegister[notFoundComponent]) {
      return this.componentRegister[notFoundComponent].component as Reactory.Client.ValidComponent<any>;
    } else {
      return () => (
        <div>Component Find Failure, please check component registry and component name requested</div>);
    }
  }

  getNotAllowedComponent(notAllowedComponentFqn = 'core.NotAllowed@1.0.0'): Reactory.Client.ValidComponent<any> {
    if (this.componentRegister && this.componentRegister[notAllowedComponentFqn]) {
      return this.componentRegister[notAllowedComponentFqn].component as Reactory.Client.ValidComponent<any>;
    } else {
      return (React.forwardRef((props, context) => (<div>Access Denied</div>)));
    }
  }

  mountComponent(ComponentToMount, props, domNode, theme = true, callback?) {
    const that = this;

    if (theme === true) {
      ReactDOM.createPortal(<ComponentToMount {...props} />, domNode);
    } else {
      ReactDOM.render(<ComponentToMount {...props} />, domNode, callback);
    }
  }

  showModalWithComponentFqn(componentFqn, title = '', props = {}, modalProps = {}, domNode = null, theme = true, callback) {
    const ComponentToMount = this.getComponent(componentFqn);
    return this.showModalWithComponent(title, ComponentToMount, props, modalProps, domNode, theme, callback);
  }

  showModalWithComponent(title = '', ComponentToMount, props, modalProps: any = {}, domNode = null, theme = true, callback) {
    const that = this;
    const FullScreenModal = that.getComponent<React.FC>('core.FullScreenModal');
    const _modalProps: any = { ...modalProps };
    if (modalProps.open === null || modalProps.open === undefined) _modalProps.open = true;
    else _modalProps.open = modalProps.open === true;
    _modalProps.title = title;
    let _domNode = domNode || reactoryDomNode();
    if (isNil(_modalProps.onClose) === true) {
      _modalProps.onClose = () => {
        _modalProps.open = false;
        setTimeout(() => {
          that.unmountComponent(_domNode);
        }, 2000);
      };
    }
    const ModalMounted = () => (<FullScreenModal {..._modalProps}> <ComponentToMount {...props} /> </FullScreenModal>);
    this.mountComponent(ModalMounted, {}, _domNode, true, callback);
    return _domNode;
  }

  createElement(ComponentToCreate, props) {
    return React.createElement(ComponentToCreate, props);
  }

  unmountComponent(node) {
    return ReactDOM.unmountComponentAtNode(node);
  }

  isLoggingOut = false;
  async logout(refreshStatus = true) {
    if (this.isLoggingOut === true) return;
    this.isLoggingOut = true;
    localStorage.removeItem(storageKeys.AuthToken);
    this.clearStoreAndCache();
    await this.getAnonToken();
    await this.forms(true);
    const { client } = await ReactoryApolloClient();
    this.client = client;
    if (refreshStatus === true) {
      this.status({ emitLogin: false, forceLogout: true }).then(() => {
        this.emit(ReactoryApiEventNames.onLogout);
      });
    } else {
      this.emit(ReactoryApiEventNames.onLogout);
    }
    this.isLoggingOut = false;
  }

  getLastValidation() {
    return this.lastValidation;
  }

  getTokenValidated() {
    return this.tokenValidated;
  }

  getUser(): Reactory.Models.IApiStatus {
    if (!this.$user) this.$user = ReactoryLoggedInUser();
    return this.$user;
  }

  saveUserLoginCredentials(provider, props) {
    //username, password, loginResult
    return this.graphqlMutation(gql`mutation AddUserCredentials($provider: String!, $props: Any){
            addUserCredentials(provider: $provider, props: $props)
        }`, {
      provider,
      props
    });
  }

  getUserLoginCredentials(provider) {
    return this.graphqlQuery(gql`query GetUserCredentials($provider: String!) {
            getUserCredentials(provider: $provider) {
                provider
                props
                lastLogin
            }
        }`, { provider });
  }

  async storeObjectWithKey(key, objectToStore, indexDB: boolean = false, cb = (err) => { }): Promise<void> {
    if (!indexDB) return localStorage.setItem(key, JSON.stringify(objectToStore));
    else return await localForage.setItem(key, objectToStore, cb);
  }

  async readObjectWithKey(key, indexDB: boolean = false) {
    if (!indexDB) return JSON.parse(localStorage.getItem(key));
    else return JSON.parse(await localForage.getItem(key))
  }

  async deleteObjectWithKey(key, indexDB: boolean = false) {
    if (!indexDB) return localStorage.removeItem(key);
    else await localForage.removeItem(key);
  }

  private async getApiStatus(scope: ApiStatusQueryScope[] = ['application'], theme?: string, mode?: string): Promise<Partial<Reactory.Models.IApiStatus> | Reactory.Models.IApiStatus> {
    const that = this;
    const query = ApiStatusQueryFactory(scope);
    const variables = { 
      theme: theme || that.$user?.theme, 
      mode: mode || that.getThemeMode() 
    };
    try {
      const result = await that.graphqlQuery<Partial<{ apiStatus: Reactory.Models.IApiStatus }>, {}>(query, variables, { fetchPolicy: 'network-only' });
      that.emit(ReactoryApiEventNames.onApiStatusUpdate, { ...result, offline: false, scope });
      return result.data.apiStatus;
    } catch (apiStatusError) {
      //check if the error is a network error    
      if (apiStatusError.name && apiStatusError.name === 'ApolloError') {
        const {
          networkError,
          graphQLErrors,
          protocolErrors,
        } = apiStatusError as ApolloError;

        if (networkError && (networkError as ServerError).statusCode === 401) {
          await that.logout(false);
          that.setUser(anonUser);
          return anonUser;          
        }

        if (graphQLErrors && graphQLErrors.length > 0) {
          graphQLErrors.forEach((gqlError) => {
            that.error(`GraphQL Error: ${gqlError.message}`, gqlError);
          });
        }

        if (protocolErrors && protocolErrors.length > 0) {
          protocolErrors.forEach((protocolError) => {
            that.error(`Protocol Error: ${protocolError.message}`, protocolError);
          });
        }
      }
      if (apiStatusError.name === 'ApolloClientNotReady') {
        that.error('ApolloClient not ready, check the client configuration', { apiStatusError });
      } else {
        that.error(`${apiStatusError?.name || 'Unspecified'} Error occurred while fetching the API status: ${apiStatusError.message}`, { apiStatusError });
      }
      that.error(`Error occurred while fetching the API status: ${apiStatusError?.message}`, { apiStatusError });
      throw apiStatusError;
    }
  }

  async status(options?: Reactory.Client.IApiStatusRequestOptions): Promise<Reactory.Models.IApiStatus> {
    const that = this;
    const currentStatus = this.$user as Reactory.Models.IApiStatus;
    if (!this.client) throw new Error('ApolloClient not ready')

    try {
      const apiStatus: Reactory.Models.IApiStatus = await this.getApiStatus([
        'application', 
        'loggedIn',
        'colorSchemes',
        'menus',
        'messages',
        'routes',
        'theme',
        'navigationComponents',
        'plugins'
      ], options.theme, options.mode) as Reactory.Models.IApiStatus;
      if(!apiStatus) {
        return currentStatus;
      }

      if (apiStatus.status === "API OK") {
        that.setUser({ ...apiStatus });
        that.lastValidation = moment().valueOf();
        that.tokenValidated = true;
      
        if (options.emitLogin === true)
          that.emit(ReactoryApiEventNames.onLogin, that.getUser());
        if (apiStatus.messages && isArray(apiStatus.messages)) {
          apiStatus.messages.forEach((message) => {
            that.createNotification(message.title, message);
          });
        }
        that.emit(ReactoryApiEventNames.onApiStatusUpdate, { ...apiStatus, offline: false });      
        return apiStatus;
      } else {
        if (options.forceLogout !== false) {
          that.logout(false);
          that.setUser(anonUser);
          that.emit(ReactoryApiEventNames.onApiStatusUpdate, { ...apiStatus, status: 'API OFFLINE', offline: true });
        }
      }
    } catch (clientError) {
      
      return currentStatus;
    }    
  }

  validateToken(token: string) {
    this.setAuthToken(token);
    this.status();
  }

  resetPassword({ password, confirmPassword }) {
    const that = this;
    return new Promise((resolve, reject) => {
      const setPasswordMutation = that.mutations.Users.setPassword;
      return that.client.mutate({
        mutation: setPasswordMutation,
        variables: {
          input: {
            password,
            confirmPassword,
            authToken: localStorage.getItem('auth_token')
          }
        }
      }).then((result) => {
        if (result.data) {
          resolve(result.data);
        } else {
          reject(new Error('No Data'));
        }
      }).catch((passwordUpdateError) => {
        that.log(`Error occurred while executing the query ${passwordUpdateError.message}`, { passwordUpdateError });
        reject(passwordUpdateError);
      });
    });
  }


  public injectResource(resource: Reactory.Forms.IReactoryFormResource): void {
    let Loader: Reactory.Forms.ReactoryResourceLoader 
      = this.componentRegister["core.ReactoryResourceLoader@1.0.0"]?.component as Reactory.Forms.ReactoryResourceLoader;
    
    if (resource.loader) {
      Loader = this.getComponent<Reactory.Forms.ReactoryResourceLoader>(resource.loader);
      if (!Loader) { 
        this.error(`Resource expect custom loader: ${resource.loader} not found`, { resource });
        throw new Error(`Resource expect custom loader: ${resource.loader} not found`);
      }
    }

    if (Loader) {
      // @ts-ignore
      void Loader({ resource, reactory: this });
    }   
  };

  public injectPlugin(plugin: Reactory.Platform.IReactoryApplicationPlugin): void { 
    let Loader: Reactory.Forms.ReactoryResourceLoader 
      = this.componentRegister["core.ReactoryPluginLoader@1.0.0"]?.component as Reactory.Forms.ReactoryResourceLoader;

    if (plugin.loader) { 
      Loader = this.getComponent<Reactory.Forms.ReactoryResourceLoader>(plugin.loader);
      if (!Loader) { 
        this.error(`Plugin expect custom loader: ${plugin.loader} not found`, { plugin });
        throw new Error(`Plugin expect custom loader: ${plugin.loader} not found`);
      }
    }

    if (Loader) {
      // @ts-ignore
      void Loader({ plugin, reactory: this });
    }
  }

  private async loadPlugins() {
    if (this.$user && this.$user.plugins && this.$user.plugins.length > 0) {
      this.$user.plugins.forEach((plugin: Reactory.Platform.IReactoryApplicationPlugin) => {
        const {
          enabled = true,
          roles,
        } = plugin;
        if (roles && roles.length > 0) {
          if (this.hasRole(roles) === false) { 
            return;
          }
        }
        if (enabled === true) {          
          this.injectPlugin(plugin);
        }
      });
    }
  }

  setViewContext(context = {}) {
    const newContext = { ...this.getViewContext(), ...context };
    localStorage.setItem(storageKeys.viewContext, JSON.stringify(newContext));
  }

  getViewContext() {
    return JSON.parse(localStorage.getItem(storageKeys.viewContext) || '{}');
  }

  setDevelopmentMode(mode: boolean = false) {
    this.$development_mode = mode;
    localForage.setItem(storageKeys.developmentMode, mode).then();
  }

  isDevelopmentMode(): boolean {
    return this.$development_mode === true;
  }

  static propTypes = {
    client: PropTypes.instanceOf(ApolloClient).isRequired
  };
}

export default ReactoryApi;
