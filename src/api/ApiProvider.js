
import React, { Component, Children } from "react";
import PropTypes from "prop-types";
import EventEmitter from 'eventemitter3';
import { find } from 'lodash';
import { compose } from 'redux';
import moment from 'moment';
import { ApolloClient } from "apollo-client";
import { withApollo } from "react-apollo";
import * as restApi from './RestApi'
import graphApi from './graphql'

const { queries, mutations } = graphApi

const storageKeys = {
    LoggedInUser: 'loggedInUser',
    AuthToken: 'auth_token',
}

const anonUser = { id: '', firstName: '', lastName: '', avatar: '', anon: true };

export const ReactoryApiEventNames = {
    onLogout : 'loggedOut'
};

export class ReactoryApi extends EventEmitter {
    constructor(client) {
        super();
        this.componentRegister = [];
        this.client = client;
        this.queries = queries;
        this.mutations = mutations;
        this.login = restApi.login;
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
        this.registerComponent = this.registerComponent.bind(this);
        this.getComponent = this.getComponent.bind(this);
    }

    setUser(user) {
        localStorage.setItem(storageKeys.LoggedInUser, JSON.stringify(user));
    }

    setAuthToken(token) {
        localStorage.setItem(storageKeys.AuthToken, token)
    }

    registerComponent(componentDef) {
        this.componentRegister.push(componentDef)
    }

    getComponent(componentQuery) {
        find(this.componentRegister, componentQuery);
    }

    logout() {
        this.setUser(anonUser);
        localStorage.removeItem(storageKeys.AuthToken);
        this.emit(ReactoryApiEventNames.onLogout);
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

    validateToken(token) {
        const that = this;
        this.setAuthToken(token);
        return new Promise((resolve, reject) => {
            that.client.query({ query: that.queries.System.apiStatus }).then((result) => {
                if (result.data.apiStatus.status === "API OK") {
                    const { id, firstName, lastName, avatar, email } = result.data.apiStatus;
                    that.setUser({ id, firstName, lastName, avatar, email });
                    this.lastValidation = moment().valueOf();
                    this.tokenValidated = true;                    
                    resolve(true);
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
