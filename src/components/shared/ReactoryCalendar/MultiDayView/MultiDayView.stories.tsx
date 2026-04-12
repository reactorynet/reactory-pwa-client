import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { MultiDayView } from "./MultiDayView";
import { CalendarEvent, CalendarSource } from "../types";

const today = new Date();

const events: CalendarEvent[] = [
  { id: "1", calendarId: "work", title: "Sprint Planning", start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30), isAllDay: false, status: "confirmed", priority: "high" },
  { id: "2", calendarId: "work", title: "Design Review", start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 15, 0), isAllDay: false, status: "confirmed", priority: "normal" },
  { id: "3", calendarId: "personal", title: "Vacation", start: new Date(today.getFullYear(), today.getMonth(), today.getDate()), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), isAllDay: true, status: "confirmed", priority: "normal" },
];

const calendars: CalendarSource[] = [
  { id: "work", name: "Work", color: "#1976d2", visible: true },
  { id: "personal", name: "Personal", color: "#388e3c", visible: true },
];

const meta = {
  title: "ReactoryCalendar/Views/MultiDayView",
  component: MultiDayView,
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
} satisfies Meta<typeof MultiDayView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeDays: Story = {
  args: { date: today, events, calendars, numberOfDays: 3 },
};

export const FourDays: Story = {
  args: { date: today, events, calendars, numberOfDays: 4 },
};

export const TwoDays: Story = {
  args: { date: today, events, calendars, numberOfDays: 2 },
};
