import type { Meta, StoryObj } from '@storybook/react';
import { Icon, Box, Typography } from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

const meta = {
  title: 'Design System/IconTest',
  component: Icon,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Test Material Icons font loading.',
      },
    },
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Icon name',
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'error', 'warning', 'info', 'success', 'inherit'],
      description: 'Icon color',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={true}>
        <Box sx={{ padding: '20px', maxWidth: '800px' }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CommonIcons: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Common Material Icons Test</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Icon color="primary">home</Icon>
        <Icon color="secondary">search</Icon>
        <Icon color="error">error</Icon>
        <Icon color="warning">warning</Icon>
        <Icon color="info">info</Icon>
        <Icon color="success">check_circle</Icon>
        <Icon>settings</Icon>
        <Icon>person</Icon>
        <Icon>email</Icon>
        <Icon>phone</Icon>
        <Icon>favorite</Icon>
        <Icon>star</Icon>
        <Icon>cached</Icon>
        <Icon>refresh</Icon>
        <Icon>download</Icon>
        <Icon>upload</Icon>
        <Icon>delete</Icon>
        <Icon>edit</Icon>
        <Icon>add</Icon>
        <Icon>close</Icon>
      </Box>
    </Box>
  ),
};

export const LoadingIcons: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Loading Icons Test</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Icon sx={{ animation: 'spin 2s linear infinite' }}>cached</Icon>
        <Icon sx={{ animation: 'spin 2s linear infinite' }}>refresh</Icon>
        <Icon sx={{ animation: 'spin 2s linear infinite' }}>sync</Icon>
        <Icon sx={{ animation: 'spin 2s linear infinite' }}>autorenew</Icon>
      </Box>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  ),
};

export const SingleIcon: Story = {
  args: {
    children: 'home',
    color: 'primary',
  },
}; 