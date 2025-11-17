import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

// Mock the DateLabel component since it has Reactory dependencies
const MockDateLabel = ({ 
  value = new Date(),
  variant = 'h6',
  uiSchema = {},
  classes = {},
  api = {
    log: (message: string) => console.log(`[DateLabel] ${message}`)
  }
}: any) => {
  const moment = require('moment');
  
  let labelText = moment(value).format('DD MMM YYYY HH:mm');
  let labelTitle = '';
  let _variant = variant;

  if (uiSchema) {
    if (uiSchema['ui:options'] && uiSchema['ui:options'].format && uiSchema['ui:options'].format !== '') {
      labelText = moment(value).format(uiSchema['ui:options'].format);
    }
    if (uiSchema['ui:options'] && uiSchema['ui:options'].title && uiSchema['ui:options'].title !== '') {
      labelTitle = uiSchema['ui:options'].title;
    }
    if (uiSchema['ui:options'] && uiSchema['ui:options'].variant && uiSchema['ui:options'].variant !== '') {
      _variant = uiSchema['ui:options'].variant;
    }
  }

  const getTypographyStyle = (variant: string) => {
    const styles = {
      h1: { fontSize: '2.5rem', fontWeight: 300 },
      h2: { fontSize: '2rem', fontWeight: 300 },
      h3: { fontSize: '1.75rem', fontWeight: 400 },
      h4: { fontSize: '1.5rem', fontWeight: 400 },
      h5: { fontSize: '1.25rem', fontWeight: 400 },
      h6: { fontSize: '1rem', fontWeight: 500 },
      body1: { fontSize: '1rem', fontWeight: 400 },
      body2: { fontSize: '0.875rem', fontWeight: 400 },
      caption: { fontSize: '0.75rem', fontWeight: 400 }
    };
    return styles[variant] || styles.h6;
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ 
        border: '1px solid #e0e0e0', 
        borderRadius: '8px', 
        padding: '16px',
        backgroundColor: '#fafafa'
      }}>
        {labelTitle !== '' && (
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            fontWeight: 'bold',
            color: '#666'
          }}>
            {labelTitle}
          </label>
        )}
        <div style={getTypographyStyle(_variant)}>
          {labelText}
        </div>
      </div>
    </div>
  );
};

const meta = {
  title: 'Shared/DateLabel',
  component: MockDateLabel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A date display component that formats dates using moment.js. Supports custom formatting and typography variants through UI schema options.'
      }
    }
  },
  argTypes: {
    value: {
      description: 'Date value to display',
      control: { type: 'date' }
    },
    variant: {
      description: 'Typography variant',
      control: { type: 'select' },
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body1', 'body2', 'caption']
    },
    uiSchema: {
      description: 'UI schema configuration for format, title, and variant',
      control: { type: 'object' }
    }
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    )
  ]
} satisfies Meta<typeof MockDateLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: new Date('2024-01-15T10:30:00'),
    variant: 'h6'
  }
};

export const WithTitle: Story = {
  args: {
    value: new Date('2024-01-15T10:30:00'),
    variant: 'h6',
    uiSchema: {
      'ui:options': {
        title: 'Created Date'
      }
    }
  }
};

export const CustomFormat: Story = {
  args: {
    value: new Date('2024-01-15T10:30:00'),
    variant: 'h6',
    uiSchema: {
      'ui:options': {
        title: 'Custom Format',
        format: 'MMMM Do, YYYY'
      }
    }
  }
};

export const DifferentVariants: Story = {
  args: {
    value: new Date('2024-01-15T10:30:00'),
    variant: 'h4',
    uiSchema: {
      'ui:options': {
        title: 'Large Date',
        variant: 'h4'
      }
    }
  }
};

export const SmallText: Story = {
  args: {
    value: new Date('2024-01-15T10:30:00'),
    variant: 'caption',
    uiSchema: {
      'ui:options': {
        title: 'Small Date',
        variant: 'caption',
        format: 'MM/DD/YY'
      }
    }
  }
};

export const TimeOnly: Story = {
  args: {
    value: new Date('2024-01-15T10:30:00'),
    variant: 'body1',
    uiSchema: {
      'ui:options': {
        title: 'Time Only',
        format: 'HH:mm:ss'
      }
    }
  }
};

export const RelativeTime: Story = {
  args: {
    value: new Date('2024-01-15T10:30:00'),
    variant: 'body2',
    uiSchema: {
      'ui:options': {
        title: 'Relative Time',
        format: 'fromNow'
      }
    }
  }
}; 