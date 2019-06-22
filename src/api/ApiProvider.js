
import React, { Component, Children } from "react";
import ReactDOM from 'react-dom';
import PropTypes from "prop-types";
import EventEmitter from 'eventemitter3';
import {
    BrowserRouter as Router,
  } from 'react-router-dom';

import { Provider } from 'react-redux';
import { ApolloClient, InMemoryCache, gql } from 'apollo-client-preset';
import { ApolloProvider, Query, Mutation } from 'react-apollo';
import { Typography } from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import { find, isArray, intersection, isEmpty, isNil } from 'lodash';
import { compose } from 'redux';
import moment from 'moment';
import objectMapper from 'object-mapper';
import { withApollo } from "react-apollo";
import * as restApi from './RestApi';
import graphApi from './graphql';
import icons from '../assets/icons'; 
import queryString from '../query-string';
import { 
    getAvatar, 
    getUserFullName, 
    omitDeep, 
    CDNOrganizationResource, 
    getOrganizationLogo, 
    attachComponent, 
    getElement,
    injectResources,
} from '../components/util';
import amq from '../amq';
const { queries, mutations } = graphApi

const storageKeys = {
    LoggedInUser: 'loggedInUser',
    AuthToken: 'auth_token',
    LastLoggedInEmail: '$reactory$last_logged_in_user'
}

const anonUser = { id: '', firstName: '', lastName: '', avatar: '', anon: true, roles: ['ANON'] };

export const ReactoryApiEventNames = {
    onLogout : 'loggedOut',
    onLogin : 'loggedIn',
    onPluginLoaded: 'onPluginLoaded'
};
    
const EmptyComponent = (fqn) => {
    return (<Typography>No Component For Fqn: {fqn}</Typography>)
};
  
const componentFqn = ({ nameSpace, name, version }) => {
    return `${nameSpace}.${name}@${version}`;
};        

