/**
 * LabelWidgetV2 Storybook Stories
 * 
 * Stories for the refactored LabelWidget component demonstrating
 * all available features and styling options.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Paper } from '@mui/material';

// Create a mock reactory context provider for stories
const mockReactory = {
  log: (...args: any[]) => console.log('[Reactory]', ...args),
  createNotification: (title: string, options: any) => {
    console.log('[Notification]', title, options);
    alert(`${title}\n${options.body}`);
  },
  graphqlQuery: async () => ({ data: null }),
  utils: {
    objectMapper: (src: any, map: any) => ({}),
  },
  getComponent: () => null,
  componentRegister: {},
  $func: {
    customFormatter: (props: any) => `Formatted: ${props.formData}`,
  },
};

// Mock the useReactory hook for Storybook
jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: () => mockReactory,
}));

// Import the component (this will use the mock)
import { LabelWidget } from './LabelWidgetV2';
import type { LabelWidgetProps } from './types';

// Theme for stories
const theme = createTheme();

// Decorator to provide theme
const ThemeDecorator = (Story: React.FC) => (
  <ThemeProvider theme={theme}>
    <Box sx={{ p: 2, minWidth: 300 }}>
      <Story />
    </Box>
  </ThemeProvider>
);

// Story container for better visual presentation
const StoryContainer: React.FC<{ children: React.ReactNode; title?: string }> = ({ 
  children, 
  title 
}) => (
  <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
    {title && (
      <Box sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary', fontSize: '0.875rem' }}>
        {title}
      </Box>
    )}
    {children}
  </Paper>
);

const meta: Meta<typeof LabelWidget> = {
  title: 'Widgets/LabelWidgetV2',
  component: LabelWidget,
  decorators: [ThemeDecorator],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# LabelWidget v2.0

A versatile label/display widget for ReactoryForm that supports:

- **Template-based formatting** using lodash templates
- **Boolean value display** with custom labels and icons
- **Icon rendering** (Material icons and theme extensions)
- **Copy to clipboard** functionality
- **Dynamic component mounting** via componentFqn
- **HTML rendering**
- **Modern sx prop support** with backward compatibility

## Usage

\`\`\`json
{
  "ui:widget": "LabelWidget",
  "ui:options": {
    "variant": "h6",
    "format": "Hello, \${formData.name}!",
    "icon": "person",
    "iconPosition": "left",
    "copyToClipboard": true,
    "containerSx": { "p": 2, "bgcolor": "grey.100" }
  }
}
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    formData: {
      control: 'text',
      description: 'The data value to display',
    },
  },
};

export default meta;
type Story = StoryObj<typeof LabelWidget>;

// Default props helper
// formContext is optional, not needed for stories
const baseProps: Partial<LabelWidgetProps> = {
  schema: { type: 'string' },
  idSchema: { $id: 'story-label' },
};

/**
 * Basic text label with default styling
 */
export const Default: Story = {
  args: {
    ...baseProps,
    formData: 'Hello World',
    uiSchema: {},
  },
};

/**
 * Label with H6 typography variant
 */
export const HeadingVariant: Story = {
  args: {
    ...baseProps,
    formData: 'Section Title',
    uiSchema: {
      'ui:options': {
        variant: 'h6' as const,
      },
    },
  },
};

/**
 * Label with template formatting
 */
export const WithTemplate: Story = {
  args: {
    ...baseProps,
    formData: { name: 'John', role: 'Admin' },
    uiSchema: {
      'ui:options': {
        format: 'User: ${formData.name} (${formData.role})',
        variant: 'body1' as const,
      },
    },
  },
};

/**
 * Label with icon on the left
 */
export const WithIconLeft: Story = {
  args: {
    ...baseProps,
    formData: 'john@example.com',
    uiSchema: {
      'ui:options': {
        icon: 'email',
        iconPosition: 'left' as const,
      },
    },
  },
};

/**
 * Label with icon on the right
 */
export const WithIconRight: Story = {
  args: {
    ...baseProps,
    formData: 'View Details',
    uiSchema: {
      'ui:options': {
        icon: 'arrow_forward',
        iconPosition: 'right' as const,
        variant: 'button' as const,
      },
    },
  },
};

/**
 * Label with inline icon
 */
export const WithIconInline: Story = {
  args: {
    ...baseProps,
    formData: 'Important Notice',
    uiSchema: {
      'ui:options': {
        icon: 'warning',
        iconPosition: 'inline' as const,
        iconSx: { color: 'warning.main' },
      },
    },
  },
};

/**
 * Label with copy to clipboard button
 */
export const WithCopyButton: Story = {
  args: {
    ...baseProps,
    formData: 'API-KEY-12345-ABCDE',
    uiSchema: {
      'ui:options': {
        copyToClipboard: true,
        variant: 'body2' as const,
        containerSx: { 
          bgcolor: 'grey.100', 
          p: 1, 
          borderRadius: 1,
          fontFamily: 'monospace',
        },
      },
    },
  },
};

/**
 * Boolean value with Yes/No labels
 */
