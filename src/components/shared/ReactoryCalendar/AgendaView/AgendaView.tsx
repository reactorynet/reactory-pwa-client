import React, { useMemo } from "react";
import { Box, Typography, Divider, useTheme } from "@mui/material";
import { format, addDays } from "date-fns";
import { AgendaViewProps } from "../types";
import { DEFAULT_AGENDA_DAYS, DATE_FORMAT_FULL, DAY_NAME_FULL } from "../constants";
import {
  filterEventsByCalendar,
  filterEventsByDateRange,
  groupEventsByDate,
  sortEventsByTime,
  getEventColor,
} from "../utils/eventUtils";
import { EventCard } from "../EventCard";

export const AgendaView: React.FC<AgendaViewProps> = ({
  date,
  events,
  calendars,
  daysToShow = DEFAULT_AGENDA_DAYS,
  emptyMessage = "No upcoming events",
  groupBy = "day",
  onEventClick,
  onEventDoubleClick,
  renderEvent,
  sx,
}) => {
  const theme = useTheme();

  const rangeEnd = useMemo(() => addDays(date, daysToShow), [date, daysToShow]);

  const visibleEvents = useMemo(() => {
    let filtered = calendars
      ? filterEventsByCalendar(events, calendars)
      : events;
    filtered = filterEventsByDateRange(filtered, date, rangeEnd);
    return sortEventsByTime(filtered);
  }, [events, calendars, date, rangeEnd]);

  const groupedByDate = useMemo(
    () => groupEventsByDate(visibleEvents),
    [visibleEvents],
  );

  // Sort date keys chronologically
  const sortedKeys = useMemo(
    () =>
      Array.from(groupedByDate.keys()).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      ),
    [groupedByDate],
  );

  if (visibleEvents.length === 0) {
    return (
      <Box
        role="list"
        aria-label="Agenda view"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          py: 8,
          ...sx,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box role="list" aria-label="Agenda view" sx={{ flex: 1, overflow: "auto", ...sx }}>
      {sortedKeys.map((dateKey) => {
        const dayEvents = groupedByDate.get(dateKey) || [];
        const dayDate = new Date(dateKey + "T00:00:00");

        return (
          <Box key={dateKey} sx={{ mb: 1 }}>
            {/* Day header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                py: 1,
                px: 2,
                position: "sticky",
                top: 0,
                backgroundColor: theme.palette.background.default,
                zIndex: 1,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: theme.palette.primary.main }}
              >
                {format(dayDate, DAY_NAME_FULL)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(dayDate, DATE_FORMAT_FULL)}
              </Typography>
            </Box>
            <Divider />

            {/* Events */}
            <Box sx={{ px: 2, py: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
              {dayEvents.map((event) => {
                const chipColor = getEventColor(event, calendars);
                const defaultRender = () => (
                  <EventCard
                    event={event}
                    color={chipColor}
                    showTime
                    showLocation
                    showParticipants
                    onClick={onEventClick}
                    onDoubleClick={onEventDoubleClick}
                  />
                );

                return (
                  <React.Fragment key={event.id}>
                    {renderEvent
                      ? renderEvent(event, defaultRender)
                      : defaultRender()}
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