export class ReactoryApi extends EventEmitter {
    constructor(client, props) {
        super();
        this.props = props;
        this.componentRegister = {};
        this.client = client;
        this.queries = queries;
        this.mutations = mutations;
        this.login = restApi.login.bind(this);
        this.companyWithId = restApi.companyWithId;
        this.register = restApi.register;
        this.reset = restApi.reset;
        this.forgot = restApi.forgot;        
        this.forms = this.forms.bind(this)
        this.utils = {
            omitDeep,
            queryString,
            hashCode: (inputString)=>{
                let i=0;
                let h=0;
                for(i<inputString.length;i+=1;){
                    h=Math.imul(31,h)+inputString.charCodeAt(i)|0;
                    return h;
                }
            },
            injectResources
        };
        this.rest = {
            json: {
                get: restApi.getRemoteJson,
                post: restApi.postRemoteJson,
            },
            text: {
                get: restApi.getContent
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
        this.getComponents = this.getComponents.bind(this);
        this.status = this.status.bind(this);
        this.getAvatar = getAvatar;
        this.getOrganizationLogo = getOrganizationLogo;
        this.getUserFullName = getUserFullName;
        this.getTheme = this.getTheme.bind(this);
        this.getRoutes = this.getRoutes.bind(this);
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
        this.forms().then()
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
            items: {

            }
        };
        //bind internal queue listeners
        this.amq.onReactoryPluginEvent('loaded', (data)=>{
            this.emit(ReactoryApiEventNames.onPluginLoaded, ...data );
        });

        this.flushIntervalTimer = setInterval(this.flushstats.bind(this, true), 5000);
    }

    log(message, params = [], kind = 'log') {
        const dolog = () => params.length === 0 ? console[kind](`Reactory::${message}`) : console[kind](`Reactory::${message}`, params);
        if(process.env.NODE_ENV !== 'production') {
            dolog();
        } else {
            //if it is production, we can enable / disable the log level by inspecting window.reactory object
            if(window.reactory && window.reactory.log && window.reactory.log[kind] === true) {
                dolog();
            }
        }
    }

    publishstats(){
        
        this.publishingStats = true;
        
        if(this.statistics.__delta > 0) {
            this.log(`Flushing Collected Statistics (${this.statistics.__delta}) deltas across (${this.statistics.__keys.length}) keys`, {}, 'debug');
            this.graphqlMutation(gql`mutation PublishStatistics($statistics: [StatisticEntry]!){
                Core_PublishStatistics(statistics: $statistics)
            }`,{ 
                collectedStats: this.statistics.items             
            }).then((publishResult) => {
                
                this.statistics = {
                    __delta: 0,
                    __keys: [],
                    __lastFlush: null,
                    __flushInterval: this.statistics.__flushInterval,
                    items: {
        
                    }
                }
                this.log('Statistics published and flushed', publishResult, 'debug');

                this.publishingStats = false;
            }).catch((error) => {
                this.log(error.message, error, 'error');
                this.publishingStats = false;
            });
        }        
    }

    flushstats(save){
        if(save === true) {
            this.publishstats()
        } else {
            this.statistics = {
                __delta: 0,
                __keys: [],
                __lastflush: null,
                __flushinterval: this.statistics.__flushinterval,
                items: {
    
                }
            };
        }                
    };

    stat( key,  statistic ){                               
        if(this.statistics.items[key]) {
           this.statistics.items[key] = { ...this.statistics.item[key], ...statistic };
           this.statistics.__keys.push(key);
        } else {
            this.statistics.items[key] = statistic;
        }
        this.statistics.__delta += 1;        
    };

    graphqlMutation(mutation, variables, options = { fetchPolicy: 'network-only' }){
        const that = this
        return new Promise((resolve, reject) => {
            that.client.mutate({ mutation: mutation, variables, options }).then((result) => {
                resolve(result)
            }).catch((clientErr) => {
                reject(clientErr)                
            });
        });
    }

    graphqlQuery(query, variables, options = { fetchPolicy: 'network-only' }){
        const that = this
        return new Promise((resolve, reject) => {
            that.client.query({ query, variables, options }).then((result) => {
                resolve(result)
            }).catch((clientErr) => {                
                resolve(clientErr);
            });
        });
    }

    afterLogin(user){               
        this.setUser(user); 
        this.setAuthToken(user.token);   
        return this.status({ emitLogin: true });        
    }

    loadComponent(Component, props, target){        
        if(!Component) Component = () => (<p>No Component Specified</p>)        
        attachComponent(Component, props, target);
    }

    loadComponentWithFQN(fqn, props, target){
        let Component = this.getComponent(fqn)
        this.loadComponent(Component, props, target);
    }

    renderForm(componentView){ 
        const that = this       
        return (
            <React.Fragment>
                <CssBaseline />
                <Provider store={that.reduxStore}>
                    <ApolloProvider client={that.client}>
                        <MuiThemeProvider theme={that.muiTheme}>
                            <Router>                    
                                <ApiProvider api={that}>                        
                                    { componentView }
                                </ApiProvider>
                            </Router>
                        </MuiThemeProvider>
                    </ApolloProvider>
                </Provider>
            </React.Fragment>
        )
    }

    forms(){
        const that = this
        return new Promise((resolve) => {

            const refresh = () => {
                restApi.forms().then((formsResult) => {
                    that.formSchemas = formsResult;
                    const ReactoryFormComponent = that.getComponent('core.ReactoryForm')
                    formsResult.forEach((formDef) => {
                        if(formDef.registerAsComponent) {
                            const FormComponent = (props, context) => {                                
                                return that.renderForm(<ReactoryFormComponent 
                                    {...props}
                                    formId={formDef.id} 
                                    key={props.key || 0} 
                                    onSubmit={props.onSubmit}
                                    onChange={props.onChange}
                                    formData={props.formData || props.data || formDef.defaultFormData }
                                    before={props.before}                                    
                                    >{props.children}
                                </ReactoryFormComponent>)                                                                                                                                                            
                            }
                            that.registerComponent(formDef.nameSpace, formDef.name, formDef.version, FormComponent)
                        }                        
                    })
                    resolve(formsResult)
                }).catch((error) => {
                    console.error('Error loading forms from api', error)
                    resolve([])
                });
            }

            if(this.formSchemaLastFetch !== null) {
                if(moment(this.formSchemaLastFetch).add(60, 'seconds').isAfter(moment())) {
                   refresh() 
                } else {
                    resolve(this.formSchemas)
                }
            } else refresh()
            
        });        
    }

    async raiseFormCommand(commandId, commandDef, formData){
        ////console.log('Raising Form Command Via AMQ', {commandId, formData});
        if(commandId.indexOf('graphql') === 0){
            let commandText = ''
            let method = 'query';
            if(commandId.indexOf('.') > 0) method = commandId.split('.')[1];
            commandText = commandDef[method];
            let variables = {};

            if(commandDef.variables && commandDef.variableMap) {
                variables = objectMapper(formData, commandDef.variables)
            }

            if(commandDef.staticVariables){
                variables = { ...commandDef.staticVariables, ...variables }
            }

            let commandResult = null;

            switch(method){                
                case 'mutation': {
                    commandResult = await this.graphqlMutation(gql(commandText), variables).then()
                    break;
                }
                case 'query':                                    
                default: {
                    commandResult = await this.graphqlQuery(gql(commandText), variables).then()
                }
            }
            return commandResult;
        }

        if(commandId.indexOf('workflow') === 0){
            return await this.startWorkFlow(commandId, formData);
        } else {
            this.amq.raiseFormCommand(commandId, formData);
        }        
    }

    startWorkFlow(workFlowId, data){
        //this.amp.raiseWorkFlowEvent(workFlowId, data);
        const that = this;
        return new Promise((resolve, reject) => {
            that.client.query({ query: that.mutations.System.startWorkflow, variables: {name: workFlowId, data}, options: { fetchPolicy: 'network-only' } }).then((result) => {
                if (result.data.startWorkflow === true) {                                        
                    resolve(true);                    
                }
                else {                    
                    resolve(false);       
                }
            }).catch((clientErr) => {
                console.error('Error starting workflow', clientErr);                
                resolve(anonUser);
            });
        });
    }

    onFormCommandEvent(commandId, func){
        this.amq.onFormCommandEvent(commandId, func);
    }
    
    hasRole(itemRoles = [], userRoles = null){        
        const result = intersection(itemRoles, userRoles);
        return result.length >= 1;
    }

    isAnon(){
        return this.hasRole(['ANON']) === true;
    }

    addRole(user, organization, role='USER'){
        return true        
    }

    removeRole(user, organization, role='USER'){
        return true
    }

    getMenus(target){
        const user = this.getUser()
        const { menus } = user

        return menus || []
    }

    getTheme(){
        const user = this.getUser()
        const { themeOptions } = user
        //add theme extension
        const extensions = {
            reactory: {
                icons                 
            }
        }
        return { ...themeOptions, extensions  };
    }

    getRoutes(){
        const user = this.getUser()
        const { routes } = user;

        return routes || [];
    }

    getApplicationRoles(){
        const user = this.getUser()
        const { roles } = user

        return roles || []
    }

    setUser(user) {
        localStorage.setItem(storageKeys.LoggedInUser, JSON.stringify(user));
    }    

    setAuthToken(token) {
        localStorage.setItem(storageKeys.AuthToken, token)
    }

    getAuthToken(){
        return localStorage.getItem(storageKeys.AuthToken);
    }

    setLastUserEmail(email) {
        localStorage.setItem(storageKeys.LastLoggedInEmail, email);
    }

    getLastUserEmail() {
        //debugger;
        localStorage.getItem(storageKeys.LastLoggedInEmail);
    }

    registerComponent(nameSpace, name, version = '1.0.0', component = EmptyComponent){
        const fqn = `${nameSpace}.${name}@${version}`;
        if(isEmpty(nameSpace)) throw new Error('nameSpace is required for component registration');
        if(isEmpty(name)) throw new Error('name is required for component registration');
        if(isNil(component)) throw new Error('component is required to register component');
        if(isNil(this.getComponent(fqn)) === true){
          this.componentRegister[fqn] = {nameSpace, name, version, component}
        }
    }
    
    getComponents(componentFqns = []){
        let componentMap = {};
        componentFqns.forEach(fqn => {
            const component = this.componentRegister[`${fqn}${fqn.indexOf('@') > 0 ? '' : '@1.0.0' }`]
            if(component) {
                componentMap[component.name] = component.component
            }            
        })

        return componentMap;
    }

    getComponent(fqn){
        try {
            const found = this.componentRegister[`${fqn}${fqn.indexOf('@') > 0 ? '' : '@1.0.0' }`]        
            if(found && found.component) return found.component        
            return null
        } catch (err) {
            console.error(`Bad component name "${fqn}"`)
            return null
        }        
    }

    mountComponent(ComponentToMount, props, domNode, theme = true, callback){
        const that = this    
        if(theme === true) {
            ReactDOM.render(<React.Fragment>
            <CssBaseline />
            <Provider store={that.reduxStore}>
                <ApolloProvider client={that.client}>
                    <MuiThemeProvider theme={that.muiTheme}>
                        <Router>                    
                            <ApiProvider api={that}>                        
                                <ComponentToMount {...props} />
                            </ApiProvider>
                        </Router>
                    </MuiThemeProvider>
                </ApolloProvider>
            </Provider>
        </React.Fragment>, domNode, callback)
        } else {
            ReactDOM.render(<ComponentToMount {...props} />, domNode, callback);        
        }
        
    }

    createElement(ComponentToCreate, props, domNode, theme, callback = ()=>{}) {
        const that = this   
        /* 
        ReactDOM.render(<div>
            <CssBaseline />
            <Provider store={that.reduxStore}>
                <ApolloProvider client={that.client}>
                    <MuiThemeProvider theme={that.muiTheme}>
                        <Router>                    
                            <ApiProvider api={that}>                        
                                { React.createElement(ComponentToCreate, props) }
                            </ApiProvider>
                        </Router>
                    </MuiThemeProvider>
                </ApolloProvider>
            </Provider>
        </div>, domNode, callback)
        */

       return React.createElement(ComponentToCreate, props)
            
    }

    unmountComponent(node){
        return ReactDOM.unmountComponentAtNode(node)
    }

    logout(refreshStatus = true) {
        const user = this.getUser()
        localStorage.removeItem(storageKeys.AuthToken);
        this.setUser({ ...user, ...anonUser });
        if(refreshStatus === true){
            this.status({ logout: true }).then((done)=>{
                this.emit(ReactoryApiEventNames.onLogout);
            });
        }        
    }

    getLastValidation(){
        return this.lastValidation;
    }

    getTokenValidated(){
        return this.tokenValidated;
    }

    getUser() {
        const userString = localStorage.getItem(storageKeys.LoggedInUser);
        if (userString) return JSON.parse(userString);
        return anonUser;
    }

    saveUserLoginCredentials(provider, username, password) {
        return this.graphqlMutation(gql`mutation AddUserCredentials($provider: String!, $username: String!, $password: String!){
            addUserCredentials(provider: $provider, username: $username, password: $password)
        }`, { provider, username, password});
    }

    getUserLoginCredentials(provider) {
        return this.graphqlQuery(gql`query GetUserCredentials($provider: String!) {
            getUserCredentials(provider: $provider) {
                provider
                props
                lastLogin
            }            
        }`, { provider } );
    }
    
    storeObjectWithKey(key, objectToStore){
        localStorage.setItem(key, JSON.stringify(objectToStore))
    }

    readObjectWithKey(key){
        return JSON.parse(localStorage.getItem(key))
    }

    deleteObjectWithKey(key){
        localStorage.removeItem(key);
    }
    status( options = { emitLogin: false } ) {
        const that = this
        return new Promise((resolve, reject) => {
            that.client.query({ query: that.queries.System.apiStatus, options: { fetchPolicy: 'network-only' } }).then((result) => {                
                if (result.data.apiStatus.status === "API OK") {                    
                    that.setUser({ ...result.data.apiStatus });
                    that.lastValidation = moment().valueOf();
                    that.tokenValidated = true;                                         
                    if(options.emitLogin === true) that.emit(ReactoryApiEventNames.onLogin, that.getUser());
                    resolve(that.getUser());                    
                }
                else {
                    that.logout(false);
                    that.setUser(anonUser);             
                    resolve(anonUser);       
                }
            }).catch((clientErr) => {                
                that.logout(false);
                resolve(anonUser);
            });
        });
    }
    
    validateToken(token) {
        this.setAuthToken(token);
        return this.status()
    }

    resetPassword({ password, confirmPassword, resetToken }) {
        const that = this;
        return new Promise((resolve, reject) => {
            const setPasswordMutation = that.mutations.Users.setPassword
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
        })
    }

    setViewContext(context = {}){
        const newContext = { ...this.getViewContext(), ...context };
        localStorage.setItem(storageKeys.viewContext, JSON.stringify(newContext));
    }

    getViewContext(){
        return JSON.parse(localStorage.getItem(storageKeys.viewContext) || '{}');
    }

    static propTypes = {
        client: PropTypes.instanceOf(ApolloClient).isRequired
    }
}

class ApiProvider extends Component {

