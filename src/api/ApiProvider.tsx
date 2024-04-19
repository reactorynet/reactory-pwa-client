import React, { Component, Children, createContext, useContext } from "react";
import PropTypes from "prop-types";
import {  } from 'react-router';
import { useNavigate } from 'react-router-dom';
import { compose } from 'redux';
import ReactoryApi from "./ReactoryApi";
import { withErrorBoundary } from './ErrorBoundary';

export const ReactoryProvider = ({ children, reactory }) => {

    return (<ReactoryContext.Provider value={reactory}>
        {Children.only(children)}
    </ReactoryContext.Provider>)
};

export const ReactoryContext = createContext<Reactory.Client.ReactorySDK>(null);

export const withReactory = (ComponentToWrap: any | React.Component | Function, id = 'not-set') => {

    function ErrorFallback({ error, resetErrorBoundary }) {
        return (
            <div role="alert">
                <p>Something went wrong:</p>
                <pre>{error.message}</pre>                
            </div>
        )
    }


    return (props: any) => {
        if(id === 'core.LogingCard@1.0.0') debugger;
        const reactory = useContext(ReactoryContext);
                
        if(!ComponentToWrap) throw new Error("Component to wrap cannot be null")

        const ComponentWithErrorBoundary = withErrorBoundary(ComponentToWrap, {
            FallbackComponent: ErrorFallback,
            onError: (error, info) => {
                reactory.log(`Error in component ${id}`, {error, info}, 'error');
            },
            id
        });

        try {
            if(id === 'core.Loging@1.0.0') debugger
            return <ComponentWithErrorBoundary {...props} reactory={reactory} />
        } catch (error) {
            return <span>Component: {id}: error: {error.message}</span>
        }
    }

};


export const useReactory = (): Reactory.Client.ReactorySDK => {
    const reactory = useContext(ReactoryContext);
    return reactory;
}

export default ReactoryProvider;
