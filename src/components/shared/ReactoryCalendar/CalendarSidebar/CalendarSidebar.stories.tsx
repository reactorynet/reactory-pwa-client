import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { CalendarSidebar } from "./CalendarSidebar";
import { CalendarSource } from "../types";

const calendars: CalendarSource[] = [
  { id: "work", name: "Work", color: "#1976d2", visible: true },
  { id: "personal", name: "Personal", color: "#388e3c", visible: true },
  { id: "holidays", name: "Holidays", color: "#f57c00", visible: false },
];

const meta = {
  title: "ReactoryCalendar/Controls/CalendarSidebar",
  component: CalendarSidebar,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ height: "100vh", display: "flex" }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof CalendarSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { date: new Date(), calendars },
};

export const WithCreate: Story = {
  args: { date: new Date(), calendars, onCalendarCreate: () => alert("Create") },
};
