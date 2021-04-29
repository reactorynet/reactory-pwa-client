import React from "react";
import ReactDOM from 'react-dom';
import PropTypes from "prop-types";
import EventEmitter from 'eventemitter3';
import inspector from 'schema-inspector';
import uuid from 'uuid';
import classNames from 'classnames';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ApolloClient, gql, ApolloProvider, NormalizedCacheObject, Resolvers, MutationOptions } from '@apollo/client';
import localForage from 'localforage';
import { Mutation, Query } from '@apollo/client/react/components';

import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import lodash, { intersection, isArray, isEmpty, isNil, template, LoDashWrapper, LoDashStatic } from 'lodash';
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
  CDNResource
} from '../components/util';
import amq from '../amq';
import * as RestApi from './RestApi';
import GraphQL from '@reactory/client-core/api/graphql';
import { Theme, Typography } from "@material-ui/core";
import icons from '../assets/icons';
import queryString from '../query-string';
import humanNumber from 'human-number';
import humanDate from 'human-date';
import ApiProvider, { withApi } from './ApiProvider';
import { ReactoryLoggedInUser, anonUser, storageKeys } from './local';
import ReactoryApolloClient from './ReactoryApolloClient';

import Reactory from '../types/reactory';
import { MutationResult, QueryOptions } from "react-apollo";
import { RefetchQueryDescription } from "@apollo/client/core/watchQueryOptions";
import { Breakpoints } from "@material-ui/core/styles/createBreakpoints";

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
  onThemeChanged: 'onThemeChanged'
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
export const parseTemplateObject = (templateObject: Object, props: any): Object => {

  if (templateObject === null || templateObject === undefined) return templateObject;

  let _$ret: Object = {};

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


export const componentPartsFromFqn = (fqn) => {
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

      componentMeta.nameSpace = nameParts[0];
      componentMeta.name = nameParts[1];

      return componentMeta;

    }
  }
  throw new Error('Component FQN not valid, must have at least nameSpace.name with version being options i.e. nameSpace.name@version')
}
export interface ReactoryApiUtils {
  omitDeep: Function,
  queryString: {
    parse: (queryString: string) => object
  },
  hashCode: Function,
  injectResources: Function,
  componentFqn: Function,
  pluginDefinitionValid: Function,
  moment: Function,
  objectMapper: Function,
  template: Function,
  templateObject(item: Object, props: any): Object,
  humanNumber: Function,
  inspector: {
    sanitize: (sanitizeSchema: any, data: any) => void,
    validate: (validationSchema: any, data: any) => any
  },
  gql: Function,
  humanDate: Function,
  slugify: Function,
  deepEquals: Function,
  lodash: any,
  classNames: Function,
  uuid: () => string,
  collectData: (forms: any[], shape: any) => any,
  localForage: LocalForage
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

export interface _dynamic {
  [key: string]: any
}


interface ReactoryTheme extends Theme {
  [key: string]: any
}

class ReactoryApi extends EventEmitter implements _dynamic {

  $windowSize: WindowSizeSpec = null;
  $user: any;
  history: any;
  queries: any;
  mutations: any;
  props: Object;
  componentRegister: Object;
  client: ApolloClient<NormalizedCacheObject>;
  login: Function = null;
  register: Function = null;
  reset: Function = null;
  forgot: Function = null;
  utils: ReactoryApiUtils = null;
  companyWithId: Function = null;
  $func: Object;
  rest: Object = null;
  tokenValidated: boolean = false;
  lastValidation: number;
  tokenValid: boolean = false;
  getAvatar: Function;
  getOrganizationLogo: Function;
  getUserFullName: Function;
  getThemeResource: (path?: string) => string;
  getCDNResource: (path: string) => string;
  CDN_ROOT: string = process.env.REACT_APP_CDN || 'http://localhost:4000/cdn';
  API_ROOT: string = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:4000';
  CLIENT_KEY: string = process.env.REACT_APP_CLIENT_KEY;
  CLIENT_PWD: string = process.env.REACT_APP_CLIENT_PASSWORD;
  formSchemas: Reactory.IReactoryForm[]
  formValidationMaps: any;
  formTranslationMaps: any;
  formSchemaLastFetch: moment.Moment = null;

