
import React, { Component, Children } from "react";
import PropTypes from "prop-types";
import { bindActionCreators } from "redux";
import { connect } from 'react-redux';
import { compose } from 'redux';
import { ApolloClient } from "apollo-client";
import { withApollo } from "react-apollo";
import * as restApi from './RestApi'
import graphApi from './graphql'

const { queries, mutations } = graphApi

export class ReactoryApi {
    constructor(client){
      this.client = client;
      this.queries = queries;
      this.mutations = mutations;
      this.login = restApi.login
      this.companyWithId = restApi.companyWithId
      this.register = restApi.register
      this.reset = restApi.reset
      this.forgot = restApi.forgot
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
)(ApiProvider)


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
