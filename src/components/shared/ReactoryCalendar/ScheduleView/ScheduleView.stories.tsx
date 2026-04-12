import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { ScheduleView } from "./ScheduleView";
import { CalendarEvent, CalendarResource } from "../types";

const today = new Date();

const resources: CalendarResource[] = [
  { id: "r1", name: "Room A", color: "#1976d2" },
  { id: "r2", name: "Room B", color: "#388e3c" },
  { id: "r3", name: "Room C", color: "#f57c00" },
];

const events: CalendarEvent[] = [
  { id: "1", calendarId: "c1", title: "Team Standup", start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30), isAllDay: false, status: "confirmed", priority: "normal", resourceId: "r1" },
  { id: "2", calendarId: "c1", title: "Workshop", start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0), isAllDay: false, status: "confirmed", priority: "high", resourceId: "r2" },
  { id: "3", calendarId: "c1", title: "Client Call", start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0), isAllDay: false, status: "confirmed", priority: "normal", resourceId: "r1" },
  { id: "4", calendarId: "c1", title: "Lunch Seminar", start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0), isAllDay: false, status: "confirmed", priority: "normal", resourceId: "r3" },
];

const meta = {
  title: "ReactoryCalendar/Views/ScheduleView",
  component: ScheduleView,
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
} satisfies Meta<typeof ScheduleView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: { date: today, events, resources, orientation: "horizontal" },
};

export const Vertical: Story = {
  args: { date: today, events, resources, orientation: "vertical" },
};

export const Empty: Story = {
  args: { date: today, events: [], resources, orientation: "horizontal" },
};
