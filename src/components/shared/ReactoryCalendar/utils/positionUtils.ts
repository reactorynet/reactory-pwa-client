import { isSameDay, differenceInMinutes, startOfDay, isBefore } from "date-fns";
import { CalendarEvent, PositionedEvent, MonthEventRow, MonthEventLayout } from "../types";
import { HOUR_HEIGHT } from "../constants";
import { sortEventsByTime } from "./eventUtils";

// ─── Day Column Layout (Week/Day Views) ──────────────────────────────────────

/**
 * Assigns column positions to overlapping events within a single day.
 * Uses a greedy algorithm: events sorted by start time are placed in
 * the first available column. Overlapping events share columns.
 *
 * Returns PositionedEvent[] with column index and total column count
 * for each group of overlapping events.
 */
export function layoutEventsForDay(
  events: CalendarEvent[],
): PositionedEvent[] {
  if (events.length === 0) return [];

  const sorted = sortEventsByTime(events);
  const columns: CalendarEvent[][] = [];
  const eventColumnMap = new Map<string, number>();

  // Group into overlapping clusters, then assign columns per cluster
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let clusterEnd: Date | null = null;

  for (const event of sorted) {
    if (clusterEnd === null || !isBefore(event.start, clusterEnd)) {
      // Start a new cluster
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }
      currentCluster = [event];
      clusterEnd = event.end;
    } else {
      currentCluster.push(event);
      if (event.end > clusterEnd) {
        clusterEnd = event.end;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedEvent[] = [];

  for (const cluster of clusters) {
    const clusterColumns: CalendarEvent[][] = [];

    for (const event of cluster) {
      let placed = false;
      for (let col = 0; col < clusterColumns.length; col++) {
        const lastInCol = clusterColumns[col][clusterColumns[col].length - 1];
        if (!isBefore(event.start, lastInCol.end)) {
          clusterColumns[col].push(event);
          eventColumnMap.set(event.id, col);
          placed = true;
          break;
        }
      }
      if (!placed) {
        clusterColumns.push([event]);
        eventColumnMap.set(event.id, clusterColumns.length - 1);
      }
    }

    const totalColumns = clusterColumns.length;
    for (const event of cluster) {
      result.push({
        event,
        column: eventColumnMap.get(event.id)!,
        totalColumns,
      });
    }
  }

  return result;
}

// ─── CSS Style Calculation (Week/Day Views) ──────────────────────────────────

/**
 * Calculates CSS properties for positioning an event in a time-based view.
 */
export function calculateEventStyle(
  positioned: PositionedEvent,
  containerHeight: number,
  startHour: number,
  endHour: number,
  hourHeight: number = HOUR_HEIGHT,
): React.CSSProperties {
  const totalMinutes = (endHour - startHour) * 60;
  const eventStart = positioned.event.start;
  const eventEnd = positioned.event.end;

  const startMinutes =
    (eventStart.getHours() - startHour) * 60 + eventStart.getMinutes();
  const endMinutes =
    (eventEnd.getHours() - startHour) * 60 + eventEnd.getMinutes();

  const top = (startMinutes / 60) * hourHeight;
  const height = Math.max(((endMinutes - startMinutes) / 60) * hourHeight, 20); // Min 20px

  const columnWidth = 100 / positioned.totalColumns;
  const left = positioned.column * columnWidth;
  const width = columnWidth;

  return {
    position: "absolute" as const,
    top: `${top}px`,
    height: `${height}px`,
    left: `${left}%`,
    width: `calc(${width}% - 2px)`, // 2px gap between columns
    zIndex: 1,
  };
}

// ─── Month View Layout ───────────────────────────────────────────────────────

/**
 * Computes multi-day event layout for a month view grid row (one week).
 * Each event is assigned a visual row, a starting column, and a span (number of days).
 *
 * @param events - Sorted events that overlap with this week
 * @param weekDates - Array of 7 dates for this week row
 * @returns Array of MonthEventRow assignments
 */
export function layoutEventsForWeekRow(
  events: CalendarEvent[],
  weekDates: Date[],
): MonthEventRow[] {
  if (events.length === 0 || weekDates.length === 0) return [];

  const weekStart = startOfDay(weekDates[0]);
  const weekEnd = new Date(weekDates[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const rows: MonthEventRow[] = [];
  const rowEndTracker: Date[] = []; // tracks where each visual row ends

  const sorted = sortEventsByTime(events);

  for (const event of sorted) {
    // Clamp event to this week's boundaries
    const clampedStart = isBefore(event.start, weekStart)
      ? weekStart
      : startOfDay(event.start);
    const clampedEnd = event.end > weekEnd ? weekEnd : event.end;

    // Calculate start column and span
    const startCol = weekDates.findIndex((d) => isSameDay(d, clampedStart));
    const endCol = weekDates.findIndex((d) => isSameDay(d, startOfDay(clampedEnd)));

    if (startCol === -1) continue;

    const effectiveEndCol = endCol === -1 ? 6 : endCol;
    const span = effectiveEndCol - startCol + 1;

    // Find the first available visual row
    let rowIndex = 0;
    while (rowIndex < rowEndTracker.length) {
      if (!isBefore(clampedStart, rowEndTracker[rowIndex])) {
        break;
      }
      rowIndex++;
    }

    rowEndTracker[rowIndex] = clampedEnd;

    rows.push({
      event,
      startCol,
      span,
      row: rowIndex,
    });
  }

  return rows;
}

/**
 * Computes the full month layout for all weeks.
 *
 * @param events - All events for the visible month range
 * @param monthGrid - 2D array from getMonthGrid()
 * @returns MonthEventLayout with rows per week
 */
export function layoutEventsForMonth(
  events: CalendarEvent[],
  monthGrid: Date[][],
): MonthEventLayout {
  const sorted = sortEventsByTime(events);
  const weekRows: MonthEventRow[][] = [];

  for (const weekDates of monthGrid) {
    const weekStart = startOfDay(weekDates[0]);
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);

    // Filter events that overlap with this week
    const weekEvents = sorted.filter(
      (e) => isBefore(e.start, weekEnd) && e.end > weekStart,
    );

    weekRows.push(layoutEventsForWeekRow(weekEvents, weekDates));
  }

  return { rows: weekRows };
}
