import {
  filterEventsByCalendar,
  filterEventsByDateRange,
  filterEventsByDay,
  getAllDayEvents,
  getTimedEvents,
  sortEventsByTime,
  groupEventsByDate,
  groupEventsByCalendar,
  getEventColor,
  isMultiDayEvent,
  getEventDaySpan,
  getActiveEvents,
  countEventsByDay,
} from "../eventUtils";
import { CalendarEvent, CalendarSource } from "../../types";

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

const calendars: CalendarSource[] = [
  { id: "cal-1", name: "Work", color: "#1976d2", visible: true },
  { id: "cal-2", name: "Personal", color: "#388e3c", visible: true },
  { id: "cal-3", name: "Hidden", color: "#d32f2f", visible: false },
];

describe("filterEventsByCalendar", () => {
  const events = [
    makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10), { calendarId: "cal-1" }),
    makeEvent("2", d(2026, 4, 10, 11), d(2026, 4, 10, 12), { calendarId: "cal-2" }),
    makeEvent("3", d(2026, 4, 10, 14), d(2026, 4, 10, 15), { calendarId: "cal-3" }),
  ];

  it("excludes events from hidden calendars", () => {
    const result = filterEventsByCalendar(events, calendars);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("returns empty when all calendars hidden", () => {
    const hidden = calendars.map((c) => ({ ...c, visible: false }));
    const result = filterEventsByCalendar(events, hidden);
    expect(result).toHaveLength(0);
  });
});

describe("filterEventsByDateRange", () => {
  const events = [
    makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
    makeEvent("2", d(2026, 4, 12, 14), d(2026, 4, 12, 15)),
    makeEvent("3", d(2026, 4, 15, 9), d(2026, 4, 15, 10)),
  ];

  it("returns events within range", () => {
    const result = filterEventsByDateRange(events, d(2026, 4, 10), d(2026, 4, 13));
    expect(result).toHaveLength(2);
  });

  it("includes events starting at range boundary", () => {
    const result = filterEventsByDateRange(events, d(2026, 4, 15, 9), d(2026, 4, 16));
    expect(result).toHaveLength(1);
  });
});

describe("filterEventsByDay", () => {
  const events = [
    makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
    makeEvent("2", d(2026, 4, 10, 14), d(2026, 4, 10, 15)),
    makeEvent("3", d(2026, 4, 11, 9), d(2026, 4, 11, 10)),
    makeEvent("allday", d(2026, 4, 10, 0), d(2026, 4, 12, 23, 59), { isAllDay: true }),
  ];

  it("returns events on the given day", () => {
    const result = filterEventsByDay(events, d(2026, 4, 10));
    expect(result).toHaveLength(3); // events 1, 2, and allday
  });

  it("all-day events appear on intermediate days", () => {
    const result = filterEventsByDay(events, d(2026, 4, 11));
    expect(result.map((e) => e.id)).toContain("allday");
  });
});

describe("getAllDayEvents / getTimedEvents", () => {
  const events = [
    makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
    makeEvent("2", d(2026, 4, 10), d(2026, 4, 10, 23, 59), { isAllDay: true }),
  ];

  it("separates all-day from timed events", () => {
    expect(getAllDayEvents(events)).toHaveLength(1);
    expect(getTimedEvents(events)).toHaveLength(1);
  });
});

