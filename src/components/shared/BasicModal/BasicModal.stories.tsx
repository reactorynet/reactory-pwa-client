import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { 
  Modal,
  Typography,
  Button,
  Box,
  Paper
} from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

// Mock BasicModal component
const MockBasicModal = ({ 
  open = false, 
  onClose, 
  title = "Basic Modal",
  children = "This is the content of the basic modal.",
  triggerText = "Open Modal"
}: any) => {
  const [isOpen, setIsOpen] = React.useState(open);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const getModalStyle = () => {
    const top = 50;
    const left = 50;
    return {
      top: `${top}%`,
      left: `${left}%`,
      transform: `translate(-${top}%, -${left}%)`,
    };
  };

  return (
    <Box>
      <Button variant="contained" onClick={handleOpen}>
        {triggerText}
      </Button>
      <Modal
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
        open={isOpen}
        onClose={handleClose}
      >
        <Paper 
          style={getModalStyle()} 
          sx={{ 
            position: 'absolute',
            backgroundColor: 'background.paper',
            boxShadow: 5,
            padding: 2,
            minWidth: 300
          }}
        >
          <Typography variant="h6" id="modal-title" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body1" id="simple-modal-description">
            {children}
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={handleClose}>
              Close
            </Button>
          </Box>
        </Paper>
      </Modal>
    </Box>
  );
};

const meta = {
  title: 'Components/BasicModal',
  component: MockBasicModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Basic modal component with customizable content and trigger.',
      },
    },
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    title: {
      control: 'text',
      description: 'Modal title',
    },
    children: {
      control: 'text',
      description: 'Modal content',
    },
    triggerText: {
      control: 'text',
      description: 'Trigger button text',
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
} satisfies Meta<typeof MockBasicModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    title: 'Basic Modal',
    children: 'This is a basic modal with simple content.',
    triggerText: 'Open Modal',
  },
};

export const WithContent: Story = {
  args: {
    open: false,
    title: 'Information Modal',
    children: 'This modal contains important information that the user needs to see.',
    triggerText: 'Show Information',
  },
};

export const LongContent: Story = {
  args: {
    open: false,
    title: 'Detailed Information',
    children: 'This modal contains a longer piece of content that demonstrates how the modal handles text that might wrap to multiple lines. It shows the modal\'s ability to display substantial amounts of information in a clean, readable format.',
    triggerText: 'Show Details',
  },
}; 