/**
 * AppLoading Component
 * Displays a loading indicator with an animated loader
 * @module components/app/AppLoading
 */

import React from 'react';
import { AppLoadingProps } from '../../../types/app';
//@ts-ignore
import './AppLoading.css';

/**
 * AppLoading - A loading indicator component
 * Shows an animated loading indicator with an optional message
 *
 * @param props - Component props
 * @param props.message - Optional message to display below the loader
 * @returns React component
 *
 * @example
 * ```tsx
 * <AppLoading message="Loading application..." />
 * ```
 */
export const AppLoading: React.FC<AppLoadingProps> = ({ message = 'Loading' }) => {
  return (
    <>
      <div id="default_loader" className="loader">
        <div className="loader-inner">
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
        </div>
      </div>
      <p>{message}</p>
    </>
  );
};

export default AppLoading;
