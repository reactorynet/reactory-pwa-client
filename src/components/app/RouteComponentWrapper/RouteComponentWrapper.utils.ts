/**
 * RouteComponentWrapper utility functions
 * @module components/app/RouteComponentWrapper/utils
 */

import Reactory from '@reactory/reactory-core';

/**
 * Transform value based on transform type
 * @param value - Value to transform
 * @param transform - Transform type
 * @returns Transformed value
 */
export const applyTransform = (value: any, transform: string): any => {
  switch (transform) {
    case 'toInt':
      return parseInt(value);
    case 'toString':
      return String(value);
    case 'toDate':
      return new Date(value);
    case 'toBoolean':
      return Boolean(value);
    default:
      return value;
  }
};

/**
 * Process template string with parameters
 * @param template - Template string with ${} placeholders
 * @param params - Route parameters
 * @param location - Location object
 * @param reactory - Reactory SDK instance
 * @returns Processed value
 */
export const processTemplate = (
  template: string,
  params: Record<string, any>,
  location: any,
  reactory: Reactory.Client.ReactorySDK
): any => {
  if (template.includes('::')) {
    const [valueTemplate, transform] = template.split('::');
    const processedValue = reactory.utils.template(valueTemplate)({ route: params, location });
    return applyTransform(processedValue, transform);
  } else {
    return reactory.utils.template(template)({ route: params, location });
  }
};

/**
 * Process component props with route parameters
 * @param componentProps - Component props object
 * @param params - Route parameters
 * @param location - Location object
 * @param reactory - Reactory SDK instance
 * @returns Processed props
 */
export const processComponentProps = (
  componentProps: Record<string, any>,
  params: Record<string, any>,
  location: any,
  reactory: Reactory.Client.ReactorySDK
): Record<string, any> => {
  const processedProps = { ...componentProps };

  Object.keys(processedProps).forEach(key => {
    const value = processedProps[key];
    if (typeof value === 'string' && value.includes('${')) {
      try {
        processedProps[key] = processTemplate(value, params, location, reactory);
      } catch (error) {
        reactory.warning(`Error processing template ${value}:`, error);
        processedProps[key] = value; // fallback to original value
      }
    }
  });

  return processedProps;
};