    static propTypes = {
        api: PropTypes.instanceOf(ReactoryApi).isRequired,
    };
    
    static childContextTypes = {
        api: PropTypes.instanceOf(ReactoryApi).isRequired,
    };

    getChildContext() {
        let { api } = this.props;
        return { api };
    };

    render() {
        return Children.only(this.props.children);
    }
}

ApiProvider = compose(    
    withApollo
)(ApiProvider);


export const withApi = (ComponentToWrap) => {
    return class ApiWrappedComponent extends Component {

        static contextTypes = {
            api: PropTypes.instanceOf(ReactoryApi).isRequired,
        };

        render() {
            //TODO: NEW Client Feature: Add Security Filter For Each Component Here
            /**
             * Check if the component has a roles defined on a static 
             * property accessor, following the same pattern as the 
             * propTypes and defaultProps static props.
             * 
             * We can decide on the name of the property, but it should
             * be safe from any clashes i.e.
             * 
             * static ReactoryPermissions = {
             *  roles: [ string ] - we can filter on normal roles - should be preferred
             *  claims: [ string ] - add custom claims ability per user - fine grained controll, field level
             *  tokens: [ string ] - ?? not sure, but could be used to generate specific tokens, may be useful temporary access 
             * } 
             * 
             * The API must match at least one of the lot to give permission to the component
             * 
             * If not we display a security block widget, small with a hover / popup that 
             * allows the user to request permission to that specific element / data owner
             */
            const { api } = this.context;
            return <ComponentToWrap {...this.props} api={api} />            
        }
    }
};

export default ApiProvider;
