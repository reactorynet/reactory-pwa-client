import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { CalendarList } from "./CalendarList";
import { CalendarSource } from "../types";

const calendars: CalendarSource[] = [
  { id: "work", name: "Work", color: "#1976d2", visible: true },
  { id: "personal", name: "Personal", color: "#388e3c", visible: true },
  { id: "holidays", name: "Holidays", color: "#f57c00", visible: false },
  { id: "birthdays", name: "Birthdays", color: "#7b1fa2", visible: true },
];

const meta = {
  title: "ReactoryCalendar/Controls/CalendarList",
  component: CalendarList,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ width: 260 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof CalendarList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { calendars },
};

export const WithEdit: Story = {
  args: { calendars, onEdit: (id) => alert(`Edit: ${id}`) },
};
