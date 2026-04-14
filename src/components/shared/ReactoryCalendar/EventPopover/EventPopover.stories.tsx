import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box, Button } from "@mui/material";
import { ThemeWrapper } from "@reactory/client-storybook/ThemeWrapper";
import { EventPopover } from "./EventPopover";
import { CalendarEvent } from "../types";

const event: CalendarEvent = {
  id: "1",
  calendarId: "work",
  title: "Sprint Planning",
  start: new Date(2026, 0, 15, 9, 0),
  end: new Date(2026, 0, 15, 10, 30),
  isAllDay: false,
  status: "confirmed",
  priority: "high",
  location: "Conference Room B",
  description: "Q1 Sprint planning session for the dev team.",
  color: "#1976d2",
};

const Template: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  return (
    <>
      <Button variant="outlined" onClick={(e) => setAnchor(e.currentTarget)}>
        Show Popover
      </Button>
      <EventPopover
        event={event}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        onEdit={() => alert("Edit")}
        onDelete={() => alert("Delete")}
        onDuplicate={() => alert("Duplicate")}
      />
    </>
  );
};

const meta = {
  title: "ReactoryCalendar/Controls/EventPopover",
  component: EventPopover,
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Box sx={{ p: 4 }}>
          <Story />
        </Box>
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof EventPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { event, anchorEl: null as unknown as HTMLElement },
  render: () => <Template event={event} />,
};

export const AllDay: Story = {
  args: { event: { ...event, isAllDay: true, title: "Team Offsite", location: undefined }, anchorEl: null as unknown as HTMLElement },
  render: () => (
    <Template
      event={{ ...event, isAllDay: true, title: "Team Offsite", location: undefined }}
    />
  ),
};