describe("sortEventsByTime", () => {
  it("sorts by start time ascending", () => {
    const events = [
      makeEvent("2", d(2026, 4, 10, 14), d(2026, 4, 10, 15)),
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
    ];
    const sorted = sortEventsByTime(events);
    expect(sorted[0].id).toBe("1");
    expect(sorted[1].id).toBe("2");
  });

  it("longer events come first when same start time", () => {
    const events = [
      makeEvent("short", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
      makeEvent("long", d(2026, 4, 10, 9), d(2026, 4, 10, 12)),
    ];
    const sorted = sortEventsByTime(events);
    expect(sorted[0].id).toBe("long");
  });

  it("does not mutate original array", () => {
    const events = [
      makeEvent("2", d(2026, 4, 10, 14), d(2026, 4, 10, 15)),
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
    ];
    sortEventsByTime(events);
    expect(events[0].id).toBe("2");
  });
});

describe("groupEventsByDate", () => {
  it("groups events by their date key", () => {
    const events = [
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
      makeEvent("2", d(2026, 4, 10, 14), d(2026, 4, 10, 15)),
      makeEvent("3", d(2026, 4, 11, 9), d(2026, 4, 11, 10)),
    ];
    const groups = groupEventsByDate(events);
    expect(groups.get("2026-04-10")).toHaveLength(2);
    expect(groups.get("2026-04-11")).toHaveLength(1);
  });

  it("multi-day events appear under each date", () => {
    const events = [
      makeEvent("multi", d(2026, 4, 10, 9), d(2026, 4, 12, 10)),
    ];
    const groups = groupEventsByDate(events);
    expect(groups.get("2026-04-10")).toHaveLength(1);
    expect(groups.get("2026-04-11")).toHaveLength(1);
    expect(groups.get("2026-04-12")).toHaveLength(1);
  });
});

describe("groupEventsByCalendar", () => {
  it("groups events by calendarId", () => {
    const events = [
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10), { calendarId: "cal-1" }),
      makeEvent("2", d(2026, 4, 10, 11), d(2026, 4, 10, 12), { calendarId: "cal-2" }),
      makeEvent("3", d(2026, 4, 10, 14), d(2026, 4, 10, 15), { calendarId: "cal-1" }),
    ];
    const groups = groupEventsByCalendar(events);
    expect(groups.get("cal-1")).toHaveLength(2);
    expect(groups.get("cal-2")).toHaveLength(1);
  });
});

describe("getEventColor", () => {
  it("uses event color when set", () => {
    const event = makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10), { color: "#ff0000" });
    expect(getEventColor(event, calendars)).toBe("#ff0000");
  });

  it("falls back to calendar color", () => {
    const event = makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10), { calendarId: "cal-2" });
    expect(getEventColor(event, calendars)).toBe("#388e3c");
  });

  it("falls back to default color", () => {
    const event = makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10), { calendarId: "unknown" });
    expect(getEventColor(event, calendars)).toBe("#1976d2"); // DEFAULT_EVENT_COLOR
  });
});

describe("isMultiDayEvent", () => {
  it("returns false for same-day event", () => {
    const event = makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10));
    expect(isMultiDayEvent(event)).toBe(false);
  });

  it("returns true for multi-day event", () => {
    const event = makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 12, 10));
    expect(isMultiDayEvent(event)).toBe(true);
  });
});

describe("getEventDaySpan", () => {
  it("returns 1 for same-day event", () => {
    const event = makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 17));
    expect(getEventDaySpan(event)).toBe(1);
  });

  it("returns 3 for event spanning 3 days", () => {
    const event = makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 12, 17));
    expect(getEventDaySpan(event)).toBe(3);
  });
});

describe("getActiveEvents", () => {
  it("filters out cancelled events", () => {
    const events = [
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
      makeEvent("2", d(2026, 4, 10, 11), d(2026, 4, 10, 12), { status: "cancelled" }),
    ];
    expect(getActiveEvents(events)).toHaveLength(1);
  });
});

describe("countEventsByDay", () => {
  it("counts events per day key", () => {
    const events = [
      makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
      makeEvent("2", d(2026, 4, 10, 14), d(2026, 4, 10, 15)),
      makeEvent("3", d(2026, 4, 11, 9), d(2026, 4, 11, 10)),
    ];
    const counts = countEventsByDay(events);
    expect(counts.get("2026-04-10")).toBe(2);
    expect(counts.get("2026-04-11")).toBe(1);
  });
});
