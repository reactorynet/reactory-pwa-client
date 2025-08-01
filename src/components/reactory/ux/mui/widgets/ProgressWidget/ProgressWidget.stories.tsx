import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

const MockProgressWidget = ({ 
  formData = 0,
  schema = { title: 'Loading...' },
  uiSchema = {}
}: any) => {
  return (
    <div style={{ padding: '16px', textAlign: 'center' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e0e0e0',
        borderTop: '4px solid #1976d2',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }} />
      <div style={{ fontSize: '0.75rem', color: '#666' }}>
        {schema.title}
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const meta = {
  title: 'Widgets/ProgressWidget',
  component: MockProgressWidget,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    )
  ]
} satisfies Meta<typeof MockProgressWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    formData: 0,
    schema: { title: 'Loading...' }
  }
};

export const WithProgress: Story = {
  args: {
    formData: 75,
    schema: { title: 'Processing...' }
  }
}; 