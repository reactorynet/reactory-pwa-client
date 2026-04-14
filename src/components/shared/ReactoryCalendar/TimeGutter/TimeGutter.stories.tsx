import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { TimeGutter } from "./TimeGutter";

const meta = {
  title: "ReactoryCalendar/Primitives/TimeGutter",
  component: TimeGutter,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ height: 480, overflow: "auto" }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof TimeGutter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WorkingHours: Story = {
  args: { startHour: 8, endHour: 18, slotDuration: 30 },
};

export const FullDay: Story = {
  args: { startHour: 0, endHour: 24, slotDuration: 30 },
};

export const TwelveHourFormat: Story = {
  args: { startHour: 8, endHour: 18, slotDuration: 30, timeFormat: "h:mm a" },
};

export const WithCurrentTime: Story = {
  args: { startHour: 8, endHour: 18, slotDuration: 30, showCurrentTime: true },
};
