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
    classes: {},
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
    position: {
      control: { type: 'select' },
      options: ['absolute', 'top-left', 'top-right', 'top-center', 'bottom-left', 'bottom-right', 'bottom-center', 'center-left', 'center-right', 'center'],
      description: 'Predefined position with automatic CSS positioning',
    },
    offsetLeft: {
      control: { type: 'number' },
      description: 'Left offset in pixels',
    },
    offsetRight: {
      control: { type: 'number' },
      description: 'Right offset in pixels',
    },
    offsetTop: {
      control: { type: 'number' },
      description: 'Top offset in pixels',
    },
    offsetBottom: {
      control: { type: 'number' },
      description: 'Bottom offset in pixels',
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
    classes: {},
    actions,
  },
};

export const WithCustomIcon: Story = {
  args: {
    classes: {},
    actions,
    icon: <SaveIcon />,
    size: 'medium',
    elevation: 8,
    color: 'secondary',
  },
};

export const SmallSize: Story = {
  args: {
    classes: {},
    actions,
    size: 'small',
    elevation: 4,
  },
};

export const LargeWithHighElevation: Story = {
  args: {
    classes: {},
    actions,
    size: 'large',
    elevation: 16,
    color: 'primary',
  },
};

export const Disabled: Story = {
  args: {
    classes: {},
    actions,
    disabled: true,
    size: 'medium',
  },
};

export const FixedPositioning: Story = {
  args: {
    classes: {},
    actions,
    position: 'bottom-right',
    offsetBottom: 50,
    offsetRight: 50,
    size: 'medium',
    elevation: 12,
  },
};

export const TopLeftPositioned: Story = {
  args: {
    classes: {},
    actions,
    position: 'top-left',
    offsetTop: 50,
    offsetLeft: 50,
    size: 'small',
    color: 'secondary',
  },
};

export const TopCenterPositioned: Story = {
  args: {
    classes: {},
    actions,
    position: 'top-center',
    offsetTop: 60,
    size: 'medium',
    color: 'primary',
  },
};

export const CenterPositioned: Story = {
  args: {
    classes: {},
    actions,
    position: 'center',
    size: 'large',
    elevation: 20,
  },
};

export const CenterLeftPositioned: Story = {
  args: {
    classes: {},
    actions,
    position: 'center-left',
    offsetLeft: 80,
    size: 'medium',
    color: 'secondary',
  },
};

export const ThemeComparison: Story = {
  args: {
    classes: {},
    actions: actions,
  },
  render: () => (
    <ThemeWrapper showThemeSelector={true}>
      <SpeedDialWidget classes={{}} actions={actions} />
    </ThemeWrapper>
  ),
};

export const OffsetComparison: Story = {
  args: {
    classes: {},
    actions: actions.slice(0, 2),
  },
  render: () => (
    <div style={{ position: 'relative', height: '500px', width: '100%', border: '1px dashed #ccc' }}>
      <SpeedDialWidget 
        classes={{}}
        actions={actions.slice(0, 2)} 
        position="bottom-right" 
        offsetBottom={16} 
        offsetRight={16} 
        size="small"
        color="primary"
      />
      <SpeedDialWidget 
        classes={{}}
        actions={actions.slice(2, 4)} 
        position="bottom-right" 
        offsetBottom={80} 
        offsetRight={80} 
        size="medium"
        color="secondary"
      />
      <SpeedDialWidget 
        classes={{}}
        actions={actions.slice(0, 1)} 
        position="top-left" 
        offsetTop={16} 
        offsetLeft={16} 
        size="small"
        color="primary"
      />
      <SpeedDialWidget 
        classes={{}}
        actions={actions.slice(1, 2)} 
        position="top-left" 
        offsetTop={80} 
        offsetLeft={80} 
        size="medium"
        color="secondary"
      />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
