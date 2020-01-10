import React from "react";
import ReactDOM from 'react-dom';
import PropTypes from "prop-types";
import EventEmitter from 'eventemitter3';
import uuid from 'uuid';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ApolloClient, gql } from 'apollo-client-preset';
import { ApolloProvider } from 'react-apollo';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/core/styles';
import { intersection, isArray, isEmpty, isNil, template } from 'lodash';
import moment from 'moment';
import objectMapper from 'object-mapper';
import {
  attachComponent,
  getAvatar,
  getOrganizationLogo,
  getUserFullName,
  injectResources,
  omitDeep
} from '../components/util';
import amq from '../amq';
import * as RestApi from './RestApi';
import GraphQL from '@reactory/client-core/api/graphql';
import { Typography } from "@material-ui/core";
import icons from '../assets/icons';
import queryString from '../query-string';
import humanNumber from 'human-number';
import ApiProvider, { withApi } from './ApiProvider';

import Reactory from '../types/reactory';



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

export const storageKeys = {
  LoggedInUser: 'loggedInUser',
  AuthToken: 'auth_token',
  LastLoggedInEmail: '$reactory$last_logged_in_user',
  viewContext: '$rectory$viewContext',
};

export const anonUser = {
  id: '',
  firstName: '',
  lastName: '',
  avatar: '',
  anon: true,
  roles: ['ANON']
};

