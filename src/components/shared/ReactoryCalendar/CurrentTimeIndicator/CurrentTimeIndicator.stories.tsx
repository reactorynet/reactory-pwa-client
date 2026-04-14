import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { CurrentTimeIndicator } from "./CurrentTimeIndicator";

const meta = {
  title: "ReactoryCalendar/Primitives/CurrentTimeIndicator",
  component: CurrentTimeIndicator,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box
          sx={{
            position: "relative",
            width: 300,
            height: 600,
            border: "1px solid #ddd",
          }}
        >
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof CurrentTimeIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { containerHeight: 600, startHour: 8, endHour: 18 },
};

export const FullDay: Story = {
  args: { containerHeight: 1440, startHour: 0, endHour: 24 },
};
