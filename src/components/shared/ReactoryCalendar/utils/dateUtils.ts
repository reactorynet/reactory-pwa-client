import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  addMinutes,
  addHours,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  isBefore,
  isAfter,
  isWithinInterval,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  differenceInMinutes,
  differenceInDays,
  format,
  getDay,
} from "date-fns";
import { CalendarViewType, DateRange, TimeSlotDuration, CalendarEvent } from "../types";
import {
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  DEFAULT_SLOT_DURATION,
  DEFAULT_WEEK_STARTS_ON,
  MONTH_YEAR_FORMAT,
  DATE_FORMAT_FULL,
} from "../constants";

// ─── Re-exports for convenience ──────────────────────────────────────────────

export {
  addMinutes,
  addHours,
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  isBefore,
  isAfter,
  format,
  differenceInMinutes,
  differenceInDays,
  getHours,
  getMinutes,
  getDay,
};

// ─── Month Grid ───────────────────────────────────────────────────────────────

/**
 * Generates a 2D array (6 rows × 7 cols) of dates for a month grid.
 * Includes days from previous/next months to fill the grid.
 */
export function getMonthGrid(
  date: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = DEFAULT_WEEK_STARTS_ON,
): Date[][] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const rows: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    rows.push(allDays.slice(i, i + 7));
  }

  // Ensure exactly 6 rows for consistent layout
  while (rows.length < 6) {
    const lastDay = rows[rows.length - 1][6];
    const nextWeekStart = addDays(lastDay, 1);
    rows.push(
      eachDayOfInterval({
        start: nextWeekStart,
        end: addDays(nextWeekStart, 6),
      }),
    );
  }

  return rows;
}

// ─── Week / Day Helpers ───────────────────────────────────────────────────────

/**
 * Returns an array of 7 dates representing the week containing the given date.
 */
export function getWeekDays(
  date: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = DEFAULT_WEEK_STARTS_ON,
): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn });
  return eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });
}

/**
 * Returns an array of N consecutive dates starting from the given date.
 */
export function getMultiDayRange(date: Date, numberOfDays: number): Date[] {
  return eachDayOfInterval({
    start: startOfDay(date),
    end: addDays(startOfDay(date), numberOfDays - 1),
  });
}

// ─── Time Slots ───────────────────────────────────────────────────────────────

/**
 * Generates time slot start times for a single day.
 * Returns an array of Date objects representing the start of each slot.
 */
export function getTimeSlots(
  date: Date,
  startHour: number = DEFAULT_START_HOUR,
  endHour: number = DEFAULT_END_HOUR,
  duration: TimeSlotDuration = DEFAULT_SLOT_DURATION,
): Date[] {
  const slots: Date[] = [];
  const dayStart = setMilliseconds(
    setSeconds(setMinutes(setHours(startOfDay(date), startHour), 0), 0),
    0,
  );
  const totalMinutes = (endHour - startHour) * 60;
  const slotCount = Math.floor(totalMinutes / duration);

  for (let i = 0; i < slotCount; i++) {
    slots.push(addMinutes(dayStart, i * duration));
  }

  return slots;
}

/**
 * Snaps a date to the nearest slot boundary.
 */
export function snapToSlot(date: Date, slotDuration: TimeSlotDuration): Date {
  const hours = getHours(date);
  const minutes = getMinutes(date);
  const totalMinutes = hours * 60 + minutes;
  const snapped = Math.round(totalMinutes / slotDuration) * slotDuration;
  const snappedHours = Math.floor(snapped / 60);
  const snappedMinutes = snapped % 60;

  return setMilliseconds(
    setSeconds(
      setMinutes(setHours(startOfDay(date), snappedHours), snappedMinutes),
      0,
    ),
    0,
  );
}

// ─── Date Ranges ──────────────────────────────────────────────────────────────

/**
 * Returns the start and end of a day as a DateRange.
 */
export function getDayRange(date: Date): DateRange {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  };
}

/**
 * Returns the start and end of a week as a DateRange.
 */
export function getWeekRange(
  date: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = DEFAULT_WEEK_STARTS_ON,
): DateRange {
  return {
    start: startOfWeek(date, { weekStartsOn }),
    end: endOfWeek(date, { weekStartsOn }),
  };
}

/**
 * Returns the start and end of a month as a DateRange.
 */