export const BooleanYes: Story = {
  args: {
    ...baseProps,
    formData: true,
    schema: { type: 'boolean' },
    uiSchema: {
      'ui:options': {
        yesLabel: 'Active',
        noLabel: 'Inactive',
        yesIcon: 'check_circle',
        noIcon: 'cancel',
        yesIconOptions: { color: 'success.main' },
        noIconOptions: { color: 'error.main' },
      },
    },
  },
};

/**
 * Boolean value showing No state
 */
export const BooleanNo: Story = {
  args: {
    ...baseProps,
    formData: false,
    schema: { type: 'boolean' },
    uiSchema: {
      'ui:options': {
        yesLabel: 'Enabled',
        noLabel: 'Disabled',
        yesIcon: 'toggle_on',
        noIcon: 'toggle_off',
        yesIconOptions: { color: 'success.main' },
        noIconOptions: { color: 'text.disabled' },
      },
    },
  },
};

/**
 * Empty/null value with custom empty text
 */
export const EmptyValue: Story = {
  args: {
    ...baseProps,
    formData: null,
    uiSchema: {
      'ui:options': {
        emptyText: 'No data provided',
        icon: 'info',
        iconPosition: 'left' as const,
        containerSx: { 
          color: 'text.secondary',
          fontStyle: 'italic',
        },
      },
    },
  },
};

/**
 * Label with HTML content
 */
export const HTMLContent: Story = {
  args: {
    ...baseProps,
    formData: '<strong>Bold</strong> and <em>italic</em> text',
    uiSchema: {
      'ui:options': {
        renderHtml: true,
      },
    },
  },
};

/**
 * Label with modern sx styling
 */
export const ModernStyling: Story = {
  args: {
    ...baseProps,
    formData: 'Styled Label',
    uiSchema: {
      'ui:options': {
        variant: 'h6' as const,
        icon: 'star',
        iconPosition: 'left' as const,
        containerSx: {
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          p: 2,
          borderRadius: 2,
          boxShadow: 1,
        },
        iconSx: {
          color: 'warning.main',
        },
      },
    },
  },
};

/**
 * Label with legacy style props (backward compatibility)
 */
export const LegacyStyling: Story = {
  args: {
    ...baseProps,
    formData: 'Legacy Styled',
    uiSchema: {
      'ui:options': {
        containerProps: {
          style: {
            backgroundColor: '#e3f2fd',
            padding: '16px',
            borderRadius: '8px',
          },
        },
        bodyProps: {
          style: {
            color: '#1565c0',
          },
        },
      },
    },
  },
};

/**
 * Multiple labels showcasing different variants
 */
export const TypographyVariants: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {(['h4', 'h5', 'h6', 'subtitle1', 'body1', 'body2', 'caption'] as const).map((variant) => (
        <LabelWidget
          key={variant}
          {...baseProps}
          formData={`Variant: ${variant}`}
          uiSchema={{
            'ui:options': {
              variant,
              containerSx: { border: '1px dashed', borderColor: 'divider', p: 1 },
            },
          }}
        />
      ))}
    </Box>
  ),
};

/**
 * Complete feature showcase
 */
export const FeatureShowcase: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
      <StoryContainer title="Basic Text">
        <LabelWidget
          {...baseProps}
          formData="Simple text label"
          uiSchema={{}}
        />
      </StoryContainer>
      
      <StoryContainer title="With Icon">
        <LabelWidget
          {...baseProps}
          formData="user@example.com"
          uiSchema={{
            'ui:options': {
              icon: 'email',
              iconPosition: 'left' as const,
            },
          }}
        />
      </StoryContainer>
      
      <StoryContainer title="With Copy Button">
        <LabelWidget
          {...baseProps}
          formData="COPY-ME-123"
          uiSchema={{
            'ui:options': {
              copyToClipboard: true,
              containerSx: { fontFamily: 'monospace' },
            },
          }}
        />
      </StoryContainer>
      
      <StoryContainer title="Boolean Display">
        <Box sx={{ display: 'flex', gap: 4 }}>
          <LabelWidget
            {...baseProps}
            formData={true}
            schema={{ type: 'boolean' }}
            uiSchema={{
              'ui:options': {
                yesLabel: 'Yes',
                noLabel: 'No',
                yesIcon: 'check',
                yesIconOptions: { color: 'success.main' },
              },
            }}
          />
          <LabelWidget
            {...baseProps}
            formData={false}
            schema={{ type: 'boolean' }}
            uiSchema={{
              'ui:options': {
                yesLabel: 'Yes',
                noLabel: 'No',
                noIcon: 'close',
                noIconOptions: { color: 'error.main' },
              },
            }}
          />
        </Box>
      </StoryContainer>
      
      <StoryContainer title="Styled Container">
        <LabelWidget
          {...baseProps}
          formData="Premium Feature"
          uiSchema={{
            'ui:options': {
              variant: 'h6' as const,
              icon: 'star',
              iconPosition: 'left' as const,
              containerSx: {
                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                color: 'white',
                p: 2,
                borderRadius: 2,
              },
              iconSx: { color: '#FFD700' },
            },
          }}
        />
      </StoryContainer>
    </Box>
  ),
};
