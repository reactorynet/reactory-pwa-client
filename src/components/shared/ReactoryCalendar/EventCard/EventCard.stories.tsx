import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { EventCard } from "./EventCard";
import { CalendarEvent } from "../types";

const sampleEvent: CalendarEvent = {
  id: "1",
  calendarId: "cal-1",
  title: "Team Meeting",
  description: "Weekly sync",
  location: "Room 301",
  start: new Date(2026, 3, 10, 10, 0),
  end: new Date(2026, 3, 10, 11, 30),
  isAllDay: false,
  status: "confirmed",
  priority: "normal",
  participants: [
    { id: "u1", name: "Alice", role: "organizer", status: "accepted" },
    { id: "u2", name: "Bob", role: "required", status: "pending" },
    { id: "u3", name: "Carol", role: "optional", status: "tentative" },
  ],
};

const meta = {
  title: "ReactoryCalendar/Primitives/EventCard",
  component: EventCard,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ width: 220, p: 1 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof EventCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { event: sampleEvent },
};

export const WithDetails: Story = {
  args: {
    event: sampleEvent,
    showTime: true,
    showLocation: true,
    showParticipants: true,
  },
};

export const Compact: Story = {
  args: { event: sampleEvent, isCompact: true },
};

export const CustomColor: Story = {
  args: { event: sampleEvent, color: "#d32f2f" },
};

export const Selected: Story = {
  args: { event: sampleEvent, isSelected: true },
};

export const Dragging: Story = {
  args: { event: sampleEvent, isDragging: true },
};
