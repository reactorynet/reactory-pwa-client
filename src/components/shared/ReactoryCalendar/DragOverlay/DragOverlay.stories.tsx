import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { DragOverlay } from "./DragOverlay";

const meta = {
  title: "ReactoryCalendar/Controls/DragOverlay",
  component: DragOverlay,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ position: "relative", height: 200 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof DragOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    event: {
      id: "1",
      calendarId: "c1",
      title: "Meeting",
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      isAllDay: false,
      status: "confirmed",
      priority: "normal",
      color: "#1976d2",
    },
    position: { x: 100, y: 80 },
    width: 180,
    height: 40,
  },
};
