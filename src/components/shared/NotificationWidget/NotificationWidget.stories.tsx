import type { Meta, StoryObj } from '@storybook/react';
import NotificationWidget from './NotificationWidget';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';
import { Button, Box } from '@mui/material';
import React from 'react';

// Mock reactory API for Storybook
const mockReactory = {
  on: (eventName: string, callback: Function) => {
    // Store the callback for manual triggering
    (window as any).__storybook_notification_callbacks = (window as any).__storybook_notification_callbacks || {};
    (window as any).__storybook_notification_callbacks[eventName] = callback;
  },
  off: (eventName: string, callback: Function) => {
    // Remove callback
    if ((window as any).__storybook_notification_callbacks) {
      delete (window as any).__storybook_notification_callbacks[eventName];
    }
  },
  log: (message: string, data?: any) => console.log('Reactory Log:', message, data),
  getComponent: (componentFqn: string) => {
    // Mock component resolution for additional components
    if (componentFqn === 'core.NotFound') {
      return ({ message }: { message: string }) => (
        <div style={{ padding: '8px', color: 'red', fontSize: '12px' }}>
          {message}
        </div>
      );
    }
    // Mock other components as needed
    return ({ children }: { children?: React.ReactNode }) => (
      <div style={{ padding: '8px', border: '1px dashed #ccc', fontSize: '12px' }}>
        Mock Component: {componentFqn}
        {children}
      </div>
    );
  },
  utils: {
    objectMapper: (source: any, mapping: any) => {
      // Simple object mapper mock
      const result: any = {};
      Object.keys(mapping).forEach(key => {
        const path = mapping[key];
        if (typeof path === 'string' && source[path]) {
          result[key] = source[path];
        }
      });
      return result;
    },
  },
};

// Helper function to trigger notifications
const triggerNotification = (title: string, type: string = 'info', config: any = {}) => {
  const callback = (window as any).__storybook_notification_callbacks?.['onShowNotification'];
  if (callback) {
    callback({ title, type, config: { ...config, canDismiss: true } });
  }
};

