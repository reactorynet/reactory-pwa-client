/**
 * Environment utility functions
 * @module utils/app/environment
 */

/**
 * Get environment variable value
 * @param key - Environment variable key
 * @param defaultValue - Default value if not found
 * @returns Environment variable value or default
 */
export const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

/**
 * Check if running in development mode
 * @returns True if in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if running in production mode
 * @returns True if in production mode
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if running in test mode
 * @returns True if in test mode
 */
export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

/**
 * Get client key from environment
 * @returns Client key
 */
export const getClientKey = (): string => {
  return getEnvVar('REACT_APP_CLIENT_KEY');
};

/**
 * Get client password from environment
 * @returns Client password
 */
export const getClientPassword = (): string => {
  return getEnvVar('REACT_APP_CLIENT_PASSWORD');
};

/**
 * Get API endpoint from environment
 * @returns API endpoint URL
 */
export const getApiEndpoint = (): string => {
  return getEnvVar('REACT_APP_API_ENDPOINT');
};