  assets: Object = null;
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
  objectToQueryString: Function;
  clearCache: () => void;
  ws_link: any;


  constructor(props) {
    super();

    this.history = null;
    this.props = props;
    this.componentRegister = {};
    this.queries = GraphQL.queries;
    this.mutations = GraphQL.mutations;
    this.login = RestApi.login.bind(this);
    this.companyWithId = RestApi.companyWithId;
    this.register = RestApi.register;
    this.reset = RestApi.reset;
    this.forgot = RestApi.forgot;
    this.forms = this.forms.bind(this);
    this.form = this.form.bind(this);

    this.utils = {
      omitDeep,
      queryString,
      hashCode: (inputString) => {
        let i = 0;
        let h = 0;
        for (i < inputString.length; i += 1;) {
          h = Math.imul(31, h) + inputString.charCodeAt(i) | 0;
          return h;
        }
      },
      injectResources,
      componentFqn,
      //componentDefinitionFromFqn,
      pluginDefinitionValid,
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
    };
    this.$func = {
      'core.NullFunction': (params) => {
        this.log('An extension function was not found', [params], 'warning');
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
        144: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-144.png`,
        192: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-192.png`,
        512: `${this.CDN_ROOT}/themes/${this.CLIENT_KEY}/images/icons-512.png`,
      }
    };
    this.log = this.log.bind(this);
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
    // this.statusIntervalTime = setInterval(this.status.bind(this), 30000);
    this.status();
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
  }

