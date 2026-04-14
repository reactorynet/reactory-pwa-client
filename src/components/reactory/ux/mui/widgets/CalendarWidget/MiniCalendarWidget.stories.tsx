import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';
import MiniCalendarWidget from './MiniCalendarWidget';

const meta: Meta<typeof MiniCalendarWidget> = {
  title: 'ReactoryCalendar/Widgets/MiniCalendarWidget',
  component: MiniCalendarWidget,
  parameters: {
    docs: {
      description: {
        component:
          'Compact date-picker widget for the ReactoryForm engine. formData is an ISO date string (or null).',
      },
    },
  },
  argTypes: {
    formData: { control: 'text', description: 'ISO date string' },
    schema: { control: false },
    uiSchema: { control: false },
    formContext: { control: false },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper>
        <Box sx={{ width: 320, p: 2 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    formData: null,
    schema: { type: 'string', title: 'Date' },
    uiSchema: {},
    formContext: {} as any,
    onChange: (v: string | null) => console.log('onChange', v),
  },
};

export const WithSelectedDate: Story = {
  args: {
    formData: '2026-04-14',
    schema: { type: 'string', title: 'Date' },
    uiSchema: {},
    formContext: {} as any,
    onChange: (v: string | null) => console.log('onChange', v),
  },
};

export const WithMarkedDates: Story = {
  args: {
    formData: '2026-04-14',
    schema: { type: 'string', title: 'Date' },
    uiSchema: {
      'ui:options': {
        weekStartsOn: 1,
        markedDates: {
          '2026-04-14': { color: '#1976d2', count: 1 },
          '2026-04-16': { color: '#d32f2f', count: 2 },
          '2026-04-20': { color: '#388e3c', count: 1 },
        },
      },
    },
    formContext: {} as any,
    onChange: (v: string | null) => console.log('onChange', v),
  },
};
