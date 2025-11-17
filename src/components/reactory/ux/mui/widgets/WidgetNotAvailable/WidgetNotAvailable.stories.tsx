import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

const MockWidgetNotAvailable = ({ 
  map = { componentFqn: 'core.ExampleWidget' },
  reactory = {
    getComponent: (fqn: string) => null
  }
}: any) => {
  const ComponentToMount = reactory.getComponent(map.componentFqn);
  
  if (ComponentToMount !== null && ComponentToMount !== undefined) {
    return <ComponentToMount {...{ map, reactory }} />;
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ 
        border: '1px solid #e0e0e0', 
        borderRadius: '8px', 
        padding: '16px',
        backgroundColor: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '0.75rem', color: '#666' }}>
          {map.componentFqn}
        </span>
        <span style={{ fontSize: '1rem', color: '#999' }}>⏳</span>
      </div>
    </div>
  );
};

const meta = {
  title: 'Widgets/WidgetNotAvailable',
  component: MockWidgetNotAvailable,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    )
  ]
} satisfies Meta<typeof MockWidgetNotAvailable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    map: { componentFqn: 'core.ExampleWidget' }
  }
};

export const CustomComponent: Story = {
  args: {
    map: { componentFqn: 'custom.SpecialWidget' }
  }
}; 