export const ReactoryApiEventNames = {
  onLogout: 'loggedOut',
  onLogin: 'loggedIn',
  onPluginLoaded: 'onPluginLoaded',
  onApiStatusUpdate: 'onApiStatusUpdate',
  onRouteChanged: 'onRouteChanged',
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


class ReactoryApi extends EventEmitter {

  history: any;
  queries: any;
  mutations: any;
  props: Object;
  componentRegister: Object;
  client: ApolloClient<any>;
  login: Function = null;
  register: Function = null;
  reset: Function = null;
  forgot: Function = null;
  utils: Object = {};
  companyWithId: Function = null;
  $func: Object;
  rest: Object = null;
  tokenValidated: boolean = false;
  lastValidation: number;
  tokenValid: boolean = false;
  getAvatar: Function;
  getOrganizationLogo: Function;
  getUserFullName: Function;
  CDN_ROOT: string = process.env.REACT_APP_CDN || 'http://localhost:4000/cdn';
  API_ROOT: string = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:4000';
  CLIENT_KEY: string = process.env.REACT_APP_CLIENT_KEY;
  CLIENT_PWD: string = process.env.REACT_APP_CLIENT_PASSWORD;
  formSchemas: Reactory.IReactoryForm[]
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
  constructor(client, props) {
    super();
    this.history = null;
    this.props = props;
    this.componentRegister = {};
    this.client = client;
    this.queries = GraphQL.queries;
    this.mutations = GraphQL.mutations;
    this.login = RestApi.login.bind(this);
    this.companyWithId = RestApi.companyWithId;
    this.register = RestApi.register;
    this.reset = RestApi.reset;
    this.forgot = RestApi.forgot;
    this.forms = this.forms.bind(this);
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
      moment,
      objectMapper,
      template,
      humanNumber,
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
    this.forms().then();
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
  }

  goto(where = "/", state = { __t: new Date().valueOf() }) {
    if (this.history && this.history) {
      this.history.replace({ pathname: where, state });
      this.emit(ReactoryApiEventNames.onRouteChanged, { path: where, state, where });
    }
  }

  registerFunction(fqn, functionReference, requiresApi = false) {
    this.log(`Registering function ${fqn}`, [functionReference, requiresApi], 'debug');
    if (typeof functionReference === 'function') {
      if (requiresApi === true) {
        this.$func[fqn] = (props) => {
          functionReference({ ...props, api: this });
        };
      } else {
        this.$func[fqn] = functionReference;
      }
    }
  }
  ;

  log(message, params: any = [], kind = 'log') {
    try {
      switch (kind) {
        case 'log':
        case 'debug':
        case 'error':
        case 'warn':
        case 'info': {
          // do nothing we good
          break;
        }
        default: {
          //different kind.. we don't do your kind around here.
          kind = 'debug';
          break;
        }
      }
      const dolog = () => params && params.length === 0 ? console[kind](`Reactory::${message}`) : console[kind](`Reactory::${message}`, params);
      if (process.env.NODE_ENV !== 'production') {
        dolog();
      } else {
        //if it is production, we can enable / disable the log level by inspecting window.reactory object
        if (window.reactory && window.reactory.log && window.reactory.log[kind] === true) {
          dolog();
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
  }
  ;

  stat(key, statistic) {
    if (this.statistics.items[key]) {
      this.statistics.items[key] = { ...this.statistics.item[key], ...statistic };
      this.statistics.__keys.push(key);
    } else {
      this.statistics.items[key] = statistic;
    }
    this.statistics.__delta += 1;
  }
  ;

  trackFormInstance(formInstance) {
    const self = this;
    self.log('ApiProvider.trackingFormInstance(formInstance)', [formInstance], 'debug');
    this.__form_instances[formInstance.state._instance_id] = formInstance;
    formInstance.on('componentWillUnmount', (instance) => {
      self.log('ApiProvider.trackingFormInstance(formInstance).on("componentWillUnmount")', [formInstance], 'debug');
      delete self.__form_instances[formInstance.state._instance_id];
    });
  }

  graphqlMutation(mutation, variables, options: any = { fetchPolicy: "network-only" }) {
    const that = this;
    if (typeof mutation === 'string')
      mutation = gql(mutation);
    return new Promise((resolve, reject) => {
      that.client.mutate({ mutation: mutation, variables, fetchPolicy: "no-cache" }).then((result) => {
        resolve(result);
      }).catch((clientErr) => {
        reject(clientErr);
      });
    });
  }

  graphqlQuery(query, variables, options: any = { fetchPolicy: 'network-only' }) {
    const that = this;
    if (typeof query === 'string')
      query = gql(query);
    return new Promise((resolve, reject) => {
      that.client.query({ query, variables, fetchPolicy: options.fetchPolicy || "network-only" }).then((result) => {
        resolve(result);
      }).catch((clientErr) => {
        resolve({ data: null, loading: false, errors: [clientErr] });
      });
    });
  }

  afterLogin(user) {
    this.setUser(user);
    this.setAuthToken(user.token);
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

  renderForm(componentView) {
    const that = this;
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

  forms() {
    const that = this;
    return new Promise((resolve) => {
      const refresh = () => {
        RestApi.forms().then((formsResult) => {
          that.formSchemas = formsResult;
          const ReactoryFormComponent = that.getComponent('core.ReactoryForm');
          formsResult.forEach((formDef) => {
            if (formDef.registerAsComponent) {
              const FormComponent = (props, context) => {
                return that.renderForm(<ReactoryFormComponent {...props} formId={formDef.id} key={props.key || 0}
                  onSubmit={props.onSubmit} onChange={props.onChange}
                  formData={props.formData || props.data || formDef.defaultFormData}
                  before={props.before}>{props.children}
                </ReactoryFormComponent>);
              };
              that.registerComponent(formDef.nameSpace, formDef.name, formDef.version, FormComponent);
            }
          });
          resolve(formsResult);
        }).catch((error) => {
          console.error('Error loading forms from api', error);
          resolve([]);
        });
      };
      if (this.formSchemaLastFetch !== null) {
        if (moment(this.formSchemaLastFetch).add(60, 'seconds').isAfter(moment())) {
          refresh();
        } else {
          resolve(this.formSchemas);
        }
      } else
        refresh();
    });
  }

  async raiseFormCommand(commandId, commandDef, formData) {

    console.log('RAISING FORM COMMANT VIA AMQ', { commandId, commandDef, formData });

    if (commandDef.hasOwnProperty('graphql')) {
      if (commandDef.graphql.hasOwnProperty('mutation')) {
        let variables = {};
        if (commandDef.graphql.mutation.variables) {
          let data = formData.formData || formData.formContext.formData;
          variables = objectMapper(data, commandDef.graphql.mutation.variables);
          debugger;
        }
        if (commandDef.graphql.mutation.staticVariables) {
          variables = { ...commandDef.graphql.mutation.staticVariables, ...variables };
        }

        let mutationText = gql`${commandDef.graphql.mutation.text}`;
        return await this.graphqlMutation(mutationText, { nextActions: variables }).then();
      }

      // TODO IMPLEMENT QUERY

    }

    // TODO - COMPLETE WORKFLOW IMPLEMENTATION AS ABOVE
    if (commandId.indexOf('workflow') === 0) {
      return await this.startWorkFlow(commandId, formData);
    } else {
      this.amq.raiseFormCommand(commandId, formData);
    }


    // if (commandId.indexOf('graphql') === 0) {
    //   let commandText = '';
    //   let method = 'query';
    //   if (commandId.indexOf('.') > 0)
    //     method = commandId.split('.')[1];
    //   commandText = commandDef[method];
    //   let variables = {};
    //   if (commandDef.variables && commandDef.variableMap) {
    //     variables = objectMapper(formData, commandDef.variables);
    //   }
    //   if (commandDef.staticVariables) {
    //     variables = {...commandDef.staticVariables, ...variables};
    //   }
    //   let commandResult = null;
    //   switch (method) {
    //     case 'mutation': {
    //       commandResult = await this.graphqlMutation(gql(commandText), variables).then();
    //       break;
    //     }
    //     case 'query':
    //     default: {
    //       commandResult = await this.graphqlQuery(gql(commandText), variables).then();
    //     }
    //   }
    //   return commandResult;
    // }

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
    if (itemRoles.length === 1 && itemRoles[0] === '*')
      return true;
    if (userRoles === null)
      userRoles === this.getUser().roles;
    const result = intersection(itemRoles, userRoles);
    return result.length >= 1;
  }

  isAnon() {
    return this.hasRole(['ANON']) === true;
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
    return { ...themeOptions, extensions };
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

  registerComponent(nameSpace, name, version = '1.0.0', component: any = EmptyComponent, tags = [], roles = ['*'], wrapWithApi = false) {
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
      roles
    };
    this.emit('componentRegistered', fqn);
  }

  getComponents(componentFqns = []) {
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
    this.showModalWithComponent(title, ComponentToMount, props, modalProps, domNode, theme, callback);
  }

  showModalWithComponent(title = '', ComponentToMount, props, modalProps: any = {}, domNode = null, theme = true, callback) {
    const that = this;
    const FullScreenModal = that.getComponent('core.FullScreenModal');
    const _modalProps: any = { ...modalProps };
    _modalProps.open = true;
    _modalProps.title = title;
    let _domNode = domNode || reactoryDomNode();
    if (isNil(_modalProps.onClose)) {
      modalProps.onClose = () => {
        _modalProps.open = false;
        setTimeout(() => {
          that.unmountComponent(_domNode);
        }, 2000);
      };
    }
    const ModalMounted = (<FullScreenModal {..._modalProps}> <ComponentToMount {...props} /> </FullScreenModal>);
    this.mountComponent(ModalMounted, {}, _domNode, true, callback);
  }

  createElement(ComponentToCreate, props) {
    return React.createElement(ComponentToCreate, props);
  }

  unmountComponent(node) {
    return ReactDOM.unmountComponentAtNode(node);
  }

  logout(refreshStatus = true) {
    const user = this.getUser();
    localStorage.removeItem(storageKeys.AuthToken);
    this.setUser({ ...user, ...anonUser });
    if (refreshStatus === true) {
      this.status({ emitLogin: false }).then((done) => {
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
    const userString = localStorage.getItem(storageKeys.LoggedInUser);
    if (userString)
      return JSON.parse(userString);
    return anonUser;
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
      that.client.query({ query: that.queries.System.apiStatus, fetchPolicy: 'network-only' }).then((result) => {
        if (result.data.apiStatus.status === "API OK") {
          that.setUser({ ...result.data.apiStatus });
          that.lastValidation = moment().valueOf();
          that.tokenValidated = true;
          if (options.emitLogin === true)
            that.emit(ReactoryApiEventNames.onLogin, that.getUser());
          that.emit(ReactoryApiEventNames.onApiStatusUpdate, { result });
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
