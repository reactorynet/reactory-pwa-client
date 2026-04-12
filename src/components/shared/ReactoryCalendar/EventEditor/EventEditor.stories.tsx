import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { EventEditor } from "./EventEditor";
import { CalendarSource } from "../types";

const calendars: CalendarSource[] = [
  { id: "work", name: "Work", color: "#1976d2", visible: true },
  { id: "personal", name: "Personal", color: "#388e3c", visible: true },
];

const meta = {
  title: "ReactoryCalendar/Controls/EventEditor",
  component: EventEditor,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ p: 2 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof EventEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewEvent: Story = {
  args: {
    start: new Date(),
    end: new Date(Date.now() + 3600000),
    calendars,
  },
};

export const EditEvent: Story = {
  args: {
    event: {
      id: "1",
      calendarId: "work",
      title: "Sprint Planning",
      start: new Date(2026, 0, 15, 9, 0),
      end: new Date(2026, 0, 15, 10, 30),
      isAllDay: false,
      location: "Room B",
      description: "Quarterly sprint planning.",
    },
    calendars,
  },
};

export const AllDay: Story = {
  args: {
    start: new Date(),
    end: new Date(),
    isAllDay: true,
    calendars,
  },
};
