import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

// Import your themes
import { defaultTheme } from '../src/themes/index.js';

// Dark mode Reactory theme
const ReactoryTheme = {
  palette: {
    mode: 'dark',
    primary: {
      light: '#cf445c',
      main: '#990033',
      dark: '#64000d',
      contrastText: '#fff',
    },
    secondary: {
      light: '#e04d43',
      main: '#a8111b',
      dark: '#720000',
      contrastText: '#fff',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
      disabled: '#666666',
    },
    divider: '#333333',
    action: {
      active: '#ffffff',
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.3)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
    },
  },
};

const themes = {
  default: defaultTheme,
  ReactoryTheme: ReactoryTheme,
};

const createAppTheme = (themeConfig) => {
  return createTheme({
    palette: {
      mode: themeConfig.palette?.mode || 'light',
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
        default: themeConfig.palette?.background?.default || '#f5f5f5',
        paper: themeConfig.palette?.background?.paper || '#ffffff',
      },
      text: {
        primary: themeConfig.palette?.text?.primary || '#424242',
        secondary: themeConfig.palette?.text?.secondary || '#666666',
        disabled: themeConfig.palette?.text?.disabled || '#999999',
      },
      divider: themeConfig.palette?.divider || '#e0e0e0',
      action: {
        active: themeConfig.palette?.action?.active || '#424242',
        hover: themeConfig.palette?.action?.hover || 'rgba(0, 0, 0, 0.04)',
        selected: themeConfig.palette?.action?.selected || 'rgba(0, 0, 0, 0.08)',
        disabled: themeConfig.palette?.action?.disabled || 'rgba(0, 0, 0, 0.26)',
        disabledBackground: themeConfig.palette?.action?.disabledBackground || 'rgba(0, 0, 0, 0.12)',
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
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: themeConfig.palette?.background?.paper || '#ffffff',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: themeConfig.palette?.background?.paper || '#ffffff',
          },
        },
      },
    },
  });
};

interface ThemeWrapperProps {
  children: React.ReactNode;
  showThemeSelector?: boolean;
}

export const ThemeWrapper: React.FC<ThemeWrapperProps> = ({ 
  children, 
  showThemeSelector = false 
}) => {
  const [selectedTheme, setSelectedTheme] = useState('default');
  
  const currentThemeConfig = themes[selectedTheme as keyof typeof themes];
  const theme = createAppTheme(currentThemeConfig);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        minHeight: '100vh',
        padding: '20px'
      }}>
        {showThemeSelector && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={selectedTheme}
                label="Theme"
                onChange={(e) => setSelectedTheme(e.target.value)}
              >
                <MenuItem value="default">Default Theme (Light)</MenuItem>
                <MenuItem value="ReactoryTheme">Reactory Theme (Dark)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
        {children}
      </Box>
    </ThemeProvider>
  );
}; 