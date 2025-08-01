import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

const MockNotFoundComponent = ({ 
  message = 'Component not found',
  waitingFor = 'core.ExampleComponent'
}: any) => {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ 
        border: '1px solid #f44336', 
        borderRadius: '8px', 
        padding: '16px',
        backgroundColor: '#ffebee',
        color: '#c62828'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          Component Not Available
        </div>
        <div style={{ fontSize: '0.875rem' }}>
          {message || `Component "${waitingFor}" is not available.`}
        </div>
      </div>
    </div>
  );
};

const meta = {
  title: 'Shared/NotFoundComponent',
  component: MockNotFoundComponent,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    )
  ]
} satisfies Meta<typeof MockNotFoundComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: 'Component not found',
    waitingFor: 'core.ExampleComponent'
  }
};

export const CustomMessage: Story = {
  args: {
    message: 'The requested component is currently unavailable',
    waitingFor: 'custom.SpecialComponent'
  }
}; 