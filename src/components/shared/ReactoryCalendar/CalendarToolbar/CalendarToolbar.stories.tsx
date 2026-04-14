import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { CalendarToolbar } from "./CalendarToolbar";

const meta = {
  title: "ReactoryCalendar/Controls/CalendarToolbar",
  component: CalendarToolbar,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof CalendarToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    date: new Date(),
    view: "month",
    title: "January 2026",
  },
};

export const WeekView: Story = {
  args: {
    date: new Date(),
    view: "week",
    title: "Jan 5 – 11, 2026",
    views: ["day", "week", "month"],
  },
};
