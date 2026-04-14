import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';
import EventListWidget from './EventListWidget';
import type { CalendarEvent } from '@reactory/client-core/components/shared/ReactoryCalendar';

const events: CalendarEvent[] = [
  {
    id: '1',
    calendarId: 'work',
    title: 'Team Standup',
    start: new Date(2026, 3, 14, 9, 0),
    end: new Date(2026, 3, 14, 9, 30),
    isAllDay: false,
    status: 'confirmed',
    priority: 'normal',
  },
  {
    id: '2',
    calendarId: 'work',
    title: 'Sprint Review',
    start: new Date(2026, 3, 16, 14, 0),
    end: new Date(2026, 3, 16, 15, 30),
    isAllDay: false,
    status: 'confirmed',
    priority: 'high',
  },
  {
    id: '3',
    calendarId: 'personal',
    title: 'Dentist Appointment',
    start: new Date(2026, 3, 18, 10, 0),
    end: new Date(2026, 3, 18, 11, 0),
    isAllDay: false,
    status: 'confirmed',
    priority: 'normal',
  },
  {
    id: '4',
    calendarId: 'personal',
    title: 'Birthday Party',
    start: new Date(2026, 3, 20),
    end: new Date(2026, 3, 20),
    isAllDay: true,
    status: 'confirmed',
    priority: 'normal',
    color: '#f57c00',
  },
];

const meta: Meta<typeof EventListWidget> = {
  title: 'ReactoryCalendar/Widgets/EventListWidget',
  component: EventListWidget,
  parameters: {
    docs: {
      description: {
        component:
          'Event list / agenda widget for the ReactoryForm engine. formData is a CalendarEvent[] array.',
      },
    },
  },
  argTypes: {
    formData: { control: 'object', description: 'Array of calendar events' },
    schema: { control: false },
    uiSchema: { control: false },
    formContext: { control: false },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper>
        <Box sx={{ width: 500, p: 2 }}>
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
    formData: events,
    schema: { type: 'array', title: 'Events' },
    uiSchema: {
      'ui:options': {
        daysToShow: 14,
        referenceDate: new Date(2026, 3, 14).toISOString(),
        calendars: [
          { id: 'work', name: 'Work', color: '#1976d2', visible: true },
          { id: 'personal', name: 'Personal', color: '#388e3c', visible: true },
        ],
      },
    },
    formContext: {} as any,
    onChange: (v: CalendarEvent[]) => console.log('onChange', v),
  },
};

export const Empty: Story = {
  args: {
    formData: [],
    schema: { type: 'array', title: 'Events' },
    uiSchema: {
      'ui:options': {
        emptyMessage: 'No upcoming events',
      },
    },
    formContext: {} as any,
    onChange: (v: CalendarEvent[]) => console.log('onChange', v),
  },
};

export const GroupByCalendar: Story = {
  args: {
    formData: events,
    schema: { type: 'array', title: 'Events' },
    uiSchema: {
      'ui:options': {
        daysToShow: 30,
        groupBy: 'calendar',
        referenceDate: new Date(2026, 3, 14).toISOString(),
        calendars: [
          { id: 'work', name: 'Work', color: '#1976d2', visible: true },
          { id: 'personal', name: 'Personal', color: '#388e3c', visible: true },
        ],
      },
    },
    formContext: {} as any,
    onChange: (v: CalendarEvent[]) => console.log('onChange', v),
  },
};
