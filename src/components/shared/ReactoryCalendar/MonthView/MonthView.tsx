import React, { useMemo, useCallback } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { format, isSameDay, isSameMonth, isToday as dateIsToday, isWeekend as dateIsWeekend } from "date-fns";
import { MonthViewProps } from "../types";
import {
  DEFAULT_WEEK_STARTS_ON,
  DEFAULT_MAX_EVENTS_PER_DAY,
} from "../constants";
import { getMonthGrid } from "../utils/dateUtils";
import {
  filterEventsByCalendar,
  filterEventsByDay,
  sortEventsByTime,
  getEventColor,
} from "../utils/eventUtils";
import { DayCell } from "../DayCell";
import { EventChip } from "../EventChip";

export const MonthView: React.FC<MonthViewProps> = ({
  date,
  events,
  calendars,
  weekStartsOn = DEFAULT_WEEK_STARTS_ON,
  maxEventsPerDay = DEFAULT_MAX_EVENTS_PER_DAY,
  onEventClick,
  onEventDoubleClick,
  onSlotClick,
  onSlotSelect,
  onEventDrop,
  onDateClick,
  renderEvent,
  renderDayCell,
  sx,
}) => {
  const theme = useTheme();

  const grid = useMemo(
    () => getMonthGrid(date, weekStartsOn),
    [date, weekStartsOn],
  );

  const visibleEvents = useMemo(
    () =>
      calendars
        ? filterEventsByCalendar(events, calendars)
        : events,
    [events, calendars],
  );

  // Day name headers
  const dayHeaders = useMemo(() => {
    const fullNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const shortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result: { full: string; short: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const idx = (weekStartsOn + i) % 7;
      result.push({ full: fullNames[idx], short: shortNames[idx] });
    }
    return result;
  }, [weekStartsOn]);

  const handleSlotClick = useCallback(
    (d: Date) => {
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      onSlotClick?.(start, end);
    },
    [onSlotClick],
  );

  return (
    <Box
      role="grid"
      aria-label="Month view"
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        ...sx,
      }}
    >
      {/* Day name header */}
      <Box
        role="row"
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {dayHeaders.map((d) => (
          <Typography
            key={d.short}
            role="columnheader"
            variant="caption"
            align="center"
            sx={{
              py: 0.75,
              fontWeight: 600,
              textTransform: "uppercase",
              color: theme.palette.text.secondary,
              fontSize: "0.7rem",
            }}
          >
            {d.short}
          </Typography>
        ))}
      </Box>

      {/* Week rows */}
      {grid.map((week, wi) => (
        <Box
          key={wi}
          role="row"
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            flex: 1,
          }}
        >
          {week.map((day, di) => {
            const dayEvents = sortEventsByTime(
              filterEventsByDay(visibleEvents, day),
            );
            const visibleSlice = dayEvents.slice(0, maxEventsPerDay);
            const hiddenCount = Math.max(0, dayEvents.length - maxEventsPerDay);
            const today = dateIsToday(day);
            const inMonth = isSameMonth(day, date);

            const defaultRender = () => (
              <DayCell
                date={day}
                isToday={today}
                isCurrentMonth={inMonth}
                isWeekend={dateIsWeekend(day)}
                eventCount={dayEvents.length}
                maxVisibleEvents={maxEventsPerDay}
                onClick={onDateClick || (() => handleSlotClick(day))}
                onMoreClick={(d, count) => onDateClick?.(d)}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                  {visibleSlice.map((event) => {
                    const chipColor = getEventColor(event, calendars);
                    const defaultChip = () => (
                      <EventChip
                        key={event.id}
                        event={event}
                        color={chipColor}
                        onClick={onEventClick}
                        onDoubleClick={onEventDoubleClick}
                      />
                    );

                    return (
                      <React.Fragment key={event.id}>
                        {renderEvent
                          ? renderEvent(event, defaultChip)
                          : defaultChip()}
                      </React.Fragment>
                    );
                  })}
                </Box>
              </DayCell>
            );

            return (
              <React.Fragment key={di}>
                {renderDayCell
                  ? renderDayCell(day, dayEvents, defaultRender)
                  : defaultRender()}
              </React.Fragment>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};
