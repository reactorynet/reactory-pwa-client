import type { Meta, StoryObj } from '@storybook/react';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

// Mock the LinkFieldWidget component since it has complex Reactory dependencies
const MockLinkFieldWidget = ({ 
  formData = 'dashboard',
  schema = {},
  uiSchema = {},
  idSchema = { $id: 'link-widget' }
}: any) => {
  const uioptions = uiSchema?.['ui:options'] || {};
  
  let linkText = `/${formData}`;
  let linkTitle = formData;
  let labelTitle = schema?.title || idSchema?.$id;
  let linkIcon = null;
  let _iconPosition = 'right';
  let _variant = 'text';
  let _component = 'button';
  let showLabel = true;
  let useRouterLink = true;

  // Process UI options
  if (uioptions) {
    const {
      format,
      title,
      icon,
      iconPosition,
      variant,
      component = 'button',
      showLabel: _showLabel = true,
      useRouter = true,
    } = uioptions;
    
    if (format) linkText = format.replace('${formData}', formData);
    if (title) linkTitle = title.replace('${formData}', formData);
    if (variant) _variant = variant;
    if (iconPosition) _iconPosition = iconPosition;
    _component = component;
    showLabel = _showLabel !== false;
    useRouterLink = useRouter !== false;
    
    if (icon) {
      linkIcon = <span style={{ fontSize: '1.2rem' }}>{icon}</span>;
    }
  }

  const goto = () => {
    console.log('Navigating to:', linkText);
    // In a real app, this would use React Router navigation
    if (useRouterLink) {
      console.log('Using router navigation');
    } else {
      console.log('Opening external link');
    }
  };

  const renderComponent = () => {
    switch (_component) {
      case 'iconbutton': {
        return (
          <button
            onClick={goto}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '40px',
              minHeight: '40px',
            }}
            title={linkTitle}
          >
            {linkIcon}
          </button>
        );
      }
      case 'label': {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{linkTitle}</span>
            <button
              onClick={goto}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              {linkIcon}
            </button>
          </div>
        );
      }
      case 'link': {
        return (
          <a
            href={linkText}
            style={{
              color: '#1976d2',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onClick={(e) => {
              if (useRouterLink) {
                e.preventDefault();
                goto();
              }
            }}
          >
            {_iconPosition === 'left' ? linkIcon : null}
            {linkTitle}
            {_iconPosition === 'right' ? linkIcon : null}
          </a>
        );
      }
      case 'button':
      default: {
        return (
          <button
            onClick={goto}
            style={{
              background: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {_iconPosition === 'left' ? linkIcon : null}
            {linkTitle}
            {_iconPosition === 'right' ? linkIcon : null}
          </button>
        );
      }
    }
  };

  if (showLabel !== true) {
    return renderComponent();
  } else {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {labelTitle && (
          <label style={{ fontSize: '14px', color: '#666' }}>
            {labelTitle}
          </label>
        )}
        {renderComponent()}
      </div>
    );
  }
};

const meta = {
  title: 'Widgets/LinkFieldWidget',
  component: MockLinkFieldWidget,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible link widget that can render as buttons, links, or icon buttons with customizable formatting and navigation.',
      },
    },
  },
  argTypes: {
    formData: {
      control: 'text',
      description: 'The link data (URL path or identifier)',
    },
    'uiSchema.ui:options.format': {
      control: 'text',
      description: 'Template format for the link URL (e.g., "/users/${formData}")',
    },
    'uiSchema.ui:options.title': {
      control: 'text',
      description: 'Template format for the link title (e.g., "View ${formData}")',
    },
    'uiSchema.ui:options.icon': {
      control: 'text',
      description: 'Icon to display with the link',
    },
    'uiSchema.ui:options.iconPosition': {
      control: 'select',
      options: ['left', 'right'],
      description: 'Position of the icon relative to the text',
    },
    'uiSchema.ui:options.component': {
      control: 'select',
      options: ['button', 'link', 'iconbutton', 'label'],
      description: 'Component type to render',
    },
    'uiSchema.ui:options.variant': {
      control: 'select',
      options: ['text', 'contained', 'outlined'],
      description: 'Button variant (for button component)',
    },
    'uiSchema.ui:options.useRouter': {
      control: 'boolean',
      description: 'Use React Router navigation instead of external links',
    },
    'uiSchema.ui:options.showLabel': {
      control: 'boolean',
      description: 'Show the field label',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof MockLinkFieldWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    formData: 'dashboard',
    schema: {
      title: 'Navigation Link',
    },
    uiSchema: {
      'ui:options': {
        format: '/${formData}',
        title: 'Go to ${formData}',
        component: 'button',
        variant: 'text',
      },
    },
  },
};

export const ButtonWithIcon: Story = {
  args: {
    formData: 'settings',
    schema: {
      title: 'Settings',
    },
    uiSchema: {
      'ui:options': {
        format: '/${formData}',
        title: '${formData}',
        icon: '⚙️',
        iconPosition: 'left',
        component: 'button',
        variant: 'contained',
      },
    },
  },
};

export const LinkWithIcon: Story = {
  args: {
    formData: 'profile',
    schema: {
      title: 'User Profile',
    },
    uiSchema: {
      'ui:options': {
        format: '/users/${formData}',
        title: 'View Profile',
        icon: '👤',
        iconPosition: 'right',
        component: 'link',
        useRouter: true,
      },
    },
  },
};

export const IconButton: Story = {
  args: {
    formData: 'help',
    schema: {
      title: 'Help',
    },
    uiSchema: {
      'ui:options': {
        format: '/${formData}',
        title: 'Help',
        icon: '❓',
        component: 'iconbutton',
        showLabel: false,
      },
    },
  },
};

export const LabelWithIcon: Story = {
  args: {
    formData: 'document',
    schema: {
      title: 'Document',
    },
    uiSchema: {
      'ui:options': {
        format: '/documents/${formData}',
        title: 'View Document',
        icon: '📄',
        component: 'label',
      },
    },
  },
};

export const ExternalLink: Story = {
  args: {
    formData: 'https://example.com',
    schema: {
      title: 'External Link',
    },
    uiSchema: {
      'ui:options': {
        format: '${formData}',
        title: 'Visit External Site',
        icon: '🔗',
        iconPosition: 'right',
        component: 'link',
        useRouter: false,
      },
    },
  },
};

export const CustomFormat: Story = {
  args: {
    formData: 'user-123',
    schema: {
      title: 'User Details',
    },
    uiSchema: {
      'ui:options': {
        format: '/users/${formData}/details',
        title: 'View ${formData} Details',
        icon: '👨‍💼',
        iconPosition: 'left',
        component: 'button',
        variant: 'outlined',
      },
    },
  },
};

export const NoLabel: Story = {
  args: {
    formData: 'home',
    schema: {
      title: 'Home',
    },
    uiSchema: {
      'ui:options': {
        format: '/${formData}',
        title: 'Home',
        icon: '🏠',
        component: 'button',
        showLabel: false,
      },
    },
  },
}; 