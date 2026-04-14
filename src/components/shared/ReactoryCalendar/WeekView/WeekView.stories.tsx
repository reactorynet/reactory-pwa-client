import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { WeekView } from "./WeekView";
import { CalendarEvent, CalendarSource } from "../types";

const calendars: CalendarSource[] = [
  { id: "work", name: "Work", color: "#1976d2", visible: true },
  { id: "personal", name: "Personal", color: "#388e3c", visible: true },
];

const events: CalendarEvent[] = [
  {
    id: "1",
    calendarId: "work",
    title: "Morning Standup",
    start: new Date(2026, 3, 6, 9, 0),
    end: new Date(2026, 3, 6, 9, 30),
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
  },
  {
    id: "2",
    calendarId: "work",
    title: "Sprint Planning",
    start: new Date(2026, 3, 6, 10, 0),
    end: new Date(2026, 3, 6, 12, 0),
    isAllDay: false,
    status: "confirmed",
    priority: "high",
  },
  {
    id: "3",
    calendarId: "work",
    title: "1:1 with Manager",
    start: new Date(2026, 3, 7, 14, 0),
    end: new Date(2026, 3, 7, 14, 30),
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
  },
  {
    id: "4",
    calendarId: "personal",
    title: "Gym Session",
    start: new Date(2026, 3, 8, 7, 0),
    end: new Date(2026, 3, 8, 8, 0),
    isAllDay: false,
    status: "confirmed",
    priority: "low",
  },
  {
    id: "5",
    calendarId: "work",
    title: "Team Off-site",
    start: new Date(2026, 3, 9),
    end: new Date(2026, 3, 10),
    isAllDay: true,
    status: "confirmed",
    priority: "normal",
    color: "#f57c00",
  },
];

const meta = {
  title: "ReactoryCalendar/Views/WeekView",
  component: WeekView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ height: "100vh" }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof WeekView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    date: new Date(2026, 3, 6),
    events,
    calendars,
    startHour: 7,
    endHour: 20,
  },
};

export const WorkingHoursOnly: Story = {
  args: {
    date: new Date(2026, 3, 6),
    events,
    calendars,
    startHour: 8,
    endHour: 18,
  },
};

export const Empty: Story = {
  args: {
    date: new Date(2026, 3, 6),
    events: [],
    startHour: 8,
    endHour: 18,
  },
};
