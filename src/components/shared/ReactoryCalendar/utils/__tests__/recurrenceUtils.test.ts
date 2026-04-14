import { expandRecurrence, isException } from "../recurrenceUtils";
import { CalendarEvent, RecurrencePattern } from "../../types";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function makeRecurringEvent(
  id: string,
  start: Date,
  end: Date,
  recurrence: RecurrencePattern,
): CalendarEvent {
  return {
    id,
    calendarId: "cal-1",
    title: `Recurring ${id}`,
    start,
    end,
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
    recurrence,
  };
}

describe("isException", () => {
  it("returns false for empty exceptions", () => {
    expect(isException(d(2026, 4, 10), [])).toBe(false);
    expect(isException(d(2026, 4, 10), undefined)).toBe(false);
  });

  it("returns true when date is in exceptions", () => {
    expect(isException(d(2026, 4, 10), [d(2026, 4, 10)])).toBe(true);
  });

  it("returns false when date is not in exceptions", () => {
    expect(isException(d(2026, 4, 11), [d(2026, 4, 10)])).toBe(false);
  });
});

describe("expandRecurrence - daily", () => {
  it("expands daily event for a week range", () => {
    const event = makeRecurringEvent(
      "daily",
      d(2026, 4, 1, 9),
      d(2026, 4, 1, 10),
      { frequency: "daily", interval: 1 },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 7, 23, 59));
    expect(result).toHaveLength(7);
    expect(result[0].start.getDate()).toBe(1);
    expect(result[6].start.getDate()).toBe(7);
  });

  it("respects interval", () => {
    const event = makeRecurringEvent(
      "every2days",
      d(2026, 4, 1, 9),
      d(2026, 4, 1, 10),
      { frequency: "daily", interval: 2 },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 10, 23, 59));
    expect(result).toHaveLength(5); // 1, 3, 5, 7, 9
    expect(result[0].start.getDate()).toBe(1);
    expect(result[1].start.getDate()).toBe(3);
  });

  it("respects count limit", () => {
    const event = makeRecurringEvent(
      "limited",
      d(2026, 4, 1, 9),
      d(2026, 4, 1, 10),
      { frequency: "daily", interval: 1, count: 3 },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 30, 23, 59));
    expect(result).toHaveLength(3);
  });

  it("respects endDate", () => {
    const event = makeRecurringEvent(
      "endDate",
      d(2026, 4, 1, 9),
      d(2026, 4, 1, 10),
      { frequency: "daily", interval: 1, endDate: d(2026, 4, 5) },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 30, 23, 59));
    expect(result).toHaveLength(5);
    expect(result[4].start.getDate()).toBe(5);
  });

  it("excludes exception dates", () => {
    const event = makeRecurringEvent(
      "exceptions",
      d(2026, 4, 1, 9),
      d(2026, 4, 1, 10),
      {
        frequency: "daily",
        interval: 1,
        exceptions: [d(2026, 4, 3), d(2026, 4, 5)],
      },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 7, 23, 59));
    expect(result).toHaveLength(5); // 7 days - 2 exceptions
    const dates = result.map((e) => e.start.getDate());
    expect(dates).not.toContain(3);
    expect(dates).not.toContain(5);
  });
});

describe("expandRecurrence - weekly", () => {
  it("expands simple weekly event", () => {
    const event = makeRecurringEvent(
      "weekly",
      d(2026, 4, 6, 10), // Monday
      d(2026, 4, 6, 11),
      { frequency: "weekly", interval: 1 },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 30, 23, 59));
    // Mondays in April 2026: 6, 13, 20, 27
    expect(result).toHaveLength(4);
  });

  it("expands weekly with byDay (MWF)", () => {
    const event = makeRecurringEvent(
      "mwf",
      d(2026, 4, 6, 10), // Monday
      d(2026, 4, 6, 11),
      { frequency: "weekly", interval: 1, byDay: ["MO", "WE", "FR"] },
    );
    const result = expandRecurrence(event, d(2026, 4, 6), d(2026, 4, 12, 23, 59));
    // MO=6, WE=8, FR=10
    expect(result).toHaveLength(3);
    expect(result[0].start.getDate()).toBe(6);
    expect(result[1].start.getDate()).toBe(8);
    expect(result[2].start.getDate()).toBe(10);
  });
});

describe("expandRecurrence - monthly", () => {
  it("expands monthly event", () => {
    const event = makeRecurringEvent(
      "monthly",
      d(2026, 1, 15, 14),
      d(2026, 1, 15, 15),
      { frequency: "monthly", interval: 1 },
    );
    const result = expandRecurrence(event, d(2026, 1, 1), d(2026, 6, 30, 23, 59));
    // Jan 15, Feb 15, Mar 15, Apr 15, May 15, Jun 15
    expect(result).toHaveLength(6);
  });
});

describe("expandRecurrence - non-recurring", () => {
  it("returns original event when no recurrence", () => {
    const event: CalendarEvent = {
      id: "single",
      calendarId: "cal-1",
      title: "Single",
      start: d(2026, 4, 10, 9),
      end: d(2026, 4, 10, 10),
      isAllDay: false,
      status: "confirmed",
      priority: "normal",
    };
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 30));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("single");
  });
});

describe("expandRecurrence - instance properties", () => {
  it("generates unique IDs for each instance", () => {
    const event = makeRecurringEvent(
      "base",
      d(2026, 4, 1, 9),
      d(2026, 4, 1, 10),
      { frequency: "daily", interval: 1 },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 3, 23, 59));
    const ids = result.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preserves event duration for each instance", () => {
    const event = makeRecurringEvent(
      "base",
      d(2026, 4, 1, 9),
      d(2026, 4, 1, 10, 30), // 90 min
      { frequency: "daily", interval: 1 },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 3, 23, 59));
    for (const instance of result) {
      const duration = instance.end.getTime() - instance.start.getTime();
      expect(duration).toBe(90 * 60 * 1000);
    }
  });

  it("removes recurrence from instances", () => {
    const event = makeRecurringEvent(
      "base",
      d(2026, 4, 1, 9),
      d(2026, 4, 1, 10),
      { frequency: "daily", interval: 1 },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 3, 23, 59));
    for (const instance of result) {
      expect(instance.recurrence).toBeUndefined();
    }
  });

  it("adds metadata about base event", () => {
    const event = makeRecurringEvent(
      "base",
      d(2026, 4, 1, 9),
      d(2026, 4, 1, 10),
      { frequency: "daily", interval: 1 },
    );
    const result = expandRecurrence(event, d(2026, 4, 1), d(2026, 4, 2, 23, 59));
    for (const instance of result) {
      expect(instance.metadata?._isRecurrenceInstance).toBe(true);
      expect(instance.metadata?._baseEventId).toBe("base");
    }
  });
});
