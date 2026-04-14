import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { DayView } from "./DayView";
import { CalendarEvent, CalendarSource } from "../types";

const calendars: CalendarSource[] = [
  { id: "work", name: "Work", color: "#1976d2", visible: true },
];

const events: CalendarEvent[] = [
  {
    id: "1",
    calendarId: "work",
    title: "Standup",
    start: new Date(2026, 3, 10, 9, 0),
    end: new Date(2026, 3, 10, 9, 30),
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
  },
  {
    id: "2",
    calendarId: "work",
    title: "Sprint Planning",
    start: new Date(2026, 3, 10, 10, 0),
    end: new Date(2026, 3, 10, 12, 0),
    isAllDay: false,
    status: "confirmed",
    priority: "high",
  },
  {
    id: "3",
    calendarId: "work",
    title: "Lunch Break",
    start: new Date(2026, 3, 10, 12, 0),
    end: new Date(2026, 3, 10, 13, 0),
    isAllDay: false,
    status: "confirmed",
    priority: "low",
    color: "#388e3c",
  },
  {
    id: "4",
    calendarId: "work",
    title: "Code Review",
    start: new Date(2026, 3, 10, 14, 0),
    end: new Date(2026, 3, 10, 15, 0),
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
  },
];

const meta = {
  title: "ReactoryCalendar/Views/DayView",
  component: DayView,
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
} satisfies Meta<typeof DayView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    date: new Date(2026, 3, 10),
    events,
    calendars,
    startHour: 7,
    endHour: 20,
  },
};

export const WorkingHours: Story = {
  args: {
    date: new Date(2026, 3, 10),
    events,
    calendars,
    startHour: 8,
    endHour: 18,
  },
};
