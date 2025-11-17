import type { Meta, StoryObj } from '@storybook/react';
import Loading from './Loading';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

const meta = {
  title: 'Components/Loading',
  component: Loading,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Loading component with customizable message, icon, and spinning animation.',
      },
    },
  },
  argTypes: {
    message: {
      control: 'text',
      description: 'Loading message to display',
    },
    icon: {
      control: 'text',
      description: 'Material-UI icon name',
    },
    spinIcon: {
      control: 'boolean',
      description: 'Whether to spin the icon',
    },
    nologo: {
      control: 'boolean',
      description: 'Whether to hide the logo',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Loading please stand by...',
    icon: 'cached',
    spinIcon: true,
    nologo: false,
  },
};

export const CustomMessage: Story = {
  args: {
    message: 'Processing your request...',
    icon: 'hourglass_empty',
    spinIcon: true,
    nologo: false,
  },
};

export const NoSpinning: Story = {
  args: {
    message: 'Please wait...',
    icon: 'info',
    spinIcon: false,
    nologo: false,
  },
};

export const NoLogo: Story = {
  args: {
    message: 'Loading...',
    icon: 'refresh',
    spinIcon: true,
    nologo: true,
  },
};

export const ThemeComparison: Story = {
  render: () => (
    <ThemeWrapper showThemeSelector={true}>
      <Loading message="Loading with theme selector" icon="cached" spinIcon={true} nologo={false} />
    </ThemeWrapper>
  ),
}; 