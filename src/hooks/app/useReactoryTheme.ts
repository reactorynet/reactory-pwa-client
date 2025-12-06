/**
 * useReactoryTheme Hook
 * Manages theme state and theme-related event handlers
 */
import { useState } from 'react';
import { createTheme, Theme } from '@mui/material/styles';
import { isNil } from 'lodash';

export interface UseReactoryThemeParams {
  reactory: Reactory.Client.ReactorySDK;
  appTheme: any;
}

export interface UseReactoryThemeReturn {
  theme: Theme;
  applyTheme: () => void;
  onThemeChanged: () => void;
}

/**
 * Custom hook for managing Reactory theme
 */
export const useReactoryTheme = ({
  reactory,
  appTheme,
}: UseReactoryThemeParams): UseReactoryThemeReturn => {
  const [theme, setTheme] = useState<Theme>(createTheme({ palette: { mode: 'dark' } }));

  /**
   * Applies the current theme from Reactory settings
   */
  const applyTheme = () => {
    let activeTheme: Reactory.UX.IReactoryTheme = reactory.getTheme();
    if (isNil(activeTheme)) activeTheme = { ...appTheme };
    if (Object.keys(activeTheme).length === 0) activeTheme = { ...appTheme };

    // Default empty state is MUI createTheme
    let muiTheme: Theme & any = createTheme();

    const { type = 'material' } = activeTheme;

    // Additional theme support will be added here
    switch (type) {
      case 'material':
      default: {
        muiTheme = createTheme(activeTheme.options);
      }
    }

    reactory.muiTheme = muiTheme;
    // Set the background color on the body to the background color of the theme
    document.body.style.backgroundColor = muiTheme.palette.background.default;
    setTheme(muiTheme);
  };

  /**
   * Handler for theme change events
   */
  const onThemeChanged = () => {
    reactory.status({
      emitLogin: false,
    }).then(() => {
      applyTheme();
    });
  };

  return {
    theme,
    applyTheme,
    onThemeChanged,
  };
};
