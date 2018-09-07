
import React, { Component, Children } from "react";
import PropTypes from "prop-types";
import { bindActionCreators } from "redux";
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ApolloClient } from "apollo-client";
import { withApollo } from "react-apollo";
import * as restApi from './RestApi'
import graphApi from './graphql'
import { loggedInUser } from "../models/mock";

const { queries, mutations } = graphApi

export class ReactoryApi {
    constructor(client){
      this.client = client;
      this.queries = queries;
      this.mutations = mutations;
      this.login = restApi.login;
      this.companyWithId = restApi.companyWithId;
      this.register = restApi.register;
      this.reset = restApi.reset;
      this.forgot = restApi.forgot;
      this.forms = restApi.forms;

      this.validateToken = this.validateToken.bind(this);
      this.resetPassword = this.resetPassword.bind(this);
    }

    setUser(user){
        localStorage.setItem('loggedInUser', JSON.stringify(user));                    
    }

    getUser(){
        const userString = localStorage.getItem('loggedInUser');
        if(userString) return JSON.parse(userString);
        return null;
    }

    validateToken(token){
        const that = this;
        return new Promise((resolve, reject) => {
            that.client.query({ query: that.queries.System.apiStatus }).then((result)=>{
                if(result.data.apiStatus.status === "API OK") {
                    const { id, firstName, lastName, avatar } = result.data.apiStatus;
                    that.setUser({id, firstName, lastName, avatar});
                    resolve(true);
                }
                else { 
                    that.setUser({ id: '', firstName: '', lastName: '', avatar: '' });
                    reject(new Error('TOKEN INVALID OR API DOWN'));
                }
            }).catch((clientErr) => {
                console.error('Error happened during validation', clientErr);
                reject(new Error('Coult not execute validation'));
            });
        });
    }

    resetPassword({password, confirmPassword, resetToken}){
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
                }}).then((result) => {
                if(result.data){
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


export const withApi = ( ComponentToWrap ) => {
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
