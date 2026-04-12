import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { MonthView } from "./MonthView";
import { CalendarEvent, CalendarSource } from "../types";

const calendars: CalendarSource[] = [
  { id: "work", name: "Work", color: "#1976d2", visible: true },
  { id: "personal", name: "Personal", color: "#388e3c", visible: true },
];

const events: CalendarEvent[] = [
  {
    id: "1",
    calendarId: "work",
    title: "Team Standup",
    start: new Date(2026, 3, 6, 9, 0),
    end: new Date(2026, 3, 6, 9, 30),
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
  },
  {
    id: "2",
    calendarId: "work",
    title: "Sprint Review",
    start: new Date(2026, 3, 10, 14, 0),
    end: new Date(2026, 3, 10, 15, 30),
    isAllDay: false,
    status: "confirmed",
    priority: "high",
  },
  {
    id: "3",
    calendarId: "personal",
    title: "Dentist",
    start: new Date(2026, 3, 15, 10, 0),
    end: new Date(2026, 3, 15, 11, 0),
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
  },
  {
    id: "4",
    calendarId: "personal",
    title: "Birthday Party",
    start: new Date(2026, 3, 20),
    end: new Date(2026, 3, 20),
    isAllDay: true,
    status: "confirmed",
    priority: "normal",
    color: "#f57c00",
  },
  {
    id: "5",
    calendarId: "work",
    title: "Conference",
    start: new Date(2026, 3, 22),
    end: new Date(2026, 3, 24),
    isAllDay: true,
    status: "confirmed",
    priority: "high",
  },
];

const meta = {
  title: "ReactoryCalendar/Views/MonthView",
  component: MonthView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ height: "100vh", p: 2 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof MonthView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    date: new Date(2026, 3, 1),
    events,
    calendars,
  },
};

export const Empty: Story = {
  args: {
    date: new Date(2026, 3, 1),
    events: [],
  },
};

export const SundayStart: Story = {
  args: {
    date: new Date(2026, 3, 1),
    events,
    calendars,
    weekStartsOn: 0,
  },
};
