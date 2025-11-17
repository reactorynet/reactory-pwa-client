import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

// Create a custom theme for the Storybook UI
const theme = create({
  base: 'light',
  brandTitle: 'Reactory PWA Client',
  brandUrl: 'https://app.reactory.net/',
  brandImage: undefined,
  brandTarget: '_self',

  // UI
  appBg: '#f5f5f5',
  appContentBg: '#ffffff',
  appBorderColor: '#e1e1e1',
  appBorderRadius: 4,

  // Text colors
  textColor: '#424242',
  textInverseColor: '#ffffff',

  // Toolbar default and active colors
  barTextColor: '#666666',
  barSelectedColor: '#424242',
  barBg: '#ffffff',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#e1e1e1',
  inputTextColor: '#424242',
  inputBorderRadius: 4,
});

addons.setConfig({
  theme,
  sidebar: {
    showRoots: true,
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
}); 