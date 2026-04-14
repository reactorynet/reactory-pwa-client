import React, { useMemo, useCallback } from "react";
import { Box, Typography, Avatar, useTheme } from "@mui/material";
import { format } from "date-fns";
import { ScheduleViewProps, CalendarResource, CalendarEvent } from "../types";
import {
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  DEFAULT_SLOT_DURATION,
  HOUR_HEIGHT,
} from "../constants";
import { getTimeSlots, isWorkingHour } from "../utils/dateUtils";
import {
  filterEventsByDay,
  getTimedEvents,
  sortEventsByTime,
  getEventColor,
} from "../utils/eventUtils";
import { layoutEventsForDay, calculateEventStyle } from "../utils/positionUtils";
import { TimeGutter } from "../TimeGutter";
import { EventCard } from "../EventCard";
import { TimeSlot } from "../TimeSlot";
import { getHours } from "date-fns";

const ResourceLabel: React.FC<{ resource: CalendarResource }> = ({ resource }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1,
        width: 180,
        flexShrink: 0,
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      {resource.avatar ? (
        <Avatar src={resource.avatar} sx={{ width: 28, height: 28 }} />
      ) : (
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: resource.color || theme.palette.primary.main,
            fontSize: 14,
          }}
        >
          {resource.name.charAt(0)}
        </Avatar>
      )}
      <Typography variant="body2" noWrap>
        {resource.name}
      </Typography>
    </Box>
  );
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  date,
  events,
  resources,
  orientation = "horizontal",
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
  slotDuration = DEFAULT_SLOT_DURATION,
  onEventClick,
  onEventDrop,
  onSlotSelect,
  renderResource,
  renderEvent,
  sx,
}) => {
  const theme = useTheme();

  const totalHours = endHour - startHour;
  const containerHeight = totalHours * HOUR_HEIGHT;

  const slots = useMemo(
    () => getTimeSlots(date, startHour, endHour, slotDuration),
    [date, startHour, endHour, slotDuration],
  );

  const dayEvents = useMemo(
    () => sortEventsByTime(getTimedEvents(filterEventsByDay(events, date))),
    [events, date],
  );

  const getResourceEvents = useCallback(
    (resourceId: string): CalendarEvent[] =>
      dayEvents.filter((e) => e.resourceId === resourceId),
    [dayEvents],
  );

  const handleSlotClick = useCallback(
    (time: Date) => {
      const end = new Date(time.getTime() + slotDuration * 60 * 1000);
      onSlotSelect?.(time, end, false);
    },
    [onSlotSelect, slotDuration],
  );

  if (orientation === "vertical") {
    return (
      <Box
        role="grid"
        aria-label="Schedule view"
        sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "auto", ...sx }}
      >
        {/* Column headers: spacer + resource names */}
        <Box sx={{ display: "flex", borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ width: 64, flexShrink: 0 }} />
          {resources.map((r) => {
            const defaultRender = () => (
              <Box
                key={r.id}
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 1,
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                <ResourceLabel resource={r} />
              </Box>
            );
            return (
              <React.Fragment key={r.id}>
                {renderResource ? renderResource(r, defaultRender) : defaultRender()}
              </React.Fragment>
            );
          })}
        </Box>

        {/* Body: time gutter + resource columns */}
        <Box sx={{ display: "flex", flex: 1, overflow: "auto" }}>
          <TimeGutter
            startHour={startHour}
            endHour={endHour}
            slotDuration={slotDuration}
          />

          {resources.map((r) => {
            const resEvents = getResourceEvents(r.id);
            const positioned = layoutEventsForDay(resEvents);

            return (
              <Box
                key={r.id}
                sx={{
                  flex: 1,
                  position: "relative",
                  height: containerHeight,
                  borderRight: `1px solid ${theme.palette.divider}`,
                }}
              >
                {slots.map((slotTime, si) => (
                  <TimeSlot
                    key={si}
                    time={slotTime}
                    duration={slotDuration}
                    isWorkingHour={isWorkingHour(getHours(slotTime))}
                    onClick={handleSlotClick}
                  />
                ))}

                {positioned.map((pe) => {
                  const style = calculateEventStyle(
                    pe,
                    containerHeight,
                    startHour,
                    endHour,
                    HOUR_HEIGHT,
                  );

                  const defaultEventRender = () => (
                    <EventCard
                      event={pe.event}
                      color={r.color || theme.palette.primary.main}
                      isCompact
                      style={{ position: "absolute", ...style }}
                      onClick={onEventClick}
                    />
                  );

                  return (
                    <React.Fragment key={pe.event.id}>
                      {renderEvent
                        ? renderEvent(pe.event, defaultEventRender)
                        : defaultEventRender()}
                    </React.Fragment>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  }

  // Default: horizontal orientation — resources stacked as rows
  return (
    <Box
      role="grid"
      aria-label="Schedule view"
      sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "auto", ...sx }}
    >
      {/* Time header */}
      <Box sx={{ display: "flex", borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ width: 180, flexShrink: 0 }} />
        <Box sx={{ display: "flex", flex: 1 }}>
          {slots
            .filter((_, i) => i % (60 / slotDuration) === 0)
            .map((slotTime, i) => (
              <Box
                key={i}
                sx={{
                  flex: 60 / slotDuration,
                  textAlign: "left",
                  px: 0.5,
                  py: 0.5,
                  borderLeft: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {format(slotTime, "h a")}
                </Typography>
              </Box>
            ))}
        </Box>
      </Box>

      {/* Resource rows */}
      {resources.map((r) => {
        const resEvents = getResourceEvents(r.id);
        const positioned = layoutEventsForDay(resEvents);
        const slotWidth = 100 / slots.length;

        const defaultResourceRender = () => <ResourceLabel resource={r} />;

        return (
          <Box
            key={r.id}
            sx={{
              display: "flex",
              borderBottom: `1px solid ${theme.palette.divider}`,
              minHeight: 64,
            }}
          >
            {/* Resource label */}
            {renderResource
              ? renderResource(r, defaultResourceRender)
              : defaultResourceRender()}

            {/* Horizontal time lane */}
            <Box sx={{ flex: 1, position: "relative" }}>
              {/* Slot dividers */}
              <Box sx={{ display: "flex", height: "100%" }}>
                {slots.map((_, si) => (
                  <Box
                    key={si}
                    sx={{
                      flex: 1,
                      borderLeft: `1px solid ${
                        si % (60 / slotDuration) === 0
                          ? theme.palette.divider
                          : "transparent"
                      }`,
                    }}
                  />
                ))}
              </Box>

              {/* Positioned events as horizontal bars */}
              {positioned.map((pe) => {
                const startMinutes =
                  (pe.event.start.getHours() - startHour) * 60 +
                  pe.event.start.getMinutes();
                const endMinutes =
                  (pe.event.end.getHours() - startHour) * 60 +
                  pe.event.end.getMinutes();
                const totalMinutes = totalHours * 60;
                const leftPct = (startMinutes / totalMinutes) * 100;
                const widthPct =
                  ((endMinutes - startMinutes) / totalMinutes) * 100;

                const defaultEventRender = () => (
                  <Box
                    onClick={(e) => onEventClick?.(pe.event, e)}
                    sx={{
                      position: "absolute",
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: 4 + pe.column * 26,
                      height: 22,
                      bgcolor: r.color || theme.palette.primary.main,
                      color: theme.palette.getContrastText(
                        r.color || theme.palette.primary.main,
                      ),
                      borderRadius: 1,
                      px: 0.5,
                      overflow: "hidden",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      "&:hover": { opacity: 0.85 },
                    }}
                  >
                    <Typography variant="caption" noWrap>
                      {pe.event.title}
                    </Typography>
                  </Box>
                );

                return (
                  <React.Fragment key={pe.event.id}>
                    {renderEvent
                      ? renderEvent(pe.event, defaultEventRender)
                      : defaultEventRender()}
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
