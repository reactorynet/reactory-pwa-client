import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { YearView } from "./YearView";
import { CalendarEvent } from "../types";

const events: CalendarEvent[] = [
  { id: "1", calendarId: "c1", title: "A", start: new Date(2026, 0, 15, 9, 0), end: new Date(2026, 0, 15, 10, 0), isAllDay: false, status: "confirmed", priority: "normal" },
  { id: "2", calendarId: "c1", title: "B", start: new Date(2026, 2, 10, 9, 0), end: new Date(2026, 2, 10, 10, 0), isAllDay: false, status: "confirmed", priority: "normal" },
  { id: "3", calendarId: "c1", title: "C", start: new Date(2026, 3, 5, 14, 0), end: new Date(2026, 3, 5, 15, 0), isAllDay: false, status: "confirmed", priority: "high" },
  { id: "4", calendarId: "c1", title: "D", start: new Date(2026, 6, 20), end: new Date(2026, 6, 20), isAllDay: true, status: "confirmed", priority: "normal" },
  { id: "5", calendarId: "c1", title: "E", start: new Date(2026, 11, 25), end: new Date(2026, 11, 25), isAllDay: true, status: "confirmed", priority: "normal" },
];

const meta = {
  title: "ReactoryCalendar/Views/YearView",
  component: YearView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ height: "100vh", overflow: "auto" }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof YearView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { date: new Date(2026, 0, 1), events },
};

export const Empty: Story = {
  args: { date: new Date(2026, 0, 1), events: [] },
};