const meta: Meta<typeof NotificationWidget> = {
  title: 'Components/NotificationWidget',
  component: NotificationWidget,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A notification system that displays toast-style messages. Supports different types and can include additional components.',
      },
    },
  },
  argTypes: {
    reactory: {
      control: false,
      description: 'Reactory API instance for event handling and component resolution',
    },
    classes: {
      control: false,
      description: 'Material-UI classes for styling',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper>
        <Box sx={{ minHeight: '400px', width: '100%', position: 'relative' }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          onClick={() => triggerNotification('Success! Operation completed successfully.', 'success')}
        >
          Show Success
        </Button>
        <Button 
          variant="contained" 
          color="error"
          onClick={() => triggerNotification('Error! Something went wrong.', 'error')}
        >
          Show Error
        </Button>
        <Button 
          variant="contained" 
          color="warning"
          onClick={() => triggerNotification('Warning! Please check your input.', 'warning')}
        >
          Show Warning
        </Button>
        <Button 
          variant="outlined"
          onClick={() => triggerNotification('Info: This is an informational message.', 'info')}
        >
          Show Info
        </Button>
      </Box>
      <NotificationWidget reactory={mockReactory} classes={{}} />
    </div>
  ),
};

export const WithAdditionalComponents: Story = {
  render: () => (
    <div>
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          onClick={() => triggerNotification(
            'Notification with additional component', 
            'info',
            {
              components: [
                {
                  componentFqn: 'material-ui.Button',
                  componentProps: { variant: 'outlined', size: 'small', children: 'Action' },
                  propsMap: {}
                }
              ]
            }
          )}
        >
          With Component
        </Button>
        <Button 
          variant="contained" 
          color="secondary"
          onClick={() => triggerNotification(
            'Multiple components notification', 
            'success',
            {
              components: [
                {
                  componentFqn: 'material-ui.Chip',
                  componentProps: { label: 'Tag 1', size: 'small' },
                  propsMap: {}
                },
                {
                  componentFqn: 'material-ui.Chip', 
                  componentProps: { label: 'Tag 2', size: 'small', color: 'primary' },
                  propsMap: {}
                }
              ]
            }
          )}
        >
          Multiple Components
        </Button>
      </Box>
      <NotificationWidget reactory={mockReactory} classes={{}} />
    </div>
  ),
};

export const WithChildren: Story = {
  render: () => (
    <div>
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          onClick={() => triggerNotification(
            'Notification with children content', 
            'info',
            {
              children: (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined">Accept</Button>
                  <Button size="small" variant="text">Cancel</Button>
                </Box>
              )
            }
          )}
        >
          With Children
        </Button>
      </Box>
      <NotificationWidget reactory={mockReactory} classes={{}} />
    </div>
  ),
};

export const NonDismissible: Story = {
  render: () => (
    <div>
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          color="warning"
          onClick={() => triggerNotification(
            'This notification cannot be dismissed by clicking', 
            'warning',
            {
              canDismiss: false
            }
          )}
        >
          Non-Dismissible
        </Button>
        <Button 
          variant="outlined" 
          sx={{ ml: 1 }}
          onClick={() => triggerNotification(
            'This one can be dismissed normally', 
            'success',
            {
              canDismiss: true
            }
          )}
        >
          Dismissible
        </Button>
      </Box>
      <NotificationWidget reactory={mockReactory} classes={{}} />
    </div>
  ),
};

export const MultipleNotifications: Story = {
  render: () => (
    <div>
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          onClick={() => {
            triggerNotification('First notification', 'info');
            setTimeout(() => triggerNotification('Second notification', 'success'), 500);
            setTimeout(() => triggerNotification('Third notification', 'warning'), 1000);
            setTimeout(() => triggerNotification('Fourth notification', 'error'), 1500);
          }}
        >
          Show Multiple (Stacked)
        </Button>
      </Box>
      <NotificationWidget reactory={mockReactory} classes={{}} />
    </div>
  ),
};

export const LongContent: Story = {
  render: () => (
    <div>
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          onClick={() => triggerNotification(
            'This is a very long notification message that demonstrates how the notification widget handles longer content. It should wrap appropriately and maintain good readability while still being dismissible by the user.', 
            'info'
          )}
        >
          Long Message
        </Button>
      </Box>
      <NotificationWidget reactory={mockReactory} classes={{}} />
    </div>
  ),
};

export const InteractiveDemo: Story = {
  render: () => {
    const InteractiveDemoContent = () => {
      const [notificationCount, setNotificationCount] = React.useState(0);
      
      const showCustomNotification = () => {
        const count = notificationCount + 1;
        setNotificationCount(count);
        
        triggerNotification(
          `Custom notification #${count}`, 
          count % 2 === 0 ? 'success' : 'info',
          {
            components: [
              {
                componentFqn: 'material-ui.Chip',
                componentProps: { 
                  label: `#${count}`, 
                  size: 'small', 
                  color: count % 2 === 0 ? 'primary' : 'secondary' 
                },
                propsMap: {}
              }
            ],
            children: count % 3 === 0 ? (
              <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                Every 3rd notification has additional content!
              </Box>
            ) : undefined
          }
        );
      };

      return (
        <div>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={showCustomNotification}>
              Custom Notification ({notificationCount})
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => setNotificationCount(0)}
            >
              Reset Counter
            </Button>
          </Box>
          <NotificationWidget reactory={mockReactory} classes={{}} />
        </div>
      );
    };

    return <InteractiveDemoContent />;
  },
};

export const AllTypes: Story = {
  render: () => (
    <div>
      <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1 }}>
        <Button 
          variant="contained" 
          color="success"
          onClick={() => triggerNotification('Success message', 'success')}
        >
          Success
        </Button>
        <Button 
          variant="contained" 
          color="error"
          onClick={() => triggerNotification('Error message', 'error')}
        >
          Error
        </Button>
        <Button 
          variant="contained" 
          color="warning"
          onClick={() => triggerNotification('Warning message', 'warning')}
        >
          Warning
        </Button>
        <Button 
          variant="contained" 
          color="info"
          onClick={() => triggerNotification('Info message', 'info')}
        >
          Info
        </Button>
        <Button 
          variant="outlined"
          onClick={() => triggerNotification('Default message', 'default')}
        >
          Default
        </Button>
      </Box>
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <strong>Instructions:</strong> Click any button above to show a notification of that type. 
        Click on the notifications to dismiss them (if dismissible).
      </Box>
      <NotificationWidget reactory={mockReactory} classes={{}} />
    </div>
  ),
};
