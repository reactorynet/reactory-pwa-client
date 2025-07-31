# Storybook Setup for Reactory PWA Client

## Overview
Storybook has been successfully set up for the Reactory PWA Client application. This allows you to develop and test React components in isolation with your actual application themes, fonts, and colors.

## Getting Started

### Running Storybook
```bash
# Start Storybook development server
yarn storybook

# Or with a specific port
yarn storybook --port 6006
```

### Building Storybook
```bash
# Build Storybook for production
yarn build-storybook
```

## Available Stories

### Components/Loading
- **Default**: Basic loading component with spinning icon
- **CustomMessage**: Loading with custom message and hourglass icon
- **NoSpinning**: Loading without spinning animation
- **NoLogo**: Loading without the logo display
- **ThemeComparison**: Side-by-side comparison of different themes

### Components/MaterialInput
- **Default**: Basic text input with placeholder
- **WithIcon**: Input with left-positioned icon
- **WithRightIcon**: Input with right-positioned icon
- **WithDefaultValue**: Input with pre-filled default value

### Components/Label
- **Default**: Basic label with default styling
- **LargeHeading**: Large heading variant
- **WithFormat**: Label with template formatting
- **BodyText**: Body text variant
- **Caption**: Small caption text

## Themes and Styling

### Available Themes
Storybook includes your actual application themes:

1. **Default Theme**: Standard Reactory theme with gray primary colors
2. **TowerStone Theme**: TowerStone-specific theme with burgundy primary colors

### Fonts and Typography
- **Primary Font**: Roboto (Material-UI default)
- **Fallback Fonts**: Helvetica, Arial, sans-serif
- **Typography Scale**: Material-UI typography system with proper sizing

### Colors
- **Primary Colors**: Matches your application's primary color palette
- **Secondary Colors**: Matches your application's secondary color palette
- **Background Colors**: Light gray backgrounds matching your app
- **Text Colors**: Proper contrast ratios for accessibility

### Theme Switching
Some stories include a theme selector that allows you to switch between different application themes in real-time.

## Creating New Stories

To create a new story for a component:

1. Create a `.stories.tsx` file next to your component
2. Use the following template:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeWrapper } from '../../../.storybook/ThemeWrapper';
import YourComponent from './YourComponent';

const meta: Meta<typeof YourComponent> = {
  title: 'Components/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Description of your component',
      },
    },
  },
  argTypes: {
    // Define your component props here
    propName: {
      control: 'text',
      description: 'Description of the prop',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={true}>
        <Story />
      </ThemeWrapper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Your component props
  },
};
```

### Theme-Aware Stories
To create stories that demonstrate theme differences:

```typescript
export const ThemeComparison: Story = {
  args: {
    // Your component props
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>Default Theme</h3>
          <ThemeWrapper showThemeSelector={false}>
            <Story />
          </ThemeWrapper>
        </div>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>TowerStone Theme</h3>
          <ThemeWrapper showThemeSelector={false}>
            <Story />
          </ThemeWrapper>
        </div>
      </div>
    ),
  ],
};
```

## Configuration

### Storybook Configuration Files
- `.storybook/main.js`: Main configuration file with TypeScript and webpack setup
- `.storybook/preview.js`: Preview configuration with Material-UI theme integration
- `.storybook/manager.js`: Manager configuration with custom branding
- `.storybook/ThemeWrapper.tsx`: Theme wrapper component for switching themes

### Features
- ✅ TypeScript support
- ✅ Material-UI theme integration
- ✅ CSS/SCSS support
- ✅ Component documentation
- ✅ Interactive controls
- ✅ Theme switching capability
- ✅ Real application fonts and colors
- ✅ Background color options
- ✅ Custom Storybook branding

### Theme Integration
- **Real Themes**: Uses your actual application theme configurations
- **Font Consistency**: Matches your application's typography
- **Color Accuracy**: Uses your exact color palette
- **Component Styling**: Proper Material-UI component overrides

## Troubleshooting

### Common Issues

1. **Version Mismatches**: If you see version compatibility errors, ensure all Storybook packages are the same version
2. **Missing Dependencies**: Some components may require additional dependencies that aren't available in Storybook context
3. **CSS Issues**: If CSS imports fail, check that the styles are properly configured in the webpack configuration
4. **Theme Issues**: If themes don't load, check that the theme files are properly imported

### Getting Help
- Storybook documentation: https://storybook.js.org/
- Material-UI with Storybook: https://mui.com/material-ui/getting-started/installation/
- TypeScript with Storybook: https://storybook.js.org/docs/react/configure/typescript

## Next Steps

1. Create stories for more components
2. Add more addons as needed (controls, actions, etc.)
3. Set up visual regression testing
4. Integrate with your CI/CD pipeline
5. Add more theme variations
6. Create component documentation with design tokens 