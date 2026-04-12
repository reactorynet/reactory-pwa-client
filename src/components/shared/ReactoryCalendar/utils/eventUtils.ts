import { isBefore, isAfter, isSameDay, format } from "date-fns";
import { CalendarEvent, CalendarSource } from "../types";
import { DEFAULT_EVENT_COLOR } from "../constants";

// ─── Filtering ────────────────────────────────────────────────────────────────

/**
 * Filters events to only those belonging to visible calendars.
 */
export function filterEventsByCalendar(
  events: CalendarEvent[],
  calendars: CalendarSource[],
): CalendarEvent[] {
  const visibleIds = new Set(
    calendars.filter((c) => c.visible).map((c) => c.id),
  );
  return events.filter((e) => visibleIds.has(e.calendarId));
}

/**
 * Filters events that overlap with the given date range.
 * An event overlaps if it starts before the range ends AND ends after the range starts.
 */
export function filterEventsByDateRange(
  events: CalendarEvent[],
  start: Date,
  end: Date,
): CalendarEvent[] {
  return events.filter(
    (e) => isBefore(e.start, end) && isAfter(e.end, start),
  );
}

/**
 * Filters events occurring on a specific day.
 */
export function filterEventsByDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events.filter((e) => {
    if (e.isAllDay) {
      // All-day events span the full day, check overlap
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      return isBefore(e.start, dayEnd) && isAfter(e.end, dayStart);
    }
    return isSameDay(e.start, day) || isSameDay(e.end, day);
  });
}

/**
 * Returns all-day events from a list.
 */
export function getAllDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => e.isAllDay);
}

/**
 * Returns timed (non-all-day) events from a list.
 */
export function getTimedEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => !e.isAllDay);
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

/**
 * Sorts events by start time ascending, then by duration descending
 * (longer events first for better visual layout).
 */
export function sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    // Longer events first
    const durationA = a.end.getTime() - a.start.getTime();
    const durationB = b.end.getTime() - b.start.getTime();
    return durationB - durationA;
  });
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

/**
 * Groups events by their start date (YYYY-MM-DD key).
 * Multi-day events appear under each day they span.
 */
export function groupEventsByDate(
  events: CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const startDay = new Date(event.start);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(event.end);
    endDay.setHours(0, 0, 0, 0);

    let current = new Date(startDay);
    while (current <= endDay) {
      const key = format(current, "yyyy-MM-dd");
      const group = groups.get(key);
      if (group) {
        group.push(event);
      } else {
        groups.set(key, [event]);
      }
      current = new Date(current.getTime() + 86400000);
    }
  }

  return groups;
}

/**
 * Groups events by their calendarId.
 */
export function groupEventsByCalendar(
  events: CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const group = groups.get(event.calendarId);
    if (group) {
      group.push(event);
    } else {
      groups.set(event.calendarId, [event]);
    }
  }

  return groups;
}

// ─── Color Resolution ─────────────────────────────────────────────────────────

/**
 * Resolves the display color for an event.
 * Priority: event.color > calendar.color > default.
 */
export function getEventColor(
  event: CalendarEvent,
  calendars?: CalendarSource[],
): string {
  if (event.color) return event.color;

  if (calendars) {
    const calendar = calendars.find((c) => c.id === event.calendarId);
    if (calendar) return calendar.color;
  }

  return DEFAULT_EVENT_COLOR;
}

// ─── Multi-day Detection ──────────────────────────────────────────────────────

/**
 * Checks if an event spans multiple days.
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  return !isSameDay(event.start, event.end);
}

/**
 * Returns the number of days an event spans.
 */
export function getEventDaySpan(event: CalendarEvent): number {
  const startDay = new Date(event.start);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(event.end);
  endDay.setHours(0, 0, 0, 0);
  return Math.ceil((endDay.getTime() - startDay.getTime()) / 86400000) + 1;
}

// ─── Event Status Helpers ─────────────────────────────────────────────────────

/**
 * Returns events that are not cancelled.
 */
export function getActiveEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => e.status !== "cancelled");
}

/**
 * Counts events per day within a date range.
 * Returns a Map of "YYYY-MM-DD" => count for use in mini calendars / heatmaps.
 */
export function countEventsByDay(
  events: CalendarEvent[],
): Map<string, number> {
  const counts = new Map<string, number>();
  const grouped = groupEventsByDate(events);

  for (const [key, dayEvents] of grouped) {
    counts.set(key, dayEvents.length);
  }

  return counts;
}
