import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { DayColumnHeader } from "./DayColumnHeader";

const meta = {
  title: "ReactoryCalendar/Primitives/DayColumnHeader",
  component: DayColumnHeader,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ width: 120 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof DayColumnHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { date: new Date(2026, 3, 10) },
};

export const Today: Story = {
  args: { date: new Date(), isToday: true },
};

export const NameOnly: Story = {
  args: { date: new Date(2026, 3, 10), showDate: false },
};

export const DateOnly: Story = {
  args: { date: new Date(2026, 3, 10), showDayName: false },
};
