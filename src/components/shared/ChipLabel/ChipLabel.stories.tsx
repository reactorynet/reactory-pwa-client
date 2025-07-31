import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { 
  Chip,
  Avatar,
  Box,
  Typography
} from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

// Mock ChipLabel component since it has Reactory dependencies
const MockChipLabel = ({ 
  formData = [],
  title = '',
  format = '${who}',
  useUserAvatar = false,
  chips = []
}: any) => {
  const chipData = formData && formData.length > 0 ? formData : chips;
  
  const renderChips = () => {
    return chipData.map((chip: any, index: number) => {
      let chipLabel = format ? format.replace('${who}', chip) : chip;
      let avatar = useUserAvatar ? <Avatar alt={chipLabel} src={`https://via.placeholder.com/32x32?text=${chipLabel.charAt(0)}`} /> : null;

      return (
        <Chip 
          avatar={avatar} 
          style={{ marginRight: '5px', marginBottom: '5px' }} 
          key={index} 
          variant="outlined" 
          label={chipLabel} 
        />
      );
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      {title && (
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          {title}
        </Typography>
      )}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row', 
        justifyContent: 'flex-start', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1
      }}>
        {renderChips()}
      </Box>
    </Box>
  );
};

const meta = {
  title: 'Components/ChipLabel',
  component: MockChipLabel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Chip label component for displaying multiple items as chips with optional avatars.',
      },
    },
  },
  argTypes: {
    formData: {
      control: 'object',
      description: 'Array of data to display as chips',
    },
    title: {
      control: 'text',
      description: 'Label title',
    },
    format: {
      control: 'text',
      description: 'Format template for chip labels',
    },
    useUserAvatar: {
      control: 'boolean',
      description: 'Show user avatars',
    },
    chips: {
      control: 'object',
      description: 'Alternative chips data',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ padding: '20px', minWidth: '400px' }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof MockChipLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    formData: ['John Doe', 'Jane Smith', 'Bob Johnson'],
    title: 'Team Members',
    format: '${who}',
    useUserAvatar: false,
  },
};

export const WithAvatars: Story = {
  args: {
    formData: ['Alice Cooper', 'Bob Dylan', 'Charlie Brown'],
    title: 'Users',
    format: '${who}',
    useUserAvatar: true,
  },
};

export const CustomFormat: Story = {
  args: {
    formData: ['admin', 'user', 'guest'],
    title: 'Roles',
    format: 'Role: ${who}',
    useUserAvatar: false,
  },
};

export const NoTitle: Story = {
  args: {
    formData: ['Tag 1', 'Tag 2', 'Tag 3', 'Tag 4'],
    title: '',
    format: '${who}',
    useUserAvatar: false,
  },
};

export const Empty: Story = {
  args: {
    formData: [],
    title: 'No Items',
    format: '${who}',
    useUserAvatar: false,
  },
}; 