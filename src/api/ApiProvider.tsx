import React, { Component, Children, createContext, useContext } from "react";
import PropTypes from "prop-types";
import {  } from 'react-router';
import { useNavigate } from 'react-router-dom';
import { compose } from 'redux';
import ReactoryApi from "./ReactoryApi";
import { ErrorBoundary } from './ErrorBoundary';

export const ReactoryProvider = ({ children, reactory }) => {

    return (<ReactoryContext.Provider value={reactory}>
        {Children.only(children)}
    </ReactoryContext.Provider>)
};

export const ReactoryContext = createContext<Reactory.Client.ReactorySDK>(null);

function ErrorFallback({ error, resetErrorBoundary }) {
    return (
        <div role="alert">
            <p>Something went wrong:</p>
            <pre>{error.message}</pre>
        </div>
    )
}

/**
 * Injects the Reactory SDK into a component and wraps it in an error boundary.
 *
 * The boundary is rendered as an element rather than built with
 * `withErrorBoundary` inside the render function. Calling an HOC during render
 * produces a brand new component *type* on every pass, and React treats a
 * changed type as a different component: it unmounts the entire subtree and
 * mounts a fresh one. Measured before this change, a wrapped component logged
 * six mounts across six parent renders instead of one.
 *
 * Every consumer of withReactory paid that cost — state was discarded, effects
 * re-ran, and anything that fetched on mount refetched on each parent render.
 * `ErrorBoundary` is a stable class, so rendering it directly keeps the element
 * type constant and the subtree mounted.
 */
export const withReactory = (ComponentToWrap: any | React.Component | Function, id = 'not-set') => {

    if (!ComponentToWrap) throw new Error("Component to wrap cannot be null")

    const WithReactory = (props: any) => {
        const reactory = useContext(ReactoryContext);

        const onError = React.useCallback((error: Error, info: unknown) => {
            reactory?.log(`Error in component ${id}`, { error, info });
        }, [reactory]);

        return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={onError} id={id}>
                <ComponentToWrap {...props} reactory={reactory} />
            </ErrorBoundary>
        );
    };

    const wrappedName = (ComponentToWrap as any).displayName
        || (ComponentToWrap as any).name
        || id;
    WithReactory.displayName = `withReactory(${wrappedName})`;

    return WithReactory;
};


export const useReactory = (): Reactory.Client.ReactorySDK => {
    const reactory = useContext(ReactoryContext);
    return reactory;
}

export default ReactoryProvider;
