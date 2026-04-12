import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { CalendarLayout } from "./CalendarLayout";
import { CalendarEvent, CalendarSource, CalendarResource } from "../types";

const today = new Date();
const d = (m: number, day: number, h = 0, min = 0) =>
  new Date(today.getFullYear(), m, day, h, min);

const calendars: CalendarSource[] = [
  { id: "work", name: "Work", color: "#1976d2", visible: true },
  { id: "personal", name: "Personal", color: "#388e3c", visible: true },
  { id: "holidays", name: "Holidays", color: "#f57c00", visible: true },
];

const events: CalendarEvent[] = [
  { id: "1", calendarId: "work", title: "Sprint Retro", start: d(today.getMonth(), today.getDate(), 9, 0), end: d(today.getMonth(), today.getDate(), 10, 0), isAllDay: false, status: "confirmed", priority: "high" },
  { id: "2", calendarId: "work", title: "1:1 with Manager", start: d(today.getMonth(), today.getDate(), 14, 0), end: d(today.getMonth(), today.getDate(), 14, 30), isAllDay: false, status: "confirmed", priority: "normal" },
  { id: "3", calendarId: "personal", title: "Gym", start: d(today.getMonth(), today.getDate() + 1, 7, 0), end: d(today.getMonth(), today.getDate() + 1, 8, 0), isAllDay: false, status: "confirmed", priority: "normal" },
  { id: "4", calendarId: "holidays", title: "Company Holiday", start: d(today.getMonth(), today.getDate() + 3), end: d(today.getMonth(), today.getDate() + 3), isAllDay: true, status: "confirmed", priority: "normal" },
  { id: "5", calendarId: "work", title: "Design Review", start: d(today.getMonth(), today.getDate(), 11, 0), end: d(today.getMonth(), today.getDate(), 12, 0), isAllDay: false, status: "confirmed", priority: "normal" },
];

const resources: CalendarResource[] = [
  { id: "r1", name: "Room A", color: "#1976d2" },
  { id: "r2", name: "Room B", color: "#388e3c" },
];

const meta = {
  title: "ReactoryCalendar/CalendarLayout",
  component: CalendarLayout,
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
} satisfies Meta<typeof CalendarLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MonthView: Story = {
  args: { date: today, view: "month", events, calendars },
};

export const WeekView: Story = {
  args: { date: today, view: "week", events, calendars },
};

export const DayView: Story = {
  args: { date: today, view: "day", events, calendars },
};

export const AgendaView: Story = {
  args: { date: today, view: "agenda", events, calendars },
};

export const NoSidebar: Story = {
  args: { date: today, view: "month", events, calendars, sidebarOpen: false },
};