export function getMonthRange(date: Date): DateRange {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/**
 * Returns the visible range for a given view and date.
 */
export function getVisibleRange(
  date: Date,
  view: CalendarViewType,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = DEFAULT_WEEK_STARTS_ON,
  numberOfDays?: number,
): DateRange {
  switch (view) {
    case "day":
      return getDayRange(date);
    case "week":
      return getWeekRange(date, weekStartsOn);
    case "month": {
      // Visible range includes overflow days from sibling months
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      return {
        start: startOfWeek(monthStart, { weekStartsOn }),
        end: endOfWeek(monthEnd, { weekStartsOn }),
      };
    }
    case "year":
      return {
        start: new Date(date.getFullYear(), 0, 1),
        end: new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    case "multiDay":
      return {
        start: startOfDay(date),
        end: endOfDay(addDays(date, (numberOfDays || 3) - 1)),
      };
    case "agenda":
      return {
        start: startOfDay(date),
        end: endOfDay(addDays(date, 29)),
      };
    case "schedule":
      return getDayRange(date);
    default:
      return getWeekRange(date, weekStartsOn);
  }
}

// ─── Date Predicates ──────────────────────────────────────────────────────────

/**
 * Checks if a date falls within a given range (inclusive).
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return isWithinInterval(date, { start, end });
}

/**
 * Returns events that overlap with the given date range.
 */
export function getOverlappingEvents(
  events: CalendarEvent[],
  start: Date,
  end: Date,
): CalendarEvent[] {
  return events.filter(
    (event) => isBefore(event.start, end) && isAfter(event.end, start),
  );
}

// ─── Navigation Helpers ───────────────────────────────────────────────────────

/**
 * Navigates forward or backward by one period based on the current view.
 */
export function navigateDate(
  date: Date,
  view: CalendarViewType,
  direction: "forward" | "back",
  numberOfDays?: number,
): Date {
  const fn = direction === "forward" ? 1 : -1;

  switch (view) {
    case "day":
      return addDays(date, fn);
    case "week":
      return addWeeks(date, fn);
    case "month":
      return addMonths(date, fn);
    case "year":
      return addYears(date, fn);
    case "multiDay":
      return addDays(date, fn * (numberOfDays || 3));
    case "agenda":
      return addDays(date, fn * 30);
    case "schedule":
      return addDays(date, fn);
    default:
      return addWeeks(date, fn);
  }
}

/**
 * Returns a human-readable title for the current view and date.
 */
export function getViewTitle(
  date: Date,
  view: CalendarViewType,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = DEFAULT_WEEK_STARTS_ON,
  numberOfDays?: number,
): string {
  switch (view) {
    case "day":
      return format(date, DATE_FORMAT_FULL);
    case "week": {
      const weekDays = getWeekDays(date, weekStartsOn);
      const first = weekDays[0];
      const last = weekDays[6];
      if (isSameMonth(first, last)) {
        return `${format(first, "MMM d")} – ${format(last, "d, yyyy")}`;
      }
      return `${format(first, "MMM d")} – ${format(last, "MMM d, yyyy")}`;
    }
    case "month":
      return format(date, MONTH_YEAR_FORMAT);
    case "year":
      return format(date, "yyyy");
    case "multiDay": {
      const days = getMultiDayRange(date, numberOfDays || 3);
      const firstDay = days[0];
      const lastDay = days[days.length - 1];
      if (isSameMonth(firstDay, lastDay)) {
        return `${format(firstDay, "MMM d")} – ${format(lastDay, "d, yyyy")}`;
      }
      return `${format(firstDay, "MMM d")} – ${format(lastDay, "MMM d, yyyy")}`;
    }
    case "agenda":
      return format(date, MONTH_YEAR_FORMAT);
    case "schedule":
      return format(date, DATE_FORMAT_FULL);
    default:
      return format(date, MONTH_YEAR_FORMAT);
  }
}

// ─── Time Helpers ─────────────────────────────────────────────────────────────

/**
 * Converts a time (hours + minutes) to a fractional hour value.
 * E.g., 9:30 => 9.5
 */
export function timeToFraction(date: Date): number {
  return getHours(date) + getMinutes(date) / 60;
}

/**
 * Calculates the top position (in px) for a given time within a time grid.
 */
export function timeToPosition(
  date: Date,
  startHour: number,
  hourHeight: number,
): number {
  const fraction = timeToFraction(date);
  return (fraction - startHour) * hourHeight;
}

/**
 * Calculates the height (in px) for an event in a time grid.
 */
export function durationToHeight(
  start: Date,
  end: Date,
  hourHeight: number,
): number {
  const minutes = differenceInMinutes(end, start);
  return (minutes / 60) * hourHeight;
}

/**
 * Checks if a given hour falls within working hours.
 */
export function isWorkingHour(
  hour: number,
  workingStart: number = 8,
  workingEnd: number = 18,
): boolean {
  return hour >= workingStart && hour < workingEnd;
}
