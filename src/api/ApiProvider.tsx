import React, { Component, Children } from "react";
import PropTypes from "prop-types";
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { withApollo } from "react-apollo";
import ReactoryApi from "./ReactoryApi";

export interface ApiProviderProps {
    api: ReactoryApi,
    history: History
}

class ApiProvider extends Component<ApiProviderProps> {

    static propTypes = {
        api: PropTypes.instanceOf(ReactoryApi).isRequired,
    };
    
    static childContextTypes = {
        api: PropTypes.instanceOf(ReactoryApi).isRequired,
    };

    getChildContext() {
        let { api, history } = this.props;
        api.history = history;
        return { api };
    };

    render() {
        return Children.only(this.props.children);
    }
}

export const ApiProviderComponent = compose(    
    withApollo,
    withRouter,
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
