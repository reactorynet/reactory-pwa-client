import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { DayCell } from "./DayCell";

const meta = {
  title: "ReactoryCalendar/Primitives/DayCell",
  component: DayCell,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "A single day cell in the month grid view.",
      },
    },
  },
  argTypes: {
    isToday: { control: "boolean" },
    isCurrentMonth: { control: "boolean" },
    isWeekend: { control: "boolean" },
    isSelected: { control: "boolean" },
    eventCount: { control: "number" },
    maxVisibleEvents: { control: "number" },
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ width: 150 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof DayCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    date: new Date(2026, 3, 15),
    isCurrentMonth: true,
  },
};

export const Today: Story = {
  args: {
    date: new Date(),
    isToday: true,
    isCurrentMonth: true,
  },
};

export const OtherMonth: Story = {
  args: {
    date: new Date(2026, 2, 30),
    isCurrentMonth: false,
  },
};

export const Weekend: Story = {
  args: {
    date: new Date(2026, 3, 11), // Saturday
    isWeekend: true,
    isCurrentMonth: true,
  },
};

export const WithOverflow: Story = {
  args: {
    date: new Date(2026, 3, 15),
    isCurrentMonth: true,
    eventCount: 5,
    maxVisibleEvents: 2,
  },
};

export const Selected: Story = {
  args: {
    date: new Date(2026, 3, 15),
    isCurrentMonth: true,
    isSelected: true,
  },
};
