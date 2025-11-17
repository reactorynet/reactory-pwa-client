import type { Meta, StoryObj } from '@storybook/react';
import { 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box
} from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

// Mock AlertDialog component since it has Reactory dependencies
const MockAlertDialog = ({ 
  open = false, 
  onClose, 
  onAccept, 
  title = "Alert Dialog",
  content = "This is the content of the alert dialog.",
  acceptTitle = "Yes",
  cancelTitle = "Cancel",
  showCancel = true,
  showAccept = true,
  maxWidth = 'md',
  fullWidth = true,
  dividers = false,
  style = {}
}: any) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      <DialogTitle id="alert-dialog-title">
        {title}
      </DialogTitle>
      <DialogContent style={style} dividers={dividers}>
        <DialogContentText id="alert-dialog-description">
          {content}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {showCancel && (
          <Button variant="text" onClick={onClose}>
            {cancelTitle}
          </Button>
        )}
        {showAccept && (
          <Button variant="outlined" onClick={onAccept} autoFocus>
            {acceptTitle}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const meta = {
  title: 'Components/AlertDialog',
  component: MockAlertDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Alert dialog component with customizable content and actions.',
      },
    },
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the dialog is open',
    },
    title: {
      control: 'text',
      description: 'Dialog title',
    },
    content: {
      control: 'text',
      description: 'Dialog content',
    },
    acceptTitle: {
      control: 'text',
      description: 'Accept button text',
    },
    cancelTitle: {
      control: 'text',
      description: 'Cancel button text',
    },
    showCancel: {
      control: 'boolean',
      description: 'Show cancel button',
    },
    showAccept: {
      control: 'boolean',
      description: 'Show accept button',
    },
    maxWidth: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Dialog max width',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Full width dialog',
    },
    dividers: {
      control: 'boolean',
      description: 'Show content dividers',
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
} satisfies Meta<typeof MockAlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    title: 'Confirm Action',
    content: 'Are you sure you want to proceed with this action?',
    acceptTitle: 'Yes',
    cancelTitle: 'Cancel',
    showCancel: true,
    showAccept: true,
    maxWidth: 'md',
    fullWidth: true,
    dividers: false,
  },
};

export const Warning: Story = {
  args: {
    open: true,
    title: 'Warning',
    content: 'This action cannot be undone. Are you sure you want to continue?',
    acceptTitle: 'Delete',
    cancelTitle: 'Cancel',
    showCancel: true,
    showAccept: true,
    maxWidth: 'sm',
    fullWidth: true,
    dividers: true,
  },
};

export const Info: Story = {
  args: {
    open: true,
    title: 'Information',
    content: 'This is an informational dialog with important details.',
    acceptTitle: 'OK',
    cancelTitle: 'Cancel',
    showCancel: false,
    showAccept: true,
    maxWidth: 'md',
    fullWidth: true,
    dividers: false,
  },
};

export const CustomActions: Story = {
  args: {
    open: true,
    title: 'Custom Actions',
    content: 'This dialog has custom action buttons.',
    acceptTitle: 'Save',
    cancelTitle: 'Discard',
    showCancel: true,
    showAccept: true,
    maxWidth: 'lg',
    fullWidth: true,
    dividers: true,
  },
}; 