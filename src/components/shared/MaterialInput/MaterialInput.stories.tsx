import type { Meta, StoryObj } from '@storybook/react';
import MaterialInputWidget from './MaterialInput';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

const meta = {
  title: 'Components/MaterialInput',
  component: MaterialInputWidget,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Material-UI input component with icon support and theme integration.',
      },
    },
  },
  argTypes: {
    'uiSchema.title': {
      control: 'text',
      description: 'Input label',
    },
    'uiSchema.ui:options.icon': {
      control: 'text',
      description: 'Material-UI icon name',
    },
    'uiSchema.ui:options.iconPosition': {
      control: 'select',
      options: ['left', 'right'],
      description: 'Icon position',
    },
    'uiSchema.ui:options.placeholder': {
      control: 'text',
      description: 'Input placeholder',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof MaterialInputWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    uiSchema: {
      title: 'Email Address',
      'ui:options': {
        placeholder: 'Enter your email',
      },
    },
    formData: '',
    schema: {
      type: 'string',
    },
    onChange: (value: string) => console.log('Value changed:', value),
  },
};

export const WithIcon: Story = {
  args: {
    uiSchema: {
      title: 'Search',
      'ui:options': {
        icon: 'search',
        iconPosition: 'left',
        placeholder: 'Search...',
      },
    },
    formData: '',
    schema: {
      type: 'string',
    },
    onChange: (value: string) => console.log('Value changed:', value),
  },
};

export const WithRightIcon: Story = {
  args: {
    uiSchema: {
      title: 'Email',
      'ui:options': {
        icon: 'email',
        iconPosition: 'right',
        placeholder: 'Enter email address',
      },
    },
    formData: '',
    schema: {
      type: 'string',
    },
    onChange: (value: string) => console.log('Value changed:', value),
  },
};

export const WithDefaultValue: Story = {
  args: {
    uiSchema: {
      title: 'Username',
      'ui:options': {
        icon: 'person',
        iconPosition: 'left',
        placeholder: 'Enter username',
      },
    },
    formData: 'john_doe',
    schema: {
      type: 'string',
      default: 'john_doe',
    },
    onChange: (value: string) => console.log('Value changed:', value),
  },
}; 