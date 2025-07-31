import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { 
  Link as MuiLink,
  Icon,
  Box,
  Typography
} from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

// Mock Link component since it has React Router dependencies
const MockLink = ({ 
  link = '/example',
  linkTitle = 'Example Link',
  format = '${link}',
  title = '',
  icon = '',
  iconType = '',
  theme
}: any) => {
  let linkText = format.replace('${link}', link);
  let linkTitleText = title || linkTitle;
  let linkIcon = null;

  if (icon) {
    const iconProps = { style: { marginLeft: 8 } };
    linkIcon = <Icon {...iconProps}>{icon}</Icon>;
  }

  return (
    <MuiLink 
      href={linkText} 
      color="primary" 
      underline="hover"
      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
    >
      {linkTitleText}
      {linkIcon}
    </MuiLink>
  );
};

const meta = {
  title: 'Components/Link',
  component: MockLink,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Link component with customizable text, icons, and formatting.',
      },
    },
  },
  argTypes: {
    link: {
      control: 'text',
      description: 'Link URL',
    },
    linkTitle: {
      control: 'text',
      description: 'Link text',
    },
    format: {
      control: 'text',
      description: 'Format template for link URL',
    },
    title: {
      control: 'text',
      description: 'Custom title template',
    },
    icon: {
      control: 'text',
      description: 'Material-UI icon name',
    },
    iconType: {
      control: 'text',
      description: 'Icon type for custom icons',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ padding: '20px' }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof MockLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    link: '/dashboard',
    linkTitle: 'Go to Dashboard',
    format: '${link}',
    title: '',
    icon: '',
    iconType: '',
  },
};

export const WithIcon: Story = {
  args: {
    link: '/settings',
    linkTitle: 'Settings',
    format: '${link}',
    title: '',
    icon: 'settings',
    iconType: '',
  },
};

export const CustomFormat: Story = {
  args: {
    link: 'user-123',
    linkTitle: 'View Profile',
    format: '/users/${link}',
    title: '',
    icon: 'person',
    iconType: '',
  },
};

export const CustomTitle: Story = {
  args: {
    link: '/help',
    linkTitle: 'Help',
    format: '${link}',
    title: 'Get ${linkTitle}',
    icon: 'help',
    iconType: '',
  },
};

export const ExternalLink: Story = {
  args: {
    link: 'https://example.com',
    linkTitle: 'External Site',
    format: '${link}',
    title: '',
    icon: 'open_in_new',
    iconType: '',
  },
}; 