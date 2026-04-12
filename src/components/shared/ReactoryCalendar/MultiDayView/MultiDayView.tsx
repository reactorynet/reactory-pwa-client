import React, { useMemo, useCallback } from "react";
import { Box, useTheme } from "@mui/material";
import { isToday as dateIsToday } from "date-fns";
import { MultiDayViewProps } from "../types";
import {
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  DEFAULT_SLOT_DURATION,
  HOUR_HEIGHT,
} from "../constants";
import { getMultiDayRange, getTimeSlots, isWorkingHour } from "../utils/dateUtils";
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
import { getHours } from "date-fns";

export const MultiDayView: React.FC<MultiDayViewProps> = ({
  date,
  events,
  calendars,
  numberOfDays,
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

  const days = useMemo(
    () => getMultiDayRange(date, numberOfDays),
    [date, numberOfDays],
  );

  const visibleEvents = useMemo(
    () => (calendars ? filterEventsByCalendar(events, calendars) : events),
    [events, calendars],
  );

  const allDayEvents = useMemo(
    () => getAllDayEvents(visibleEvents),
    [visibleEvents],
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
      aria-label={`${numberOfDays}-day view`}
      sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", ...sx }}
    >
      {/* Header row: gutter spacer + day column headers */}
      <Box sx={{ display: "flex", borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ width: 64, flexShrink: 0 }} />
        {days.map((day, i) => (
          <Box key={i} sx={{ flex: 1 }}>
            <DayColumnHeader date={day} isToday={dateIsToday(day)} />
          </Box>
        ))}
      </Box>

      {/* All-day row */}
      {showAllDay && allDayEvents.length > 0 && (
        <Box sx={{ display: "flex" }}>
          <Box sx={{ width: 64, flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>
            <AllDayRow
              dates={days}
              events={allDayEvents}
              onEventClick={onEventClick}
              onSlotClick={onSlotClick}
            />
          </Box>
        </Box>
      )}

      {/* Time grid body */}
      <Box sx={{ display: "flex", flex: 1, overflow: "auto" }}>
        <TimeGutter
          startHour={startHour}
          endHour={endHour}
          slotDuration={slotDuration}
          showCurrentTime={showCurrentTime}
        />

        <Box sx={{ display: "flex", flex: 1, position: "relative" }}>
          {days.map((day, dayIndex) => {
            const dayTimedEvents = sortEventsByTime(
              getTimedEvents(filterEventsByDay(visibleEvents, day)),
            );
            const positioned = layoutEventsForDay(dayTimedEvents);
            const slots = getTimeSlots(day, startHour, endHour, slotDuration);

            return (
              <Box
                key={dayIndex}
                sx={{
                  flex: 1,
                  position: "relative",
                  borderRight:
                    dayIndex < days.length - 1
                      ? `1px solid ${theme.palette.divider}`
                      : "none",
                  height: containerHeight,
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
                  const chipColor = getEventColor(pe.event, calendars);

                  const defaultRender = () => (
                    <EventCard
                      event={pe.event}
                      color={chipColor}
                      isCompact
                      style={{ position: "absolute", ...style }}
                      onClick={onEventClick}
                      onDoubleClick={onEventDoubleClick}
                      onDragStart={() => undefined}
                      onResizeStart={() => undefined}
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

                {showCurrentTime && dateIsToday(day) && (
                  <CurrentTimeIndicator
                    containerHeight={containerHeight}
                    startHour={startHour}
                    endHour={endHour}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};
