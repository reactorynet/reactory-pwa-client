import React, { Component, Children, createContext, useContext } from "react";
import PropTypes from "prop-types";
import {  } from 'react-router';
import { useNavigate } from 'react-router-dom';
import { compose } from 'redux';
import ReactoryApi from "./ReactoryApi";
import { withErrorBoundary } from './ErrorBoundary';

export interface ApiProviderProps {
    api: ReactoryApi,
    history: History
}

export const ReactoryProvider = ({ children, api }) => {

    return (<ReactoryContext.Provider value={api}>
        {Children.only(children)}
    </ReactoryContext.Provider>)
};

export const ReactoryContext = createContext<ReactoryApi>(null);

export const withApi = (ComponentToWrap: any | React.Component | Function, id = 'not-set') => {

    function ErrorFallback({ error, resetErrorBoundary }) {
        return (
            <div role="alert">
                <p>Something went wrong:</p>
                <pre>{error.message}</pre>
                <button onClick={resetErrorBoundary}>Try again</button>
            </div>
        )
    }


    return (props: any) => {
        const reactory = useContext(ReactoryContext)
        const ComponentWithErrorBoundary = withErrorBoundary(ComponentToWrap, {
            FallbackComponent: ErrorFallback,
            onError: (error, info) => {
                reactory.log(`Error in component ${id}`, {error, info}, 'error');
            }
        })
        try {
            return <ComponentWithErrorBoundary {...props} api={reactory} reactory={reactory} />
        } catch (error) {
            return <span>Component: {id}: error: {error.message}</span>
        }
    }

};


export const useReactory = () => {
    const reactory = useContext(ReactoryContext);
    return reactory;
}




export default ReactoryProvider;
