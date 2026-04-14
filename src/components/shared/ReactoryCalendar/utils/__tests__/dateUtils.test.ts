import {
  getMonthGrid,
  getWeekDays,
  getMultiDayRange,
  getTimeSlots,
  snapToSlot,
  getDayRange,
  getWeekRange,
  getMonthRange,
  getVisibleRange,
  isDateInRange,
  getOverlappingEvents,
  navigateDate,
  getViewTitle,
  timeToFraction,
  timeToPosition,
  durationToHeight,
  isWorkingHour,
} from "../dateUtils";
import { CalendarEvent } from "../../types";

// Helper to create a date at a specific time
function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function makeEvent(id: string, start: Date, end: Date): CalendarEvent {
  return {
    id,
    calendarId: "cal-1",
    title: `Event ${id}`,
    start,
    end,
    isAllDay: false,
    status: "confirmed",
    priority: "normal",
  };
}

describe("getMonthGrid", () => {
  it("returns 6 rows of 7 days", () => {
    const grid = getMonthGrid(d(2026, 4, 1));
    expect(grid).toHaveLength(6);
    grid.forEach((row) => expect(row).toHaveLength(7));
  });

  it("first cell is start of week containing month start", () => {
    // April 2026 starts on a Wednesday (weekStartsOn=1 means Monday)
    const grid = getMonthGrid(d(2026, 4, 1), 1);
    // First cell should be Monday March 30
    expect(grid[0][0].getDate()).toBe(30);
    expect(grid[0][0].getMonth()).toBe(2); // March
  });

  it("respects weekStartsOn=0 (Sunday)", () => {
    const grid = getMonthGrid(d(2026, 4, 1), 0);
    expect(grid[0][0].getDay()).toBe(0); // Sunday
  });
});

describe("getWeekDays", () => {
  it("returns 7 consecutive days", () => {
    const days = getWeekDays(d(2026, 4, 8));
    expect(days).toHaveLength(7);
    for (let i = 1; i < days.length; i++) {
      expect(days[i].getTime() - days[i - 1].getTime()).toBe(86400000);
    }
  });

  it("first day is the configured weekStartsOn day", () => {
    const days = getWeekDays(d(2026, 4, 8), 1); // Monday
    expect(days[0].getDay()).toBe(1);
  });
});

describe("getMultiDayRange", () => {
  it("returns correct number of days", () => {
    const days = getMultiDayRange(d(2026, 4, 10), 5);
    expect(days).toHaveLength(5);
    expect(days[0].getDate()).toBe(10);
    expect(days[4].getDate()).toBe(14);
  });
});

describe("getTimeSlots", () => {
  it("generates 30-min slots for default range", () => {
    const slots = getTimeSlots(d(2026, 4, 10), 0, 24, 30);
    expect(slots).toHaveLength(48); // 24 hours * 2 slots/hour
  });

  it("generates 60-min slots for working hours", () => {
    const slots = getTimeSlots(d(2026, 4, 10), 8, 18, 60);
    expect(slots).toHaveLength(10);
    expect(slots[0].getHours()).toBe(8);
    expect(slots[9].getHours()).toBe(17);
  });

  it("generates 15-min slots", () => {
    const slots = getTimeSlots(d(2026, 4, 10), 9, 10, 15);
    expect(slots).toHaveLength(4);
  });
});

describe("snapToSlot", () => {
  it("snaps to nearest 30-min boundary", () => {
    const result = snapToSlot(d(2026, 4, 10, 9, 14), 30);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(0);
  });

  it("snaps forward past midpoint", () => {
    const result = snapToSlot(d(2026, 4, 10, 9, 16), 30);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });

  it("snaps to 15-min boundaries", () => {
    const result = snapToSlot(d(2026, 4, 10, 14, 38), 15);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(45);
  });
});

describe("getDayRange / getWeekRange / getMonthRange", () => {
  it("getDayRange spans a full day", () => {
    const range = getDayRange(d(2026, 4, 10, 14, 30));
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(range.start.getDate()).toBe(10);
    expect(range.end.getDate()).toBe(10);
  });

  it("getWeekRange spans 7 days", () => {
    const range = getWeekRange(d(2026, 4, 8), 1);
    expect(range.start.getDay()).toBe(1); // Monday
    expect(range.end.getDay()).toBe(0); // Sunday
  });

  it("getMonthRange spans the full month", () => {
    const range = getMonthRange(d(2026, 4, 15));
    expect(range.start.getDate()).toBe(1);
    expect(range.end.getDate()).toBe(30); // April has 30 days
  });
});

