import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { SelectionOverlay } from "./SelectionOverlay";

const meta = {
  title: "ReactoryCalendar/Controls/SelectionOverlay",
  component: SelectionOverlay,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ position: "relative", height: 300, bgcolor: "grey.100" }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof SelectionOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    start: new Date(2026, 0, 15, 9, 0),
    end: new Date(2026, 0, 15, 10, 30),
    position: { top: 40, left: 64, width: 200, height: 90 },
  },
};
