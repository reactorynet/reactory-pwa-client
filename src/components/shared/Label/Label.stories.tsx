import type { Meta, StoryObj } from '@storybook/react';
import { Typography } from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

// Mock the Label component since it has Reactory dependencies
const MockLabel = ({ value = "?", variant = "h6", format, $format }: any) => {
  let labelText = value;

  if (format) {
    // Simple template replacement for demo
    labelText = format.replace('${value}', value);
  }

  return (
    <Typography variant={variant} style={{ margin: '8px' }}>
      {labelText}
    </Typography>
  );
};

const meta = {
  title: 'Components/Label',
  component: MockLabel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Label component with typography variants and formatting options.',
      },
    },
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'Text to display',
    },
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body1', 'body2', 'caption'],
      description: 'Typography variant',
    },
    format: {
      control: 'text',
      description: 'Template format string (e.g., "Label: ${value}")',
    },
    $format: {
      control: 'text',
      description: 'Function name for custom formatting',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof MockLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 'Sample Label',
    variant: 'h6',
  },
};

export const Heading: Story = {
  args: {
    value: 'Heading Label',
    variant: 'h4',
  },
};

export const BodyText: Story = {
  args: {
    value: 'This is body text for the label component',
    variant: 'body1',
  },
};

export const Caption: Story = {
  args: {
    value: 'Small caption text',
    variant: 'caption',
  },
};

export const WithFormat: Story = {
  args: {
    value: 'Important',
    variant: 'h5',
    format: 'Label: ${value}',
  },
}; 