describe("getVisibleRange", () => {
  it("day view returns single day", () => {
    const range = getVisibleRange(d(2026, 4, 10), "day");
    expect(range.start.getDate()).toBe(10);
    expect(range.end.getDate()).toBe(10);
  });

  it("year view spans Jan 1 to Dec 31", () => {
    const range = getVisibleRange(d(2026, 6, 15), "year");
    expect(range.start.getMonth()).toBe(0);
    expect(range.start.getDate()).toBe(1);
    expect(range.end.getMonth()).toBe(11);
    expect(range.end.getDate()).toBe(31);
  });
});

describe("isDateInRange", () => {
  it("returns true for date within range", () => {
    expect(isDateInRange(d(2026, 4, 5), d(2026, 4, 1), d(2026, 4, 10))).toBe(true);
  });

  it("returns true for boundary dates", () => {
    expect(isDateInRange(d(2026, 4, 1), d(2026, 4, 1), d(2026, 4, 10))).toBe(true);
  });

  it("returns false for date outside range", () => {
    expect(isDateInRange(d(2026, 4, 15), d(2026, 4, 1), d(2026, 4, 10))).toBe(false);
  });
});

describe("getOverlappingEvents", () => {
  const events = [
    makeEvent("1", d(2026, 4, 10, 9), d(2026, 4, 10, 10)),
    makeEvent("2", d(2026, 4, 10, 14), d(2026, 4, 10, 15)),
    makeEvent("3", d(2026, 4, 11, 9), d(2026, 4, 11, 10)),
  ];

  it("returns events overlapping with morning range", () => {
    const result = getOverlappingEvents(events, d(2026, 4, 10, 8), d(2026, 4, 10, 11));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns all events for full day range", () => {
    const result = getOverlappingEvents(events, d(2026, 4, 10, 0), d(2026, 4, 10, 23, 59));
    expect(result).toHaveLength(2);
  });
});

describe("navigateDate", () => {
  it("moves forward one day in day view", () => {
    const result = navigateDate(d(2026, 4, 10), "day", "forward");
    expect(result.getDate()).toBe(11);
  });

  it("moves back one week in week view", () => {
    const result = navigateDate(d(2026, 4, 10), "week", "back");
    expect(result.getDate()).toBe(3);
  });

  it("moves forward one month in month view", () => {
    const result = navigateDate(d(2026, 4, 10), "month", "forward");
    expect(result.getMonth()).toBe(4); // May
  });
});

describe("getViewTitle", () => {
  it("returns full date for day view", () => {
    const title = getViewTitle(d(2026, 4, 10), "day");
    expect(title).toContain("April");
    expect(title).toContain("10");
    expect(title).toContain("2026");
  });

  it("returns month and year for month view", () => {
    const title = getViewTitle(d(2026, 4, 10), "month");
    expect(title).toBe("April 2026");
  });

  it("returns year for year view", () => {
    const title = getViewTitle(d(2026, 4, 10), "year");
    expect(title).toBe("2026");
  });
});

describe("timeToFraction", () => {
  it("converts 9:30 to 9.5", () => {
    expect(timeToFraction(d(2026, 4, 10, 9, 30))).toBe(9.5);
  });

  it("converts midnight to 0", () => {
    expect(timeToFraction(d(2026, 4, 10, 0, 0))).toBe(0);
  });
});

describe("timeToPosition", () => {
  it("calculates position relative to start hour", () => {
    // 10:00 with startHour=8, hourHeight=60 => (10-8)*60 = 120
    expect(timeToPosition(d(2026, 4, 10, 10, 0), 8, 60)).toBe(120);
  });
});

describe("durationToHeight", () => {
  it("calculates height for 1 hour event", () => {
    expect(durationToHeight(d(2026, 4, 10, 9), d(2026, 4, 10, 10), 60)).toBe(60);
  });

  it("calculates height for 30 min event", () => {
    expect(durationToHeight(d(2026, 4, 10, 9), d(2026, 4, 10, 9, 30), 60)).toBe(30);
  });
});

describe("isWorkingHour", () => {
  it("returns true for 9am", () => {
    expect(isWorkingHour(9)).toBe(true);
  });

  it("returns false for 7am", () => {
    expect(isWorkingHour(7)).toBe(false);
  });

  it("returns false for 18 (boundary)", () => {
    expect(isWorkingHour(18)).toBe(false);
  });

  it("respects custom working hours", () => {
    expect(isWorkingHour(7, 6, 14)).toBe(true);
  });
});
