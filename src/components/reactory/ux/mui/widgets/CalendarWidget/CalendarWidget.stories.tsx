import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';
import CalendarWidget from './CalendarWidget';
import type { CalendarWidgetData } from './types';
import type { CalendarEvent, CalendarSource } from '@reactory/client-core/components/shared/ReactoryCalendar';

const calendars: CalendarSource[] = [
  { id: 'work', name: 'Work', color: '#1976d2', visible: true, isDefault: true },
  { id: 'personal', name: 'Personal', color: '#388e3c', visible: true },
];

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

const defaultFormData: CalendarWidgetData = {
  date: new Date(2026, 3, 14).toISOString(),
  view: 'month',
  events,
  calendars,
};

const meta: Meta<typeof CalendarWidget> = {
  title: 'ReactoryCalendar/Widgets/CalendarWidget',
  component: CalendarWidget,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full calendar layout widget for the ReactoryForm engine. Wraps CalendarLayout with formData/onChange integration. formData holds date, view, events, and calendars.',
      },
    },
  },
  argTypes: {
    formData: { control: 'object', description: 'Calendar state object' },
    schema: { control: false },
    uiSchema: { control: false },
    formContext: { control: false },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper>
        <Box sx={{ height: '80vh', width: '100%' }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const MonthView: Story = {
  args: {
    formData: defaultFormData,
    schema: { type: 'object', title: 'Calendar' },
    uiSchema: { 'ui:options': { defaultView: 'month', sidebarOpen: true } },
    formContext: {} as any,
    onChange: (data: CalendarWidgetData) => console.log('onChange', data),
  },
};

export const WeekView: Story = {
  args: {
    formData: { ...defaultFormData, view: 'week' as const },
    schema: { type: 'object', title: 'Calendar' },
    uiSchema: { 'ui:options': { defaultView: 'week' } },
    formContext: {} as any,
    onChange: (data: CalendarWidgetData) => console.log('onChange', data),
  },
};

export const DayView: Story = {
  args: {
    formData: { ...defaultFormData, view: 'day' as const },
    schema: { type: 'object', title: 'Calendar' },
    uiSchema: { 'ui:options': { defaultView: 'day', startHour: 8, endHour: 18 } },
    formContext: {} as any,
    onChange: (data: CalendarWidgetData) => console.log('onChange', data),
  },
};

export const ReadOnly: Story = {
  args: {
    formData: defaultFormData,
    schema: { type: 'object', title: 'Calendar' },
    uiSchema: { 'ui:options': { editable: false, sidebarOpen: false } },
    formContext: {} as any,
    onChange: (data: CalendarWidgetData) => console.log('onChange', data),
  },
};
