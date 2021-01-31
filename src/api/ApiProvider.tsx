import React, { Component, Children, createContext, useContext } from "react";
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

export const ReactoryProvider = ({ children, api }) => {

    return (<ReactoryContext.Provider value={api}>
        {Children.only(children)}
    </ReactoryContext.Provider>)
};

export const ReactoryContext = createContext<ReactoryApi>(null);

export const withApi = (ComponentToWrap: any | React.Component | Function, id = 'not-set') => {

    return (props: any) => {
        const reactory = useContext(ReactoryContext)

        try {
            return <ComponentToWrap {...props} api={reactory} reactory={reactory} />
        } catch (error) {
            return <span>Component: {id}: error: {error.message}</span>
        }
    }

};


export const useReactory = () => {
    const reactory = useContext(ReactoryContext);
    return reactory;
}




export default ApiProvider;
