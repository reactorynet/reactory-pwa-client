
import React, { Component, Children } from "react";
import PropTypes from "prop-types";
import EventEmitter from 'eventemitter3';
import {
    BrowserRouter as Router,
    Route,
    Link,
    Redirect,
  } from 'react-router-dom';

import { Provider } from 'react-redux';
import { createHttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import { ApolloClient, InMemoryCache } from 'apollo-client-preset';
import { ApolloProvider, Query, Mutation } from 'react-apollo';
import { Typography } from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import { createMuiTheme } from '@material-ui/core/styles';
import { find, isArray, intersection, isEmpty, isNil } from 'lodash';
import { compose } from 'redux';
import moment from 'moment';
import { withApollo } from "react-apollo";
import * as restApi from './RestApi';
import graphApi from './graphql';
import configureStore from '../models/redux';
import { 
    getAvatar, 
    getUserFullName, 
    omitDeep, 
    CDNOrganizationResource, 
    getOrganizationLogo, 
    attachComponent, 
    getElement,
} from '../components/util';
import amq from '../amq';

const { queries, mutations } = graphApi

const storageKeys = {
    LoggedInUser: 'loggedInUser',
    AuthToken: 'auth_token',
}

const anonUser = { id: '', firstName: '', lastName: '', avatar: '', anon: true, roles: ['ANON'] };

export const ReactoryApiEventNames = {
    onLogout : 'loggedOut',
    onLogin : 'loggedIn'
};

  
const store = configureStore();
  
const EmptyComponent = (fqn) => {
    return (<Typography>No Component For Fqn: {fqn}</Typography>)
};
  
const componentFqn = ({ nameSpace, name, version }) => {
    return `${nameSpace}.${name}@${version}`;
};        

export class ReactoryApi extends EventEmitter {
    constructor(client) {
        super();
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
            omitDeep
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
        this.getComponents = this.getComponents.bind(this);
        this.status = this.status.bind(this);
        this.getAvatar = getAvatar;
        this.getOrganizationLogo = getOrganizationLogo;
        this.getUserFullName = getUserFullName;
        this.getTheme = this.getTheme.bind(this);
        this.getRoutes = this.getRoutes.bind(this);
        this.isAnon = this.isAnon.bind(this);
        this.raiseFormCommand = this.raiseFormCommand.bind(this);
        this.CDN_ROOT = process.env.REACT_APP_CDN || 'http://localhost:4000/cdn';
        this.formSchemas = [];
        this.formSchemaLastFetch = null;
        this.amq = amq;        
        this.loadComponentWithFQN = this.loadComponentWithFQN.bind(this);
        this.loadComponent = this.loadComponent.bind(this);
        this.renderForm = this.renderForm.bind(this);
        this.forms().then()
    }

    afterLogin(user){ 
        console.log('After login called');       
        this.setUser(user); 
        this.setAuthToken(user.token);   
        return this.status({ emitLogin: true });        
    }

    loadComponent(Component, props, target){        
        debugger
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
                                    formId={formDef.id} 
                                    key={props.key || 0} 
                                    onSubmit={props.onSubmit}
                                    onChange={props.onChange}
                                    data={props.formData || props.data || formDef.defaultFormData }
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

    raiseFormCommand(commandId, formData){
        this.amq.raiseFormCommand(commandId, formData);
    }

    onFormDataEvent(commandId, func){
        this.amq.onFormDataEvent(commandId, func);
    }
    
    hasRole(itemRoles = [], userRoles = this.getApplicationRoles()){             
        return intersection(itemRoles, userRoles).length > 0;
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

        return themeOptions
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
        const found = this.componentRegister[`${fqn}${fqn.indexOf('@') > 0 ? '' : '@1.0.0' }`]        
        if(found && found.component) return found.component        
        return null
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
                    if(options.emitLogin === true) that.emit(ReactoryApiEventNames.onLogin);
                    resolve(result.data.apiStatus.user);                    
                }
                else {
                    that.logout(false);
                    that.setUser(anonUser);             
                    resolve(anonUser);       
                }
            }).catch((clientErr) => {
                console.error('Error happened during validation', clientErr);
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
            const { api } = this.context;
            return <ComponentToWrap {...this.props} api={api} />            
        }
    }
};

export default ApiProvider;
