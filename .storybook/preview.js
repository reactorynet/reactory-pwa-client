import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';

// Set up environment variables for Storybook
if (typeof window !== 'undefined') {
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  window.process.env.CDN_ROOT = window.process.env.CDN_ROOT || 'https://cdn.reactory.net';
}

// Import your actual themes
import { defaultTheme } from '../src/themes/index.js';
import { ThemeWrapper } from './ThemeWrapper';
import { ReactoryDecorator } from './ReactoryDecorator';

// Create theme instances based on your actual themes
const createAppTheme = (themeConfig) => {
  return createTheme({
    palette: {
      primary: {
        light: themeConfig.palette?.primary?.light || '#6d6d6d',
        main: themeConfig.palette?.primary?.main || '#424242',
        dark: themeConfig.palette?.primary?.dark || '#1b1b1b',
        contrastText: themeConfig.palette?.primary?.contrastText || '#ffffff',
      },
      secondary: {
        light: themeConfig.palette?.secondary?.light || '#ff9e40',
        main: themeConfig.palette?.secondary?.main || '#ff6d00',
        dark: themeConfig.palette?.secondary?.dark || '#c43c00',
        contrastText: themeConfig.palette?.secondary?.contrastText || '#fff',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      text: {
        primary: '#424242',
        secondary: '#666666',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 300,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 300,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 400,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 400,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 400,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 500,
      },
      body1: {
        fontSize: '1rem',
        fontWeight: 400,
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: 400,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
      },
    },
    spacing: 8,
    shape: {
      borderRadius: 4,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 4,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 4,
          },
        },
      },
    },
  });
};

// Create theme instances
const defaultAppTheme = createAppTheme(defaultTheme);

/** @type { import('@storybook/react-webpack5').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    layout: 'centered',
    docs: {
      source: {
        type: 'dynamic',
        excludeDecorators: true,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#f5f5f5',
        },
        {
          name: 'dark',
          value: '#424242',
        },
        {
          name: 'white',
          value: '#ffffff',
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ReactoryDecorator>
        <ThemeWrapper showThemeSelector={false}>
          <CssBaseline />
          <Story />
        </ThemeWrapper>
      </ReactoryDecorator>
    ),
  ],
};

export default preview;