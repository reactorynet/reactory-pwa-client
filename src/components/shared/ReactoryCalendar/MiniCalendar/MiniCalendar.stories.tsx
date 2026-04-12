import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { MiniCalendar } from "./MiniCalendar";

const marked = new Map([
  ["2026-04-10", { color: "#1976d2", count: 3 }],
  ["2026-04-15", { color: "#388e3c", count: 1 }],
  ["2026-04-22", { color: "#d32f2f", count: 2 }],
]);

const meta = {
  title: "ReactoryCalendar/Views/MiniCalendar",
  component: MiniCalendar,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ p: 2 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof MiniCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { date: new Date(2026, 3, 1) },
};

export const WithSelected: Story = {
  args: {
    date: new Date(2026, 3, 1),
    selectedDate: new Date(2026, 3, 15),
  },
};

export const WithMarkers: Story = {
  args: {
    date: new Date(2026, 3, 1),
    markedDates: marked,
  },
};

export const SundayStart: Story = {
  args: { date: new Date(2026, 3, 1), weekStartsOn: 0 },
};
