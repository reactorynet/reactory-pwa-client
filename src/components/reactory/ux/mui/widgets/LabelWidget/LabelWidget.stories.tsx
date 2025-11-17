import type { Meta, StoryObj } from '@storybook/react';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

// Mock the LabelWidget component since it has complex Reactory dependencies
const MockLabelWidget = ({ 
  formData = 'Sample Data',
  value = '',
  uiSchema = {},
  schema = {},
  idSchema = { $id: 'label-widget' },
  formContext = {},
  classes = {},
  reactory = {
    createNotification: (message: string, options: any) => console.log('Notification:', message, options),
    $func: {},
  }
}: any) => {
  const options = uiSchema?.['ui:options'] || {};
  
  let labelText = formData;
  
  // Handle format template
  if (options.format && typeof options.format === 'string') {
    try {
      // Simple template processing for demo
      labelText = options.format.replace('${formData}', formData);
    } catch (e) {
      labelText = `Template Error (${e.message})`;
    }
  }
  
  // Handle boolean values
  if (typeof formData === 'boolean' || schema?.type === 'boolean') {
    const yesLabel = options.yesLabel || 'Yes';
    const noLabel = options.noLabel || 'No';
    labelText = formData ? yesLabel : noLabel;
  }
  
  // Handle empty data
  if (formData === null || formData === undefined) {
    labelText = options.emptyText || 'No data available';
  }

  const icon = options.icon;
  const iconPosition = options.iconPosition || 'right';
  const variant = options.variant || 'body1';
  const copyToClip = options.copyToClip || false;
  const showIcon = options.showIcon !== false;

  const copy = () => {
    navigator.clipboard.writeText(labelText);
    reactory.createNotification('Copied To Clipboard!', { 
      body: `'${labelText}' successfully copied to your clipboard.`, 
      showInAppNotification: true, 
      type: 'success' 
    });
  };

  return (
    <div style={{ 
      padding: '16px', 
      border: '1px solid #e0e0e0', 
      borderRadius: '4px',
      backgroundColor: '#fafafa'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '8px'
      }}>
        {showIcon && icon && iconPosition === 'left' && (
          <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        )}
        
        <span style={{ 
          fontSize: variant === 'h6' ? '1.25rem' : 
                   variant === 'h5' ? '1.5rem' : 
                   variant === 'h4' ? '2rem' : '1rem',
          fontWeight: variant.startsWith('h') ? 500 : 400,
          color: '#333'
        }}>
          {labelText}
        </span>
        
        {showIcon && icon && iconPosition === 'right' && (
          <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        )}
        
        {copyToClip && (
          <button 
            onClick={copy}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              marginLeft: '8px',
              color: '#1976d2'
            }}
            title="Copy to clipboard"
          >
            📋
          </button>
        )}
      </div>
    </div>
  );
};

const meta = {
  title: 'Widgets/LabelWidget',
  component: MockLabelWidget,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible label widget that can display formatted text, handle templates, and support copy-to-clipboard functionality.',
      },
    },
  },
  argTypes: {
    formData: {
      control: 'text',
      description: 'The data to display in the label',
    },
    'uiSchema.ui:options.format': {
      control: 'text',
      description: 'Template format string (e.g., "${formData}")',
    },
    'uiSchema.ui:options.icon': {
      control: 'text',
      description: 'Icon to display with the label',
    },
    'uiSchema.ui:options.iconPosition': {
      control: 'select',
      options: ['left', 'right'],
      description: 'Position of the icon relative to the text',
    },
    'uiSchema.ui:options.variant': {
      control: 'select',
      options: ['body1', 'body2', 'h4', 'h5', 'h6'],
      description: 'Typography variant for the label text',
    },
    'uiSchema.ui:options.copyToClip': {
      control: 'boolean',
      description: 'Show copy to clipboard button',
    },
    'uiSchema.ui:options.emptyText': {
      control: 'text',
      description: 'Text to show when formData is empty',
    },
    'uiSchema.ui:options.yesLabel': {
      control: 'text',
      description: 'Label for boolean true value',
    },
    'uiSchema.ui:options.noLabel': {
      control: 'text',
      description: 'Label for boolean false value',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof MockLabelWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    formData: 'Sample Label Text',
    uiSchema: {
      'ui:options': {
        format: '${formData}',
        variant: 'body1',
      },
    },
    schema: {
      type: 'string',
    },
  },
};

export const WithIcon: Story = {
  args: {
    formData: 'User Profile',
    uiSchema: {
      'ui:options': {
        format: '${formData}',
        icon: '👤',
        iconPosition: 'left',
        variant: 'h6',
      },
    },
    schema: {
      type: 'string',
    },
  },
};

export const WithCopyToClipboard: Story = {
  args: {
    formData: 'Copy this text to clipboard',
    uiSchema: {
      'ui:options': {
        format: '${formData}',
        copyToClip: true,
        icon: '📋',
        iconPosition: 'right',
      },
    },
    schema: {
      type: 'string',
    },
  },
};

export const BooleanTrue: Story = {
  args: {
    formData: "true",
    uiSchema: {
      'ui:options': {
        yesLabel: 'Active',
        noLabel: 'Inactive',
        icon: '✅',
        iconPosition: 'left',
      },
    },
    schema: {
      type: 'boolean',
    },
  },
};

export const BooleanFalse: Story = {
  args: {
    formData: "false",
    uiSchema: {
      'ui:options': {
        yesLabel: 'Active',
        noLabel: 'Inactive',
        icon: '❌',
        iconPosition: 'left',
      },
    },
    schema: {
      type: 'boolean',
    },
  },
};

export const EmptyData: Story = {
  args: {
    formData: null,
    uiSchema: {
      'ui:options': {
        emptyText: 'No data available',
        icon: '⚠️',
        iconPosition: 'left',
      },
    },
    schema: {
      type: 'string',
    },
  },
};

export const CustomTemplate: Story = {
  args: {
    formData: 'John Doe',
    uiSchema: {
      'ui:options': {
        format: 'User: ${formData}',
        variant: 'h5',
        icon: '👨‍💼',
        iconPosition: 'right',
      },
    },
    schema: {
      type: 'string',
    },
  },
}; 