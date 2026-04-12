import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
  getDay,
  setDate,
  getDate,
} from "date-fns";
import { CalendarEvent, RecurrencePattern } from "../types";
import { DAY_ABBREVIATIONS } from "../constants";

// ─── Day Index Mapping ────────────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

// ─── Recurrence Expansion ─────────────────────────────────────────────────────

/**
 * Expands a recurring event into individual CalendarEvent instances
 * within the given date range.
 *
 * Each generated instance has a unique ID derived from the base event ID
 * and the occurrence index.
 *
 * @param event - The base event with a recurrence pattern
 * @param rangeStart - Start of the range to generate instances for
 * @param rangeEnd - End of the range to generate instances for
 * @returns Array of CalendarEvent instances (including the original if it falls in range)
 */
export function expandRecurrence(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  if (!event.recurrence) return [event];

  const { recurrence } = event;
  const results: CalendarEvent[] = [];
  const eventDuration = event.end.getTime() - event.start.getTime();

  let current = new Date(event.start);
  let count = 0;
  const maxIterations = 1000; // Safety limit
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    // Check end conditions (endDate is inclusive — compare by day, not time)
    if (recurrence.endDate && isAfter(startOfDay(current), startOfDay(recurrence.endDate))) break;
    if (recurrence.count !== undefined && count >= recurrence.count) break;
    if (isAfter(current, rangeEnd)) break;

    const instanceEnd = new Date(current.getTime() + eventDuration);

    // Check if this occurrence is within range and not an exception
    if (
      !isBefore(instanceEnd, rangeStart) &&
      !isAfter(current, rangeEnd) &&
      !isException(current, recurrence.exceptions)
    ) {
      // Apply byDay filter for weekly recurrence
      if (
        recurrence.frequency === "weekly" &&
        recurrence.byDay &&
        recurrence.byDay.length > 0
      ) {
        const dayAbbr = DAY_ABBREVIATIONS[getDay(current)];
        if (recurrence.byDay.includes(dayAbbr)) {
          results.push(createInstance(event, current, instanceEnd, count));
          count++;
        }
      }
      // Apply byMonthDay filter for monthly recurrence
      else if (
        recurrence.frequency === "monthly" &&
        recurrence.byMonthDay &&
        recurrence.byMonthDay.length > 0
      ) {
        if (recurrence.byMonthDay.includes(getDate(current))) {
          results.push(createInstance(event, current, instanceEnd, count));
          count++;
        }
      }
      // Apply byMonth filter for yearly recurrence
      else if (
        recurrence.frequency === "yearly" &&
        recurrence.byMonth &&
        recurrence.byMonth.length > 0
      ) {
        if (recurrence.byMonth.includes(current.getMonth() + 1)) {
          results.push(createInstance(event, current, instanceEnd, count));
          count++;
        }
      } else {
        results.push(createInstance(event, current, instanceEnd, count));
        count++;
      }
    }

    // Advance to next occurrence
    current = getNextOccurrence(current, recurrence);

    // If getNextOccurrence didn't advance (shouldn't happen), break
    if (current.getTime() <= new Date(event.start).getTime() && count === 0) {
      // First iteration may not advance for byDay patterns; skip ahead
    }
  }

  return results;
}

/**
 * Checks if a date is in the exceptions list.
 */
export function isException(
  date: Date,
  exceptions?: Date[],
): boolean {
  if (!exceptions || exceptions.length === 0) return false;
  return exceptions.some((exc) => isSameDay(date, exc));
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function createInstance(
  baseEvent: CalendarEvent,
  start: Date,
  end: Date,
  index: number,
): CalendarEvent {
  return {
    ...baseEvent,
    id: `${baseEvent.id}_r${index}`,
    start: new Date(start),
    end: new Date(end),
    // Remove recurrence from instances to prevent recursive expansion
    recurrence: undefined,
    metadata: {
      ...baseEvent.metadata,
      _isRecurrenceInstance: true,
      _baseEventId: baseEvent.id,
      _instanceIndex: index,
    },
  };
}

function getNextOccurrence(
  current: Date,
  recurrence: RecurrencePattern,
): Date {
  const { frequency, interval } = recurrence;

  // For weekly with byDay, advance day-by-day within the week
  if (
    frequency === "weekly" &&
    recurrence.byDay &&
    recurrence.byDay.length > 0
  ) {
    // Try next day; if we've passed all byDay entries this week, jump to next interval week
    let next = addDays(current, 1);
    const startDayOfWeek = getDay(current);

    // Check remaining days in this week
    for (let i = 1; i <= 6; i++) {
      const candidateDay = (startDayOfWeek + i) % 7;
      const candidateAbbr = DAY_ABBREVIATIONS[candidateDay];
      if (recurrence.byDay.includes(candidateAbbr)) {
        return addDays(current, i);
      }
    }

    // Jump to next interval week, first matching day
    const nextWeek = addWeeks(
      startOfDay(addDays(current, 7 - startDayOfWeek)),
      interval - 1,
    );
    for (let i = 0; i < 7; i++) {
      const candidate = addDays(nextWeek, i);
      const candidateAbbr = DAY_ABBREVIATIONS[getDay(candidate)];
      if (recurrence.byDay.includes(candidateAbbr)) {
        return setTimeFrom(candidate, current);
      }
    }

    return addWeeks(current, interval);
  }

  switch (frequency) {
    case "daily":
      return addDays(current, interval);
    case "weekly":
      return addWeeks(current, interval);
    case "monthly":
      return addMonths(current, interval);
    case "yearly":
      return addYears(current, interval);
    default:
      return addDays(current, interval);
  }
}

function setTimeFrom(target: Date, source: Date): Date {
  const result = new Date(target);
  result.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds(),
  );
  return result;
}
