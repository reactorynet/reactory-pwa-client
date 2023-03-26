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

export const ReactoryProvider = ({ children, reactory }) => {

    return (<ReactoryContext.Provider value={reactory}>
        {Children.only(children)}
    </ReactoryContext.Provider>)
};

export const ReactoryContext = createContext<Reactory.Client.IReactoryApi>(null);

export const withReactory = (ComponentToWrap: any | React.Component | Function, id = 'not-set') => {

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
        const reactory = useContext(ReactoryContext);
                
        if(!ComponentToWrap) throw new Error("Component to wrap cannot be null")

        const ComponentWithErrorBoundary = withErrorBoundary(ComponentToWrap, {
            FallbackComponent: ErrorFallback,
            onError: (error, info) => {
                reactory.log(`Error in component ${id}`, {error, info}, 'error');
            }
        });

        try {
            return <ComponentWithErrorBoundary {...props} reactory={reactory} />
        } catch (error) {
            return <span>Component: {id}: error: {error.message}</span>
        }
    }

};


export const useReactory = (): Reactory.Client.IReactoryApi => {
    const reactory = useContext(ReactoryContext);
    return reactory;
}




export default ReactoryProvider;
