import { CalendarViewType, TimeSlotDuration } from "./types";

// ─── Default Configuration ───────────────────────────────────────────────────

export const DEFAULT_START_HOUR = 0;
export const DEFAULT_END_HOUR = 24;
export const DEFAULT_WORKING_START_HOUR = 8;
export const DEFAULT_WORKING_END_HOUR = 18;
export const DEFAULT_SLOT_DURATION: TimeSlotDuration = 30;
export const DEFAULT_WEEK_STARTS_ON: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1; // Monday
export const DEFAULT_MAX_EVENTS_PER_DAY = 3;
export const DEFAULT_AGENDA_DAYS = 30;
export const DEFAULT_MULTI_DAY_COUNT = 3;

export const DEFAULT_VIEW: CalendarViewType = "week";

export const ALL_VIEWS: CalendarViewType[] = [
  "month",
  "week",
  "day",
  "agenda",
  "year",
  "multiDay",
  "schedule",
];

// ─── View Labels ──────────────────────────────────────────────────────────────

export const VIEW_LABELS: Record<CalendarViewType, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
  agenda: "Agenda",
  year: "Year",
  multiDay: "Multi-Day",
  schedule: "Schedule",
};

// ─── Color Palette ────────────────────────────────────────────────────────────

export const EVENT_COLORS = [
  "#1976d2", // Blue
  "#388e3c", // Green
  "#d32f2f", // Red
  "#7b1fa2", // Purple
  "#f57c00", // Orange
  "#0097a7", // Teal
  "#c2185b", // Pink
  "#512da8", // Deep Purple
  "#00796b", // Dark Teal
  "#e64a19", // Deep Orange
  "#303f9f", // Indigo
  "#689f38", // Light Green
] as const;

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0];

// ─── Sizing ───────────────────────────────────────────────────────────────────

export const HOUR_HEIGHT = 60; // px per hour in time-based views
export const TIME_GUTTER_WIDTH = 64; // px for time labels column
export const DAY_HEADER_HEIGHT = 40; // px for day column headers
export const ALL_DAY_ROW_HEIGHT = 28; // px per all-day event row
export const EVENT_CHIP_HEIGHT = 22; // px height for month view event chips
export const MINI_CALENDAR_SIZE = 240; // px for mini calendar width/height
export const SIDEBAR_WIDTH = 280; // px for sidebar panel
export const TOOLBAR_HEIGHT = 56; // px for toolbar

// ─── Time Formats ─────────────────────────────────────────────────────────────

export const TIME_FORMAT_24H = "HH:mm";
export const TIME_FORMAT_12H = "h:mm a";
export const DATE_FORMAT_SHORT = "MMM d";
export const DATE_FORMAT_FULL = "MMMM d, yyyy";
export const DAY_NAME_SHORT = "EEE";
export const DAY_NAME_FULL = "EEEE";
export const MONTH_NAME_SHORT = "MMM";
export const MONTH_NAME_FULL = "MMMM";
export const MONTH_YEAR_FORMAT = "MMMM yyyy";

// ─── Day Abbreviations (for recurrence) ───────────────────────────────────────

export const DAY_ABBREVIATIONS = [
  "SU",
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
] as const;

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

export const DRAG_THRESHOLD = 5; // px movement before drag starts
export const DRAG_SCROLL_SPEED = 8; // px per frame when auto-scrolling
export const DRAG_SCROLL_ZONE = 40; // px from edge to start auto-scroll

// ─── Animation ────────────────────────────────────────────────────────────────

export const TRANSITION_DURATION = 200; // ms

// ─── Accessibility ────────────────────────────────────────────────────────────

export const ARIA_LABELS = {
  calendar: "Calendar",
  monthView: "Month view",
  weekView: "Week view",
  dayView: "Day view",
  agendaView: "Agenda view",
  yearView: "Year view",
  scheduleView: "Schedule view",
  previousPeriod: "Previous period",
  nextPeriod: "Next period",
  today: "Go to today",
  viewSwitcher: "Switch calendar view",
  event: "Calendar event",
  newEvent: "Create new event",
  miniCalendar: "Date navigator",
  calendarList: "Calendar list",
} as const;
