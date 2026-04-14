import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';
import EventEditorWidget from './EventEditorWidget';
import type { CalendarEvent } from '@reactory/client-core/components/shared/ReactoryCalendar';

const existingEvent: Partial<CalendarEvent> = {
  id: '1',
  calendarId: 'work',
  title: 'Sprint Review',
  start: new Date(2026, 3, 16, 14, 0),
  end: new Date(2026, 3, 16, 15, 30),
  isAllDay: false,
  status: 'confirmed',
  priority: 'high',
  description: 'Review sprint deliverables with the team.',
};

const meta: Meta<typeof EventEditorWidget> = {
  title: 'ReactoryCalendar/Widgets/EventEditorWidget',
  component: EventEditorWidget,
  parameters: {
    docs: {
      description: {
        component:
          'Event editor widget for the ReactoryForm engine. formData is a Partial<CalendarEvent> or null. Supports create and edit use-cases.',
      },
    },
  },
  argTypes: {
    formData: { control: 'object', description: 'Event data' },
    schema: { control: false },
    uiSchema: { control: false },
    formContext: { control: false },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper>
        <Box sx={{ width: 440, p: 2 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NewEvent: Story = {
  args: {
    formData: null,
    schema: { type: 'object', title: 'New Event' },
    uiSchema: {
      'ui:options': {
        calendars: [
          { id: 'work', name: 'Work', color: '#1976d2', visible: true, isDefault: true },
          { id: 'personal', name: 'Personal', color: '#388e3c', visible: true },
        ],
      },
    },
    formContext: { reset: () => console.log('reset') } as any,
    onChange: (v: Partial<CalendarEvent> | null) => console.log('onChange', v),
  },
};

export const EditExistingEvent: Story = {
  args: {
    formData: existingEvent,
    schema: { type: 'object', title: 'Edit Event' },
    uiSchema: {
      'ui:options': {
        calendars: [
          { id: 'work', name: 'Work', color: '#1976d2', visible: true, isDefault: true },
          { id: 'personal', name: 'Personal', color: '#388e3c', visible: true },
        ],
        showDelete: true,
      },
    },
    formContext: { reset: () => console.log('reset') } as any,
    onChange: (v: Partial<CalendarEvent> | null) => console.log('onChange', v),
  },
};

export const AllDayEvent: Story = {
  args: {
    formData: {
      title: 'Team Offsite',
      start: new Date(2026, 3, 20),
      end: new Date(2026, 3, 21),
      isAllDay: true,
      calendarId: 'work',
      status: 'confirmed',
      priority: 'normal',
    },
    schema: { type: 'object', title: 'All-Day Event' },
    uiSchema: {
      'ui:options': {
        calendars: [
          { id: 'work', name: 'Work', color: '#1976d2', visible: true, isDefault: true },
        ],
      },
    },
    formContext: {} as any,
    onChange: (v: Partial<CalendarEvent> | null) => console.log('onChange', v),
  },
};
