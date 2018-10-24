
import React, { Component, Children } from "react";
import PropTypes from "prop-types";
import EventEmitter from 'eventemitter3';
import { Typography } from '@material-ui/core';
import { find, isArray, intersection, isEmpty, isNil } from 'lodash';
import { compose } from 'redux';
import moment from 'moment';
import { ApolloClient } from "apollo-client";
import { withApollo } from "react-apollo";
import * as restApi from './RestApi'
import graphApi from './graphql'
import { getAvatar, getUserFullName } from '../components/util'
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
        this.forms = restApi.forms;

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
        this.getUserFullName = getUserFullName;
        this.getTheme = this.getTheme.bind(this);
        this.getRoutes = this.getRoutes.bind(this);
        this.CDN_ROOT = process.env.REACT_APP_CDN || 'http://localhost:4000/cdn';
    }

    afterLogin(user){        
        this.setUser(user); 
        this.setAuthToken(user.token);   
        return this.status({ emitLogin: true }).then();        
    }


    hasRole(itemRoles = [], userRoles = []){
        return intersection(itemRoles, userRoles).length > 0;
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
            const component = this.componentRegister[fqn]
            if(component) {
                componentMap[component.name] = component.component
            }            
        })

        return componentMap;
    }

    getComponent(fqn){
        const found = this.componentRegister[fqn]        
        if(found && found.component) return found.component        
        return null
    }

    logout() {
        const user = this.getUser()
        localStorage.removeItem(storageKeys.AuthToken);
        this.setUser({ ...user, ...anonUser });
        this.status({ logout: true }).then((done)=>{
            this.emit(ReactoryApiEventNames.onLogout);
        });
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

    status( options = { emitLogin: false } ) {
        const that = this
        return new Promise((resolve, reject) => {
            that.client.query({ query: that.queries.System.apiStatus, options: { fetchPolicy: 'network-only' } }).then((result) => {
                console.log('Api Status result', result.data);
                if (result.data.apiStatus.status === "API OK") {                    
                    that.setUser({ ...result.data.apiStatus });
                    that.lastValidation = moment().valueOf();
                    that.tokenValidated = true;                                         
                    resolve(true);
                    if(options.emitLogin === true) that.emit(ReactoryApiEventNames.onLogin);
                }
                else {
                    that.logout();
                    that.setUser(anonUser);                    
                    reject(new Error('TOKEN INVALID OR API DOWN'));
                }
            }).catch((clientErr) => {
                console.error('Error happened during validation', clientErr);
                that.logout();
                reject(new Error('Coult not execute validation'));
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
            return (
                <ComponentToWrap {...this.props} api={api} />
            )
        }
    }
};

export default ApiProvider;
