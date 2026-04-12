import React, { useMemo, useCallback } from "react";
import { Box, useTheme } from "@mui/material";
import { isToday as dateIsToday, getHours } from "date-fns";
import { DayViewProps } from "../types";
import {
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  DEFAULT_SLOT_DURATION,
  HOUR_HEIGHT,
} from "../constants";
import { getTimeSlots, isWorkingHour } from "../utils/dateUtils";
import {
  filterEventsByCalendar,
  filterEventsByDay,
  getAllDayEvents,
  getTimedEvents,
  sortEventsByTime,
  getEventColor,
} from "../utils/eventUtils";
import { layoutEventsForDay, calculateEventStyle } from "../utils/positionUtils";
import { TimeGutter } from "../TimeGutter";
import { DayColumnHeader } from "../DayColumnHeader";
import { AllDayRow } from "../AllDayRow";
import { EventCard } from "../EventCard";
import { CurrentTimeIndicator } from "../CurrentTimeIndicator";
import { TimeSlot } from "../TimeSlot";

export const DayView: React.FC<DayViewProps> = ({
  date,
  events,
  calendars,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
  slotDuration = DEFAULT_SLOT_DURATION,
  showAllDay = true,
  showCurrentTime = true,
  onEventClick,
  onEventDoubleClick,
  onSlotClick,
  onSlotSelect,
  onEventDrop,
  onEventResize,
  renderEvent,
  sx,
}) => {
  const theme = useTheme();
  const today = dateIsToday(date);

  const visibleEvents = useMemo(
    () => (calendars ? filterEventsByCalendar(events, calendars) : events),
    [events, calendars],
  );

  const allDayEvents = useMemo(
    () => getAllDayEvents(filterEventsByDay(visibleEvents, date)),
    [visibleEvents, date],
  );

  const timedEvents = useMemo(
    () =>
      sortEventsByTime(getTimedEvents(filterEventsByDay(visibleEvents, date))),
    [visibleEvents, date],
  );

  const positioned = useMemo(
    () => layoutEventsForDay(timedEvents),
    [timedEvents],
  );

  const slots = useMemo(
    () => getTimeSlots(date, startHour, endHour, slotDuration),
    [date, startHour, endHour, slotDuration],
  );

  const totalHours = endHour - startHour;
  const containerHeight = totalHours * HOUR_HEIGHT;

  const handleSlotClick = useCallback(
    (time: Date) => {
      const end = new Date(time.getTime() + slotDuration * 60 * 1000);
      onSlotClick?.(time, end);
    },
    [onSlotClick, slotDuration],
  );

  return (
    <Box
      role="grid"
      aria-label="Day view"
      sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", ...sx }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ width: 64, flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <DayColumnHeader date={date} isToday={today} />
        </Box>
      </Box>

      {/* All-day row */}
      {showAllDay && allDayEvents.length > 0 && (
        <Box sx={{ display: "flex" }}>
          <Box sx={{ width: 64, flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <AllDayRow
              dates={[date]}
              events={allDayEvents}
              onEventClick={onEventClick}
              onSlotClick={onSlotClick}
            />
          </Box>
        </Box>
      )}

      {/* Time grid */}
      <Box sx={{ display: "flex", flex: 1, overflow: "auto" }}>
        <TimeGutter
          startHour={startHour}
          endHour={endHour}
          slotDuration={slotDuration}
          showCurrentTime={showCurrentTime}
        />

        <Box sx={{ flex: 1, position: "relative", height: containerHeight }}>
          {/* Slot backgrounds */}
          {slots.map((slotTime, si) => (
            <TimeSlot
              key={si}
              time={slotTime}
              duration={slotDuration}
              isWorkingHour={isWorkingHour(getHours(slotTime))}
              onClick={handleSlotClick}
            />
          ))}

          {/* Positioned events */}
          {positioned.map((pe) => {
            const style = calculateEventStyle(
              pe,
              containerHeight,
              startHour,
              endHour,
              HOUR_HEIGHT,
            );
            const chipColor = getEventColor(pe.event, calendars);

            const defaultRender = () => (
              <EventCard
                event={pe.event}
                color={chipColor}
                showTime
                showLocation
                style={{ position: "absolute", ...style }}
                onClick={onEventClick}
                onDoubleClick={onEventDoubleClick}
              />
            );

            return (
              <React.Fragment key={pe.event.id}>
                {renderEvent
                  ? renderEvent(pe.event, defaultRender)
                  : defaultRender()}
              </React.Fragment>
            );
          })}

          {/* Current time line */}
          {showCurrentTime && today && (
            <CurrentTimeIndicator
              containerHeight={containerHeight}
              startHour={startHour}
              endHour={endHour}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};
