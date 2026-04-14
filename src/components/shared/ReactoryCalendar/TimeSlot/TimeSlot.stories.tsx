import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { TimeSlot } from "./TimeSlot";

const meta = {
  title: "ReactoryCalendar/Primitives/TimeSlot",
  component: TimeSlot,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "A single time slot cell for time-based calendar views.",
      },
    },
  },
  argTypes: {
    duration: { control: "select", options: [15, 30, 60] },
    isCurrentTime: { control: "boolean" },
    isWorkingHour: { control: "boolean" },
    isSelected: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ width: 200 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof TimeSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    time: new Date(2026, 3, 10, 9, 0),
    duration: 30,
    isWorkingHour: true,
  },
};

export const Selected: Story = {
  args: {
    time: new Date(2026, 3, 10, 10, 0),
    duration: 30,
    isSelected: true,
    isWorkingHour: true,
  },
};

export const NonWorkingHour: Story = {
  args: {
    time: new Date(2026, 3, 10, 6, 0),
    duration: 30,
    isWorkingHour: false,
  },
};

export const OneHourSlot: Story = {
  args: {
    time: new Date(2026, 3, 10, 14, 0),
    duration: 60,
    isWorkingHour: true,
  },
};

export const FifteenMinuteSlot: Story = {
  args: {
    time: new Date(2026, 3, 10, 11, 0),
    duration: 15,
    isWorkingHour: true,
  },
};
