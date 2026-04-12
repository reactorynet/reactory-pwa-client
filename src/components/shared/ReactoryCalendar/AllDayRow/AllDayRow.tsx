import React, { useCallback } from "react";
import { Box, useTheme } from "@mui/material";
import { isSameDay } from "date-fns";
import { AllDayRowProps, CalendarEvent } from "../types";
import { ALL_DAY_ROW_HEIGHT, EVENT_CHIP_HEIGHT } from "../constants";
import { EventChip } from "../EventChip";
import { isMultiDayEvent } from "../utils/eventUtils";

export const AllDayRow: React.FC<AllDayRowProps> = ({
  dates,
  events,
  onEventClick,
  onSlotClick,
  sx,
}) => {
  const theme = useTheme();

  // Only show all-day or multi-day events
  const allDayEvents = events.filter(
    (e) => e.isAllDay || isMultiDayEvent(e),
  );

  const handleSlotClick = useCallback(
    (date: Date) => {
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      onSlotClick?.(date, end);
    },
    [onSlotClick],
  );

  // Determine visible row count
  const rowCount = Math.max(1, allDayEvents.length);

  return (
    <Box
      role="row"
      aria-label="All-day events"
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${dates.length}, 1fr)`,
        minHeight: ALL_DAY_ROW_HEIGHT * rowCount + 8,
        borderBottom: `1px solid ${theme.palette.divider}`,
        ...sx,
      }}
    >
      {dates.map((date, colIndex) => {
        const dayEvents = allDayEvents.filter(
          (e) =>
            date >= new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate()) &&
            date <= new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate()),
        );

        return (
          <Box
            key={colIndex}
            onClick={() => handleSlotClick(date)}
            sx={{
              position: "relative",
              borderRight:
                colIndex < dates.length - 1
                  ? `1px solid ${theme.palette.divider}`
                  : "none",
              p: 0.25,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 0.25,
            }}
          >
            {dayEvents.map((event) => (
              <EventChip
                key={event.id}
                event={event}
                isMultiDay={isMultiDayEvent(event)}
                isStart={isSameDay(date, event.start)}
                isEnd={isSameDay(date, event.end)}
                onClick={onEventClick}
              />
            ))}
          </Box>
        );
      })}
    </Box>
  );
};
