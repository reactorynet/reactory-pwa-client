/**
 * Application configuration constants
 * @module constants/app/config
 */

import { PackageInfo, EnvironmentConfig } from '../../types/app';

/**
 * Package information
 */
export const packageInfo: PackageInfo = {
  version: '1.0.0'
};

/**
 * Environment configuration from process.env
 */
export const environmentConfig: EnvironmentConfig = {
  REACT_APP_CLIENT_KEY: process.env.REACT_APP_CLIENT_KEY || '',
  REACT_APP_CLIENT_PASSWORD: process.env.REACT_APP_CLIENT_PASSWORD || '',
  REACT_APP_API_ENDPOINT: process.env.REACT_APP_API_ENDPOINT || ''
};

/**
 * Initialize localStorage with environment variables
 * This ensures the values are available across the application
 */
export const initializeEnvironmentStorage = (): void => {
  if (localStorage) {
    localStorage.setItem('REACT_APP_CLIENT_KEY', environmentConfig.REACT_APP_CLIENT_KEY);
    localStorage.setItem('REACT_APP_CLIENT_PASSWORD', environmentConfig.REACT_APP_CLIENT_PASSWORD);
    localStorage.setItem('REACT_APP_API_ENDPOINT', environmentConfig.REACT_APP_API_ENDPOINT);
  }
};
