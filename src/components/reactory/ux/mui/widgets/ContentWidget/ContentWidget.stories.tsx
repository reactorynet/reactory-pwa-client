import type { Meta, StoryObj } from '@storybook/react';
import ContentWidget from './ContentWidget';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';
import { Box } from '@mui/material';
import React from 'react';

const meta: Meta<typeof ContentWidget> = {
  title: 'Reactory/UX/MUI/Widgets/ContentWidget',
  component: ContentWidget,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Renders rich content (Markdown, HTML, or plain text) using the Reactory content rendering system. Supports custom styles via uiSchema.',
      },
    },
  },
  argTypes: {
    formData: {
      control: 'text',
      description: 'The content to render (Markdown, HTML, or plain text)',
    },
    schema: {
      control: false,
      description: 'JSON schema for the widget',
    },
    uiSchema: {
      control: false,
      description: 'UI schema for widget options and styles',
    },
    formContext: {
      control: false,
      description: 'Form context object',
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper>
        <Box sx={{ minHeight: '200px', width: '100%', maxWidth: 600, mx: 'auto', p: 2 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Markdown: Story = {
  args: {
    formData: '# Hello World!\nThis is **Markdown** content rendered by ContentWidget.\n\n- List item 1\n- List item 2',
    schema: {},
    uiSchema: {},
    formContext: {},
  },
};

export const HTML: Story = {
  args: {
    formData: '<h2>HTML Content</h2><p>This is <strong>HTML</strong> rendered by ContentWidget.</p><ul><li>Item A</li><li>Item B</li></ul>',
    schema: {},
    uiSchema: {},
    formContext: {},
  },
};

export const PlainText: Story = {
  args: {
    formData: 'This is plain text content. No formatting will be applied.',
    schema: {},
    uiSchema: {},
    formContext: {},
  },
};

export const WithCustomSx: Story = {
  args: {
    formData: 'This content box has custom padding, background, and border.',
    schema: {},
    uiSchema: {
      'ui:options': {
        sx: {
          backgroundColor: 'primary.light',
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 2,
          color: 'primary.contrastText',
          p: 4,
        },
      },
    },
    formContext: {},
  },
};
