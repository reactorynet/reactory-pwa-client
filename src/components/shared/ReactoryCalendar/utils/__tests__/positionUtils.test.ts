import {
  layoutEventsForDay,
  calculateEventStyle,
  layoutEventsForWeekRow,
  layoutEventsForMonth,
} from "../positionUtils";
import { getMonthGrid } from "../dateUtils";
import { CalendarEvent } from "../../types";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function makeEvent(
  id: string,
  start: Date,
  end: Date,
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id,
    calendarId: "cal-1",
    title: `Event ${id}`,
    start,
    end,
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
    ...overrides,
  };
}

describe("layoutEventsForDay", () => {
  it("returns empty for no events", () => {
    expect(layoutEventsForDay([])).toEqual([]);
  });

  it("places non-overlapping events in single column", () => {
    const events = [
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
      makeEvent("2", d(2026, 4, 10, 11), d(2026, 4, 10, 12)),
    ];
    const result = layoutEventsForDay(events);
    expect(result).toHaveLength(2);
    // Each event in its own cluster, so totalColumns = 1
    result.forEach((r) => {
      expect(r.column).toBe(0);
      expect(r.totalColumns).toBe(1);
    });
  });

  it("assigns multiple columns for overlapping events", () => {
    const events = [
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 11)),
      makeEvent("2", d(2026, 4, 10, 9, 30), d(2026, 4, 10, 10, 30)),
      makeEvent("3", d(2026, 4, 10, 10), d(2026, 4, 10, 12)),
    ];
    const result = layoutEventsForDay(events);
    expect(result).toHaveLength(3);

    // All three overlap, so they should share columns
    const totalCols = result[0].totalColumns;
    expect(totalCols).toBeGreaterThanOrEqual(2);

    // Events should have different columns
    const columns = new Set(result.map((r) => r.column));
    expect(columns.size).toBeGreaterThanOrEqual(2);
  });

  it("separates non-overlapping clusters", () => {
    const events = [
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
      makeEvent("2", d(2026, 4, 10, 9, 30), d(2026, 4, 10, 10, 30)),
      makeEvent("3", d(2026, 4, 10, 14), d(2026, 4, 10, 15)),
    ];
    const result = layoutEventsForDay(events);
    expect(result).toHaveLength(3);

    // Event 3 should be in its own cluster with 1 column
    const event3 = result.find((r) => r.event.id === "3");
    expect(event3?.totalColumns).toBe(1);
    expect(event3?.column).toBe(0);
  });
});

describe("calculateEventStyle", () => {
  it("calculates correct top position", () => {
    const positioned = {
      event: makeEvent("1", d(2026, 4, 10, 10), d(2026, 4, 10, 11)),
      column: 0,
      totalColumns: 1,
    };
    const style = calculateEventStyle(positioned, 1440, 0, 24, 60);
    expect(style.top).toBe("600px"); // 10 hours * 60px/hour
  });

  it("calculates correct height for 1-hour event", () => {
    const positioned = {
      event: makeEvent("1", d(2026, 4, 10, 10), d(2026, 4, 10, 11)),
      column: 0,
      totalColumns: 1,
    };
    const style = calculateEventStyle(positioned, 1440, 0, 24, 60);
    expect(style.height).toBe("60px");
  });

  it("respects column width for parallel events", () => {
    const positioned = {
      event: makeEvent("1", d(2026, 4, 10, 10), d(2026, 4, 10, 11)),
      column: 1,
      totalColumns: 3,
    };
    const style = calculateEventStyle(positioned, 1440, 0, 24, 60);
    expect(style.left).toBe(`${(100 / 3)}%`);
  });

  it("enforces minimum height", () => {
    // 5-minute event
    const positioned = {
      event: makeEvent("1", d(2026, 4, 10, 10), d(2026, 4, 10, 10, 5)),
      column: 0,
      totalColumns: 1,
    };
    const style = calculateEventStyle(positioned, 1440, 0, 24, 60);
    expect(style.height).toBe("20px"); // min height
  });
});

describe("layoutEventsForWeekRow", () => {
  it("returns empty for no events", () => {
    const weekDates = Array.from({ length: 7 }, (_, i) => d(2026, 4, 6 + i));
    expect(layoutEventsForWeekRow([], weekDates)).toEqual([]);
  });

  it("places a single-day event with span 1", () => {
    const weekDates = Array.from({ length: 7 }, (_, i) => d(2026, 4, 6 + i)); // Mon-Sun
    const events = [
      makeEvent("1", d(2026, 4, 8, 9), d(2026, 4, 8, 10)),
    ];
    const result = layoutEventsForWeekRow(events, weekDates);
    expect(result).toHaveLength(1);
    expect(result[0].startCol).toBe(2); // Wednesday
    expect(result[0].span).toBe(1);
    expect(result[0].row).toBe(0);
  });

  it("places multi-day event with correct span", () => {
    const weekDates = Array.from({ length: 7 }, (_, i) => d(2026, 4, 6 + i)); // Mon-Sun
    const events = [
      makeEvent("1", d(2026, 4, 7, 9), d(2026, 4, 10, 17)),
    ];
    const result = layoutEventsForWeekRow(events, weekDates);
    expect(result).toHaveLength(1);
    expect(result[0].startCol).toBe(1); // Tuesday
    expect(result[0].span).toBe(4); // Tue-Fri
  });

  it("assigns different rows to overlapping events", () => {
    const weekDates = Array.from({ length: 7 }, (_, i) => d(2026, 4, 6 + i));
    const events = [
      makeEvent("1", d(2026, 4, 7), d(2026, 4, 9, 23, 59)),
      makeEvent("2", d(2026, 4, 8), d(2026, 4, 10, 23, 59)),
    ];
    const result = layoutEventsForWeekRow(events, weekDates);
    expect(result).toHaveLength(2);
    expect(result[0].row).toBe(0);
    expect(result[1].row).toBe(1);
  });
});

describe("layoutEventsForMonth", () => {
  it("produces layout for a full month", () => {
    const grid = getMonthGrid(d(2026, 4, 1), 1);
    const events = [
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
      makeEvent("2", d(2026, 4, 15, 14), d(2026, 4, 18, 15)),
    ];
    const layout = layoutEventsForMonth(events, grid);
    expect(layout.rows).toHaveLength(6); // 6 week rows
    // At least one row should have events
    const hasEvents = layout.rows.some((row) => row.length > 0);
    expect(hasEvents).toBe(true);
  });
});
