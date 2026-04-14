import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { AllDayRow } from "./AllDayRow";
import { CalendarEvent } from "../types";

const weekDates = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(2026, 3, 6 + i); // Mon-Sun
  d.setHours(0, 0, 0, 0);
  return d;
});

const events: CalendarEvent[] = [
  {
    id: "ad1",
    calendarId: "cal-1",
    title: "Team Off-site",
    start: new Date(2026, 3, 6),
    end: new Date(2026, 3, 8),
    isAllDay: true,
    status: "confirmed",
    priority: "normal",
    color: "#388e3c",
  },
  {
    id: "ad2",
    calendarId: "cal-1",
    title: "Public Holiday",
    start: new Date(2026, 3, 10),
    end: new Date(2026, 3, 10),
    isAllDay: true,
    status: "confirmed",
    priority: "low",
    color: "#d32f2f",
  },
];

const meta = {
  title: "ReactoryCalendar/Primitives/AllDayRow",
  component: AllDayRow,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ width: 700 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof AllDayRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { dates: weekDates, events },
};

export const Empty: Story = {
  args: { dates: weekDates, events: [] },
};
