/**
 * Component registration utility functions
 * @module utils/app/componentRegistration
 */

import Reactory from '@reactory/reactory-core';

/**
 * Component definition for registration
 */
export interface ComponentDefinition {
  nameSpace: string;
  name: string;
  version?: string;
  component: React.ComponentType<any>;
  tags?: string[];
  roles?: string[];
  wrapWithApi?: boolean;
}

/**
 * Register a single component with the Reactory SDK
 * @param reactory - Reactory SDK instance
 * @param componentDef - Component definition
 */
export const registerComponent = (
  reactory: Reactory.Client.ReactorySDK,
  componentDef: ComponentDefinition
): void => {
  const {
    nameSpace,
    name,
    version = '1.0.0',
    component,
    tags = [],
    roles = ['*'],
    wrapWithApi = false
  } = componentDef;

  reactory.registerComponent(
    nameSpace,
    name,
    version,
    component,
    tags,
    roles,
    wrapWithApi
  );
};

/**
 * Register multiple components with the Reactory SDK
 * @param reactory - Reactory SDK instance
 * @param componentDefs - Array of component definitions
 */
export const registerComponents = (
  reactory: Reactory.Client.ReactorySDK,
  componentDefs: ComponentDefinition[]
): void => {
  componentDefs.forEach((componentDef) => {
    registerComponent(reactory, componentDef);
  });
};
