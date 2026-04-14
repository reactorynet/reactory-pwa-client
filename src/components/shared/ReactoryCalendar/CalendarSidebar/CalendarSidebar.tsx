import React from "react";
import { Box, Button, Divider, Typography, useTheme } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { CalendarSidebarProps } from "../types";
import { SIDEBAR_WIDTH } from "../constants";
import { MiniCalendar } from "../MiniCalendar";
import { CalendarList } from "../CalendarList";

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  date,
  calendars,
  selectedDate,
  events,
  onDateSelect,
  onCalendarToggle,
  onCalendarCreate,
  sx,
}) => {
  const theme = useTheme();

  return (
    <Box
      role="complementary"
      aria-label="Calendar sidebar"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        borderRight: `1px solid ${theme.palette.divider}`,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        ...sx,
      }}
    >
      {onCalendarCreate && (
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCalendarCreate}
            fullWidth
          >
            Create
          </Button>
        </Box>
      )}

      <Box sx={{ px: 1, py: 1 }}>
        <MiniCalendar
          date={date}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
        />
      </Box>

      <Divider />

      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          My calendars
        </Typography>
      </Box>

      <CalendarList
        calendars={calendars}
        onToggle={onCalendarToggle}
        sx={{ px: 1 }}
      />
    </Box>
  );
};