  async init() {
    const {
      client,
      ws_link,
      clearCache
    } = await ReactoryApolloClient();

    this.clearCache = clearCache;
    this.client = client;
    this.ws_link = ws_link;
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
    this.log('_____ CREATE NOTIFICATION ______', { title, options }, 'debug');

    let defaultNotificationProps = {
      title,
      type: options.type || "info",
      config: {
        canDismiss: true,
        timeOut: 2500,
      }
    }

    if (options.props) {
      defaultNotificationProps.config = { ...defaultNotificationProps.config, ...options.config }
    }

    if (options.showInAppNotification) {
      this.emit(ReactoryApiEventNames.onShowNotification, { title: title, type: options.type, config: options.props });
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
              this.createNotification(title, { ...defaultNotificationProperties, ...options, body: options.text || "" });
            }
          })
      } else {
        Notification.requestPermission(function (permission) {
          if (permission === "granted") {
            this.createNotification(title, { ...defaultNotificationProperties, ...options, body: options.text || "" });
          }
        });
      }
    };

    if (window && window.Notification) {

      switch (Notification.permission) {
        case "denied": {
          //denied notificaitons, use fallback
          this.amq.raiseFormCommand("reactory.core.display.notification",
            {
              title: title,
              options: {
                ...defaultNotificationProperties,
                ...options
              }
            });
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
      this.log('Notification API not supported in this browser', { ...defaultNotificationProperties, ...options }, 'warning');
    }

  }

  goto(where = "/", state = { __t: new Date().valueOf() }) {
    if (this.history && this.history) {
      this.history.replace({ pathname: where, state });
      this.emit(ReactoryApiEventNames.onRouteChanged, { path: where, state, where });
    }
  }

  registerFunction(fqn, functionReference, requiresApi = false, signature = '< signature-not-set />') {
    this.log(`${signature} Registering function ${fqn}`, [functionReference, requiresApi], 'debug');
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

  log(message, params: any = [], kind = 'log', formatting = "") {
    try {
      switch (kind) {
        case 'log':
        case 'debug':
          formatting = "color: grey;"
          break;
        case 'error':
          formatting = "color: red; font-weight: bold;"
          break;
        case 'warn':
          {
            formatting = "color: yellow, font-weight: bold;"
            break;
          }
        case 'info': {
          // do nothing we good
          formatting = "color: blue"
          break;
        }
        default: {
          //different kind.. we don't do your kind around here.
          kind = 'debug';
          formatting = "color: grey;"
          break;
        }
      }
      const dolog = () => params && params.length === 0 ? console[kind](`%cReactory::${message}`, formatting) : console[kind](`%cReactory::${message}`, formatting, params);
      if (process.env.NODE_ENV !== 'production') {
        // dolog();
      } else {
        //if it is production, we can enable / disable the log level by inspecting window.reactory object
        if (window.reactory && window.reactory.log && window.reactory.log[kind] === true) {
          // dolog();
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  publishstats() {
    this.publishingStats = true;
    if (this.statistics.__delta > 0) {
      this.log(`Flushing Collected Statistics (${this.statistics.__delta}) deltas across (${this.statistics.__keys.length}) keys`, [], 'debug');
      const entries = this.statistics.__keys.map(key => ({ key, stat: this.statistics.items[key] }));
      this.graphqlMutation(gql`mutation PublishStatistics($entries: [StatisticsInput]!){
                CorePublishStatistics(entries: $entries)
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
        this.log('Statistics published and flushed', [publishResult], 'debug');
        this.publishingStats = false;
      }).catch((error) => {
        this.log(error.message, error, 'error');
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
      this.log(`Error capturing statistic`, { key, statistic, statisticsCollectionError }, 'error');
    }

  };

  trackFormInstance(formInstance) {
    const self = this;
    self.log('ApiProvider.trackingFormInstance(formInstance)', [formInstance], 'debug');
    this.__form_instances[formInstance.instance_id] = formInstance;
    formInstance.on('componentWillUnmount', (instance) => {
      self.log('ApiProvider.trackingFormInstance(formInstance).on("componentWillUnmount")', [formInstance], 'debug');
      delete self.__form_instances[formInstance.state._instance_id];
    });
  }

  graphqlMutation(mutation, variables, options: any = { fetchPolicy: "no-cache" }, refetchQueries: RefetchQueryDescription = []) {
    const that = this;
    let $mutation = null;
    if (typeof mutation === 'string') {
      try {
        $mutation = gql(mutation);
      } catch (gqlError) {
        that.log(`Error occurred while creating the mutation document from input`, { mutation }, 'error');
      }
    } else $mutation = mutation;

    return new Promise((resolve, reject) => {
      let mutation_options: MutationOptions<any, any> = { mutation: $mutation, variables };
      mutation_options.refetchQueries = refetchQueries;
      that.client.mutate(mutation_options).then((result) => {
        resolve(result);
      }).catch((clientErr) => {
        that.log(`Error occured executing the mutation: ${clientErr.message}`, { $mutation, clientErr }, 'error')
        reject(clientErr);
      });
    });
  }

  graphqlQuery(query,
    variables,
    options: any = { fetchPolicy: 'network-only' },
    queryDefinition: Reactory.IReactoryFormQuery = null) {

    const that = this;

    let $query = null;
    if (typeof query === 'string') {
      try {
        $query = gql(query);
      } catch (gqlError) {
        that.log(`Error occurred while creating the query document from input`, { query, gqlError }, 'error');
        that.createNotification('🚨 GRAPHQL ERROR IN QUERY CHECK LOG FOR DETAILS - Test the query in the Developer tools', { type: 'warning', canDismiss: true, timeout: 4000, showInAppNotification: true });
      }
    } else $query = query;

    return new Promise((resolve, reject) => {
      that.client.query({
        query: $query,
        variables,
        fetchPolicy: options.fetchPolicy || 'network-only',
      }).then((result) => {
        const { errors = [], data } = result;
        if (errors.length > 0) {
          errors.forEach((error) => {
            if (error) {
              const { extensions, path = [] } = error;
              if (extensions) {
                const { code, exception } = extensions;
                if (code === 'INTERNAL_SERVER_ERROR') {
                  //we know for certain the server had an unhandled error in the resolver chain.
                  //the client may not cater for these errors, so we can by default warn the user
                  //that the server reported an error - we should log and report the error
                  //to the server side error reporting and tracing.
                  that.log(`🚨 Server reported an internal error. This is should not occur, all errors need to be gracefully handled, with support info`, { error, variables, options, query, queryDefinition }, 'error');
                  // that.createNotification(`The query at path ${path.map(p => `${p}:`)} has encountered a server error. The administrators have been notified.`, { type: 'error', showInAppNotification: true, timeout: 4500 });
                }
              }
            }
          });
        }
        resolve(result);
      }).catch((clientErr) => {
        that.log(`Error occurred while executing the query ${clientErr.message}`, { query, clientErr }, 'error');
        reject(clientErr)
        // resolve({ data: null, loading: false, errors: [clientErr] });
      });
    });
  }

  async afterLogin(user) {
    //this.setUser(user);
    this.setAuthToken(user.token);
    const { client, ws_link, clearCache } = await ReactoryApolloClient();
    this.client = client;
    this.clearCache = clearCache;
    //this.$ws_link = ws_link;
    //this.forms(true).then();
    return this.status({ emitLogin: true });
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

    if (wrap === false) return (<React.Fragment>{componentView}</React.Fragment>)

    return (<React.Fragment>
      <CssBaseline />
      <Provider store={that.reduxStore}>
        <ApolloProvider client={that.client}>
          <MuiThemeProvider theme={that.muiTheme}>
            <Router>
              <ApiProvider api={that} history={this.history}>
                {componentView}
              </ApiProvider>
            </Router>
          </MuiThemeProvider>
        </ApolloProvider>
      </Provider>
    </React.Fragment>);
  }

  forms(bypassCache: boolean = false) {
    const that = this;
    return new Promise((resolve) => {

      const refresh = () => {
        RestApi.forms().then((formsResult) => {
          that.formSchemas = formsResult;
          const ReactoryFormComponent = that.getComponent('core.ReactoryForm');
          formsResult.forEach((formDef: Reactory.IReactoryForm, formDefIndex) => {
            if (formDef.registerAsComponent === true) {
              const FormComponent = (props: any, context: any) => {
                return that.renderForm(<ReactoryFormComponent formId={formDef.id} key={`${formDefIndex}`}
                  onSubmit={props.onSubmit} onChange={props.onChange}
                  formData={formDef.defaultFormValue || props.formData || props.data}
                  before={props.before}
                  {...props}
                  context={context}
                >{props.children}
                </ReactoryFormComponent>, formDef.wrap === true);
              };
              that.registerComponent(formDef.nameSpace, formDef.name, formDef.version, FormComponent, formDef.tags, formDef.roles, true, [], 'form');
            }
          });
          that.formSchemaLastFetch = moment();
          resolve(formsResult);
        }).catch((error) => {
          that.log('Error loading forms from api', error, 'error');
          resolve([]);
        });
      };

      if (that.formSchemaLastFetch !== null && that.formSchemaLastFetch !== undefined && bypassCache === false) {

        if (moment(that.formSchemaLastFetch).add(5, 'minutes').isBefore(moment())) {
          refresh();
        } else {
          resolve(that.formSchemas);
        }
      } else refresh();
    });
  }

  form(id: string) {
    const { formSchemas } = this;
    return lodash.find(formSchemas, { id });
  }

  async raiseFormCommand(commandId, commandDef, formProps) {


    this.log(`______ RAISE FORM COMMAND ______ `, 'debug');
    this.log(`______ ACTION ______ ${commandDef.action || 'NOPE'}`, 'debug');
    this.log(`______ GRAPHQL ______ ${commandDef.hasOwnProperty('graphql') || 'NOPE'}`, 'debug');
    this.log(`______ MUTATION ______ ${commandDef.hasOwnProperty('mutation') || 'NOPE'}`, 'debug');

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

  hasRole(itemRoles = [], userRoles = null) {
    let comparedRoles = userRoles || [];

    if (itemRoles.length === 1 && itemRoles[0] === '*')
      return true;

    if (userRoles === null) {
      const loggedInUser = this.getUser();
      comparedRoles = loggedInUser.roles;
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

  getMenus(target) {
    const user = this.getUser();
    const { menus } = user;
    return menus || [];
  }

  getTheme() {
    const user = this.getUser();
    const { themeOptions } = user;
    //add theme extension
    const extensions = {
      reactory: {
        icons
      }
    };


    let paletteType = 'light';

    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isLightMode = window.matchMedia("(prefers-color-scheme: light)").matches
    const isNotSpecified = window.matchMedia("(prefers-color-scheme: no-preference)").matches

    if (localStorage) {
      paletteType = localStorage.getItem("$reactory$theme_mode")
      if (!paletteType) {
        paletteType = isDarkMode === true ? 'dark' : 'light'
      }
    }

    let $theme = lodash.cloneDeep(themeOptions);
    $theme.extensions = extensions;

    if ($theme.palette) $theme.palette.type = paletteType;
    else {
      $theme.palette = {
        type: paletteType
      }
    }

    return $theme;
  }

  getRoutes() {
    const user = this.getUser();
    const { routes } = user;
    return routes || [];
  }

  getApplicationRoles() {
    const user = this.getUser();
    const { roles } = user;
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

  registerComponent(nameSpace, name, version = '1.0.0', component: any = EmptyComponent, tags = [], roles = ['*'], wrapWithApi = false, connectors = [], componentType = 'component') {
    const fqn = `${nameSpace}.${name}@${version}`;
    if (isEmpty(nameSpace))
      throw new Error('nameSpace is required for component registration');
    if (isEmpty(name))
      throw new Error('name is required for component registration');
    if (isNil(component))
      throw new Error('component is required to register component');
    this.componentRegister[fqn] = {
      nameSpace,
      name,
      version,
      component: wrapWithApi === false ? component : withApi(component),
      tags,
      roles,
      connectors,
      componentType
    };
    this.emit('componentRegistered', fqn);
  }

  getComponentsByType(componentType: string = 'component') {

    let _components = [];
    Object.keys(this.componentRegister).forEach((fqn) => {
      if (this.componentRegister[fqn].componentType === componentType) {
        _components.push(this.componentRegister[fqn]);
      }
    })

    return _components;

  };

  getComponents(componentFqns = []): any {
    let componentMap = {};
    componentFqns.forEach(fqn => {
      let component = null;
      if (typeof fqn === 'string') {
        component = this.componentRegister[`${fqn}${fqn.indexOf('@') > 0 ? '' : '@1.0.0'}`];
        try {
          if (component) {
            const canUserCreateComponent = isArray(component.roles) === true ? this.hasRole(component.roles) : true;
            componentMap[component.name] = canUserCreateComponent === true ? component.component : this.getNotAllowedComponent(component.name);
          } else {
            componentMap[componentPartsFromFqn(fqn).name] = this.getNotFoundComponent();
          }
        } catch (e) {
          this.log('Error Occured Loading Component Fqns', [fqn], 'error');
        }
      }
      if (typeof fqn === 'object') {
        if (typeof fqn.componentFqn === 'string') {
          component = this.componentRegister[`${fqn.componentFqn}${fqn.componentFqn.indexOf('@') > 0 ? '' : '@1.0.0'}`];
          try {
            if (component) {
              const canUserCreateComponent = isArray(component.roles) === true ? this.hasRole(component.roles) : true;
              componentMap[typeof fqn.alias === 'string' ? fqn.alias : component.name] = canUserCreateComponent === true ? component.component : this.getNotAllowedComponent(component.name);
            } else {
              componentMap[componentPartsFromFqn(fqn.componentFqn).name] = this.getNotFoundComponent();
            }
          } catch (e) {
            this.log('Error Occured Loading Component Fqns', fqn.componentFqn, 'error');
          }
        }
      }
    });
    return componentMap;
  }

  getComponent(fqn) {
    if (fqn === undefined)
      throw new Error('NO NULL FQN');
    try {
      const found = this.componentRegister[`${fqn}${fqn.indexOf('@') > 0 ? '' : '@1.0.0'}`];
      if (found && found.component)
        return found.component;
      return null; //we must return null, because the component is not found, we cannot automatically return the not found component, that is the responsibility of the component
    } catch (err) {
      this.log(`Bad component name ${err.message}`, fqn, 'error');
      if (this.componentRegister && this.componentRegister['core.NotFound@1.0.0']) {
        return this.getNotFoundComponent();
      }
    }
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

  getNotFoundComponent(notFoundComponent = 'core.NotFound@1.0.0') {
    if (this.componentRegister && this.componentRegister[notFoundComponent]) {
      return this.componentRegister[notFoundComponent].component;
    } else {
      return (React.forwardRef((props, context) => (
        <div>Component Find Failure, please check component registry and component name requested</div>)));
    }
  }

  getNotAllowedComponent(notAllowedComponentFqn = 'core.NotAllowed@1.0.0') {
    if (this.componentRegister && this.componentRegister[notAllowedComponentFqn]) {
      return this.componentRegister[notAllowedComponentFqn].component;
    } else {
      return (React.forwardRef((props, context) => (<div>Access Denied</div>)));
    }
  }

  mountComponent(ComponentToMount, props, domNode, theme = true, callback) {
    const that = this;
    if (theme === true) {
      ReactDOM.render(<React.Fragment>
        <CssBaseline />
        <Provider store={that.reduxStore}>
          <ApolloProvider client={that.client}>
            <MuiThemeProvider theme={that.muiTheme}>
              <Router>
                <ApiProvider api={that} history={this.history}>
                  <ComponentToMount {...props} />
                </ApiProvider>
              </Router>
            </MuiThemeProvider>
          </ApolloProvider>
        </Provider>
      </React.Fragment>, domNode, callback);
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
    const FullScreenModal = that.getComponent('core.FullScreenModal');
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

  async logout(refreshStatus = true) {
    const user = this.getUser();
    localStorage.removeItem(storageKeys.AuthToken);
    this.clearStoreAndCache();

    const { client } = await ReactoryApolloClient();
    this.client = client;
    this.setUser({ ...user, ...anonUser });

    if (refreshStatus === true) {
      this.status({ emitLogin: false }).then((apiStatus) => {
        this.emit(ReactoryApiEventNames.onLogout);
      });
    } else {
      this.emit(ReactoryApiEventNames.onLogout);
    }
  }

  getLastValidation() {
    return this.lastValidation;
  }

  getTokenValidated() {
    return this.tokenValidated;
  }

  getUser() {
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

  storeObjectWithKey(key, objectToStore) {
    localStorage.setItem(key, JSON.stringify(objectToStore));
  }

  readObjectWithKey(key) {
    return JSON.parse(localStorage.getItem(key));
  }

  deleteObjectWithKey(key) {
    localStorage.removeItem(key);
  }

  status(options = { emitLogin: false }) {
    const that = this;
    return new Promise((resolve, reject) => {
      that.forms(true).then(() => {
        const getStatus = () => {
          if (that.client) {
            that.client.query({ query: that.queries.System.apiStatus, fetchPolicy: 'network-only' }).then((result) => {
              if (result.data.apiStatus.status === "API OK") {
                that.setUser({ ...result.data.apiStatus });
                that.lastValidation = moment().valueOf();
                that.tokenValidated = true;

                if (options.emitLogin === true)
                  that.emit(ReactoryApiEventNames.onLogin, that.getUser());
                if (result.data.apiStatus.messages && isArray(result.data.apiStatus.messages)) {
                  result.data.apiStatus.messages.forEach((message) => {
                    that.createNotification(message.title, message);
                  });
                }

                that.emit(ReactoryApiEventNames.onApiStatusUpdate, { result, offline: false });
                resolve(that.getUser());
              } else {
                that.logout(false);
                that.emit(ReactoryApiEventNames.onApiStatusUpdate, { result, offline: true });
                that.setUser(anonUser);
                resolve(anonUser);
              }
            }).catch((clientErr) => {
              that.logout(false);
              that.emit(ReactoryApiEventNames.onApiStatusUpdate, { offline: true, clientError: clientErr });
              resolve({ ...anonUser, offline: true, offlineError: true });
            });
          } else {

            setTimeout(() => {
              getStatus();
            }, 1000);
          }
        };
        getStatus()

      });
    });
  }

  validateToken(token) {
    this.setAuthToken(token);
    return this.status();
  }

  resetPassword({ password, confirmPassword, resetToken }) {
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
        console.error(passwordUpdateError);
        reject(passwordUpdateError);
      });
    });
  }

  setViewContext(context = {}) {
    const newContext = { ...this.getViewContext(), ...context };
    localStorage.setItem(storageKeys.viewContext, JSON.stringify(newContext));
  }

  getViewContext() {
    return JSON.parse(localStorage.getItem(storageKeys.viewContext) || '{}');
  }

  static propTypes = {
    client: PropTypes.instanceOf(ApolloClient).isRequired
  };
}

/*
export const login = ReactoryApi.login
export const companyWithId = ReactoryApi.companyWithId
export const register = ReactoryApi.register
export const forgot = ReactoryApi.forgot
export const reset = ReactoryApi.reset
export const forms = ReactoryApi.forms
*/



export default ReactoryApi;
