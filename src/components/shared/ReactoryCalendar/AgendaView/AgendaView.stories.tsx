import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { AgendaView } from "./AgendaView";
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
    start: new Date(2026, 3, 10, 9, 0),
    end: new Date(2026, 3, 10, 9, 30),
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
    location: "Room 302",
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
    title: "Dentist Appointment",
    start: new Date(2026, 3, 11, 10, 0),
    end: new Date(2026, 3, 11, 11, 0),
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
    location: "Dr. Smith's Office",
  },
  {
    id: "4",
    calendarId: "work",
    title: "Project Kickoff",
    start: new Date(2026, 3, 14, 9, 0),
    end: new Date(2026, 3, 14, 11, 0),
    isAllDay: false,
    status: "confirmed",
    priority: "high",
  },
];

const meta = {
  title: "ReactoryCalendar/Views/AgendaView",
  component: AgendaView,
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
} satisfies Meta<typeof AgendaView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { date: new Date(2026, 3, 10), events, calendars },
};

export const Empty: Story = {
  args: { date: new Date(2026, 3, 10), events: [] },
};

export const ShortRange: Story = {
  args: { date: new Date(2026, 3, 10), events, calendars, daysToShow: 7 },
};
