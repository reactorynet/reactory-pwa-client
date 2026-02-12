import React from 'react';

export interface HeaderProps {
    reactory: any;
    theme?: any; // Material UI Theme
    className?: string; 
    [key: string]: any;
}

export type HeaderComponent = React.ComponentType<HeaderProps>;

export interface HeaderRegistryItem {
    id: string;
    component: HeaderComponent;
    description?: string;
}

export interface HeaderConfig { 
    id: string; // The ID of the header to use
    props?: Record<string, any>; // Props to pass to the header
}
