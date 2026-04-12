// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  // View & Enums
  CalendarViewType,
  EventStatus,
  EventPriority,
  ParticipantRole,
  RSVPStatus,
  RecurrenceFrequency,
  TimeSlotDuration,
  DragType,

  // Core Data Models
  RecurrencePattern,
  EventParticipant,
  CalendarEvent,
  CalendarSource,
  CalendarResource,
  DateRange,

  // Drag & Drop
  DragPayload,
  SelectionPayload,

  // Theming
  CalendarThemeOverrides,

  // Layout
  PositionedEvent,
  MonthEventRow,
  MonthEventLayout,
  MarkedDate,

  // Callbacks
  OnEventClick,
  OnEventDoubleClick,
  OnEventDrop,
  OnEventResize,
  OnSlotClick,
  OnSlotSelect,
  OnDateChange,
  OnViewChange,
  OnCalendarToggle,
  OnEventSelect,
  OnRangeChange,

  // Render Props
  EventRenderer,
  DayCellRenderer,
  ResourceRenderer,
  ToolbarRenderer,

  // Component Props
  TimeSlotProps,
  DayCellProps,
  EventChipProps,
  EventCardProps,
  TimeGutterProps,
  DayColumnHeaderProps,
  AllDayRowProps,
  CurrentTimeIndicatorProps,
  MonthViewProps,
  WeekViewProps,
  DayViewProps,
  AgendaViewProps,
  YearViewProps,
  MultiDayViewProps,
  ScheduleViewProps,
  MiniCalendarProps,
  CalendarToolbarProps,
  CalendarSidebarProps,
  CalendarListProps,
  EventPopoverProps,
  EventEditorProps,
  DragOverlayProps,
  SelectionOverlayProps,
  CalendarLayoutProps,

  // Hook Return Types
  CalendarNavigationState,
  CalendarDragDropState,
  CalendarSelectionState,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  DEFAULT_WORKING_START_HOUR,
  DEFAULT_WORKING_END_HOUR,
  DEFAULT_SLOT_DURATION,
  DEFAULT_WEEK_STARTS_ON,
  DEFAULT_MAX_EVENTS_PER_DAY,
  DEFAULT_AGENDA_DAYS,
  DEFAULT_MULTI_DAY_COUNT,
  DEFAULT_VIEW,
  ALL_VIEWS,
  VIEW_LABELS,
  EVENT_COLORS,
  DEFAULT_EVENT_COLOR,
  HOUR_HEIGHT,
  TIME_GUTTER_WIDTH,
  DAY_HEADER_HEIGHT,
  ALL_DAY_ROW_HEIGHT,
  EVENT_CHIP_HEIGHT,
  MINI_CALENDAR_SIZE,
  SIDEBAR_WIDTH,
  TOOLBAR_HEIGHT,
  TIME_FORMAT_24H,
  TIME_FORMAT_12H,
  DATE_FORMAT_SHORT,
  DATE_FORMAT_FULL,
  DAY_NAME_SHORT,
  DAY_NAME_FULL,
  MONTH_NAME_SHORT,
  MONTH_NAME_FULL,
  MONTH_YEAR_FORMAT,
  DAY_ABBREVIATIONS,
  DRAG_THRESHOLD,
  DRAG_SCROLL_SPEED,
  DRAG_SCROLL_ZONE,
  TRANSITION_DURATION,
  ARIA_LABELS,
} from "./constants";

// ─── Utilities ────────────────────────────────────────────────────────────────
export {
  // dateUtils
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
  // date-fns re-exports
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

  // eventUtils
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

  // positionUtils
  layoutEventsForDay,
  calculateEventStyle,
  layoutEventsForWeekRow,
  layoutEventsForMonth,

  // recurrenceUtils
  expandRecurrence,
  isException,
} from "./utils";

// ─── Base Primitives ──────────────────────────────────────────────────────────
export { TimeSlot } from "./TimeSlot";
export { DayCell } from "./DayCell";
export { EventChip } from "./EventChip";
export { EventCard } from "./EventCard";
export { TimeGutter } from "./TimeGutter";
export { DayColumnHeader } from "./DayColumnHeader";
export { AllDayRow } from "./AllDayRow";
export { CurrentTimeIndicator } from "./CurrentTimeIndicator";

// ─── Composite Views ──────────────────────────────────────────────────────────
export { MiniCalendar } from "./MiniCalendar";
export { MonthView } from "./MonthView";
export { WeekView } from "./WeekView";
export { DayView } from "./DayView";
export { AgendaView } from "./AgendaView";
export { YearView } from "./YearView";
export { MultiDayView } from "./MultiDayView";
export { ScheduleView } from "./ScheduleView";

// ─── Controls & Interactions ──────────────────────────────────────────────────
export { CalendarToolbar } from "./CalendarToolbar";
export { CalendarSidebar } from "./CalendarSidebar";
export { CalendarList } from "./CalendarList";
export { EventPopover } from "./EventPopover";
export { EventEditor } from "./EventEditor";
export { DragOverlay } from "./DragOverlay";
export { SelectionOverlay } from "./SelectionOverlay";

// ─── Layout Orchestrator ──────────────────────────────────────────────────────
export { CalendarLayout } from "./CalendarLayout";

// ─── Hooks ────────────────────────────────────────────────────────────────────
export {
  useCalendarNavigation,
  useCalendarDragDrop,
  useCalendarSelection,
  useCalendarKeyboard,
  useCalendarLayout,
} from "./hooks";
