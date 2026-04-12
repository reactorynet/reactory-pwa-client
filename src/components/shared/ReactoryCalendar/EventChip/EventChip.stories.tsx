import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { EventChip } from "./EventChip";
import { CalendarEvent } from "../types";

const sampleEvent: CalendarEvent = {
  id: "1",
  calendarId: "cal-1",
  title: "Team Meeting",
  start: new Date(2026, 3, 10, 10, 0),
  end: new Date(2026, 3, 10, 11, 0),
  isAllDay: false,
  status: "confirmed",
  priority: "normal",
};

const allDayEvent: CalendarEvent = {
  ...sampleEvent,
  id: "2",
  title: "Company Holiday",
  isAllDay: true,
};

const meta = {
  title: "ReactoryCalendar/Primitives/EventChip",
  component: EventChip,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Compact event pill for month view and all-day rows.",
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ width: 160, p: 1 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof EventChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { event: sampleEvent },
};

export const AllDay: Story = {
  args: { event: allDayEvent },
};

export const CustomColor: Story = {
  args: { event: sampleEvent, color: "#388e3c" },
};

export const Selected: Story = {
  args: { event: sampleEvent, isSelected: true },
};

export const Dragging: Story = {
  args: { event: sampleEvent, isDragging: true },
};

export const MultiDayStart: Story = {
  args: { event: allDayEvent, isMultiDay: true, isStart: true, isEnd: false },
};

export const MultiDayMiddle: Story = {
  args: {
    event: allDayEvent,
    isMultiDay: true,
    isStart: false,
    isEnd: false,
  },
};

export const MultiDayEnd: Story = {
  args: { event: allDayEvent, isMultiDay: true, isStart: false, isEnd: true },
};
