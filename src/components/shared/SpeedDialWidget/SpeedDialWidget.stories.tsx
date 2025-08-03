import type { Meta, StoryObj } from '@storybook/react';
import SpeedDialWidget, { SpeedDialAction } from './SpeedDialWidget';
import FileCopyIcon from '@mui/icons-material/FileCopyOutlined';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';
import { Avatar } from '@mui/material';


export const WithAvatarIcon: Story = {
  args: {
    actions: [
     {
        key: 'avatar',
        icon: <Avatar alt="User" src="https://randomuser.me/api/portraits/men/32.jpg" />,
        title: 'User Profile',
        clickHandler: () => alert('User Profile clicked'),}
    ],
    icon: <Avatar alt="User" src="https://randomuser.me/api/portraits/men/32.jpg" />,
  },
};

const actions: SpeedDialAction[] = [
  {
    key: 'copy',
    icon: <FileCopyIcon />,
    title: 'Copy',
    clickHandler: () => alert('Copy clicked'),
  },
  {
    key: 'save',
    icon: <SaveIcon />,
    title: 'Save',
    clickHandler: () => alert('Save clicked'),
  },
  {
    key: 'print',
    icon: <PrintIcon />,
    title: 'Print',
    clickHandler: () => alert('Print clicked'),
  },
  {
    key: 'share',
    icon: <ShareIcon />,
    title: 'Share',
    clickHandler: () => alert('Share clicked'),
  },
  {
    key: 'delete',
    icon: <DeleteIcon />,
    title: 'Delete',
    clickHandler: () => alert('Delete clicked'),
  },
];

const meta = {
  title: 'Components/SpeedDialWidget',
  component: SpeedDialWidget,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A floating action button that reveals related actions. Supports direction, icon, and custom actions.',
      },
    },
  },
  argTypes: {
    actions: {
      control: false,
      description: 'Array of SpeedDialAction objects',
    },
    icon: {
      control: false,
      description: 'Custom icon for the main button',
    },
    style: {
      control: false,
      description: 'Style for the wrapper',
    },
    buttonStyle: {
      control: false,
      description: 'Style for the SpeedDial button',
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'Size of the SpeedDial button',
    },
    elevation: {
      control: { type: 'range', min: 0, max: 24, step: 1 },
      description: 'Shadow elevation level',
    },
    color: {
      control: { type: 'select' },
      options: ['default', 'primary', 'secondary'],
      description: 'Color theme of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the SpeedDial is disabled',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof SpeedDialWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    actions,
  },
};

export const WithCustomIcon: Story = {
  args: {
    actions,
    icon: <SaveIcon />,
    size: 'medium',
    elevation: 8,
    color: 'secondary',
  },
};

export const SmallSize: Story = {
  args: {
    actions,
    size: 'small',
    elevation: 4,
  },
};

export const LargeWithHighElevation: Story = {
  args: {
    actions,
    size: 'large',
    elevation: 16,
    color: 'primary',
  },
};

export const Disabled: Story = {
  args: {
    actions,
    disabled: true,
    size: 'medium',
  },
};

export const ThemeComparison: Story = {
  render: () => (
    <ThemeWrapper showThemeSelector={true}>
      <SpeedDialWidget actions={actions} />
    </ThemeWrapper>
  ),
};
