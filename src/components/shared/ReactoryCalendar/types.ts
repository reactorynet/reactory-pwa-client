import { SxProps, Theme } from "@mui/material";
import React from "react";

// ─── View Types ───────────────────────────────────────────────────────────────

export type CalendarViewType =
  | "month"
  | "week"
  | "day"
  | "agenda"
  | "year"
  | "multiDay"
  | "schedule";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type EventStatus = "draft" | "confirmed" | "cancelled" | "completed";

export type EventPriority = "low" | "normal" | "high" | "urgent";

export type ParticipantRole = "organizer" | "required" | "optional" | "resource";

export type RSVPStatus = "pending" | "accepted" | "declined" | "tentative";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type TimeSlotDuration = 15 | 30 | 60;

export type DragType = "move" | "resize-start" | "resize-end";

// ─── Core Data Models ─────────────────────────────────────────────────────────

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number;
  endDate?: Date;
  count?: number;
  byDay?: string[]; // e.g., ['MO', 'WE', 'FR']
  byMonth?: number[];
  byMonthDay?: number[];
  exceptions?: Date[];
}

export interface EventParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: ParticipantRole;
  status: RSVPStatus;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  color?: string;
  recurrence?: RecurrencePattern;
  status: EventStatus;
  priority: EventPriority;
  category?: string;
  tags?: string[];
  participants?: EventParticipant[];
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  isDefault?: boolean;
}

export interface CalendarResource {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
  capacity?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

export interface DragPayload {
  event: CalendarEvent;
  originalStart: Date;
  originalEnd: Date;
  type: DragType;
}

export interface SelectionPayload {
  start: Date;
  end: Date;
  resourceId?: string;
  isAllDay: boolean;
}

// ─── Theming ──────────────────────────────────────────────────────────────────

export interface CalendarThemeOverrides {
  eventColors?: Record<string, string>;
  todayHighlight?: string;
  selectionColor?: string;
  gridLineColor?: string;
  weekendBackground?: string;
  workingHoursBackground?: string;
}

// ─── Positioned Event (used by layout algorithms) ─────────────────────────────

export interface PositionedEvent {
  event: CalendarEvent;
  column: number;
  totalColumns: number;
}

export interface MonthEventRow {
  event: CalendarEvent;
  startCol: number;
  span: number;
  row: number;
}

export interface MonthEventLayout {
  rows: MonthEventRow[][];
}

// ─── Marked Date (for MiniCalendar) ───────────────────────────────────────────

export interface MarkedDate {
  color: string;
  count: number;
}

// ─── Callback Types ───────────────────────────────────────────────────────────

export type OnEventClick = (
  event: CalendarEvent,
  nativeEvent: React.MouseEvent,
) => void;

export type OnEventDoubleClick = (
  event: CalendarEvent,
  nativeEvent: React.MouseEvent,
) => void;

export type OnEventDrop = (
  event: CalendarEvent,
  newStart: Date,
  newEnd: Date,
  resourceId?: string,
) => void;

export type OnEventResize = (
  event: CalendarEvent,
  newStart: Date,
  newEnd: Date,
) => void;

export type OnSlotClick = (
  start: Date,
  end: Date,
  resourceId?: string,
) => void;

export type OnSlotSelect = (
  start: Date,
  end: Date,
  isAllDay: boolean,
  resourceId?: string,
) => void;

export type OnDateChange = (date: Date) => void;

export type OnViewChange = (view: CalendarViewType) => void;

export type OnCalendarToggle = (calendarId: string, visible: boolean) => void;

export type OnEventSelect = (events: CalendarEvent[]) => void;

export type OnRangeChange = (range: DateRange) => void;

// ─── Render Props ─────────────────────────────────────────────────────────────

export type EventRenderer = (
  event: CalendarEvent,
  defaultRender: () => React.ReactNode,
) => React.ReactNode;

export type DayCellRenderer = (
  date: Date,
  events: CalendarEvent[],
  defaultRender: () => React.ReactNode,
) => React.ReactNode;

export type ResourceRenderer = (
  resource: CalendarResource,
  defaultRender: () => React.ReactNode,
) => React.ReactNode;

export type ToolbarRenderer = (
  props: CalendarToolbarProps,
  defaultRender: () => React.ReactNode,
) => React.ReactNode;

// ─── Component Props ─────────────────────────────────────────────────────────

// Level 0 — Base Primitives

export interface TimeSlotProps {
  time: Date;
  duration: TimeSlotDuration;
  isCurrentTime?: boolean;
  isWorkingHour?: boolean;
  isSelected?: boolean;
  children?: React.ReactNode;
  onClick?: (time: Date) => void;
  onMouseDown?: (time: Date, e: React.MouseEvent) => void;
  onMouseEnter?: (time: Date, e: React.MouseEvent) => void;
  sx?: SxProps<Theme>;
}

export interface DayCellProps {
  date: Date;
  isToday?: boolean;
  isCurrentMonth?: boolean;
  isWeekend?: boolean;
  isSelected?: boolean;
  eventCount?: number;
  events?: CalendarEvent[];
  maxVisibleEvents?: number;
  onMoreClick?: (date: Date, hiddenCount: number) => void;
  onClick?: (date: Date) => void;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export interface EventChipProps {
  event: CalendarEvent;
  color?: string;
  isMultiDay?: boolean;
  isStart?: boolean;
  isEnd?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  onClick?: OnEventClick;
  onDoubleClick?: OnEventDoubleClick;
  onDragStart?: (event: CalendarEvent, e: React.PointerEvent) => void;
  sx?: SxProps<Theme>;
}

export interface EventCardProps {
  event: CalendarEvent;
  color?: string;
  showTime?: boolean;
  showLocation?: boolean;
  showParticipants?: boolean;
  isCompact?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  style?: React.CSSProperties;
  onClick?: OnEventClick;
  onDoubleClick?: OnEventDoubleClick;
  onDragStart?: (event: CalendarEvent, e: React.PointerEvent) => void;
  onResizeStart?: (
    event: CalendarEvent,
    type: "resize-start" | "resize-end",
    e: React.PointerEvent,
  ) => void;
  sx?: SxProps<Theme>;
}

export interface TimeGutterProps {
  startHour: number;
  endHour: number;
  slotDuration: TimeSlotDuration;
  timeFormat?: string;
  showCurrentTime?: boolean;
  sx?: SxProps<Theme>;
}

export interface DayColumnHeaderProps {
  date: Date;
  isToday?: boolean;
  format?: string;
  showDayName?: boolean;
  showDate?: boolean;
  onClick?: (date: Date) => void;
  sx?: SxProps<Theme>;
}

export interface AllDayRowProps {
  dates: Date[];
  events: CalendarEvent[];
  onEventClick?: OnEventClick;
  onSlotClick?: OnSlotClick;
  sx?: SxProps<Theme>;
}

export interface CurrentTimeIndicatorProps {
  containerHeight: number;
  startHour: number;
  endHour: number;
  sx?: SxProps<Theme>;
}

// Level 1 — Composite Views

export interface MonthViewProps {
  date: Date;
  events: CalendarEvent[];
  calendars?: CalendarSource[];
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  maxEventsPerDay?: number;
  onEventClick?: OnEventClick;
  onEventDoubleClick?: OnEventDoubleClick;
  onSlotClick?: OnSlotClick;
  onSlotSelect?: OnSlotSelect;
  onEventDrop?: OnEventDrop;
  onDateClick?: (date: Date) => void;
  renderEvent?: EventRenderer;
  renderDayCell?: DayCellRenderer;
  sx?: SxProps<Theme>;
}

export interface WeekViewProps {
  date: Date;
  events: CalendarEvent[];
  calendars?: CalendarSource[];
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startHour?: number;
  endHour?: number;
  slotDuration?: TimeSlotDuration;
  showAllDay?: boolean;
  showCurrentTime?: boolean;
  onEventClick?: OnEventClick;
  onEventDoubleClick?: OnEventDoubleClick;
  onSlotClick?: OnSlotClick;
  onSlotSelect?: OnSlotSelect;
  onEventDrop?: OnEventDrop;
  onEventResize?: OnEventResize;
  renderEvent?: EventRenderer;
  sx?: SxProps<Theme>;
}

export interface DayViewProps extends Omit<WeekViewProps, "weekStartsOn"> {}

export interface AgendaViewProps {
  date: Date;
  events: CalendarEvent[];
  calendars?: CalendarSource[];
  daysToShow?: number;
  emptyMessage?: string;
  groupBy?: "day" | "calendar";
  onEventClick?: OnEventClick;
  onEventDoubleClick?: OnEventDoubleClick;
  renderEvent?: EventRenderer;
  sx?: SxProps<Theme>;
}

export interface YearViewProps {
  date: Date;
  events: CalendarEvent[];
  calendars?: CalendarSource[];
  onDateClick?: (date: Date) => void;
  onMonthClick?: (date: Date) => void;
  renderMonth?: (
    monthDate: Date,
    defaultRender: () => React.ReactNode,
  ) => React.ReactNode;
  sx?: SxProps<Theme>;
}

export interface MultiDayViewProps extends WeekViewProps {
  numberOfDays: number;
}

export interface ScheduleViewProps {
  date: Date;
  events: CalendarEvent[];
  resources: CalendarResource[];
  orientation?: "horizontal" | "vertical";
  startHour?: number;
  endHour?: number;
  slotDuration?: TimeSlotDuration;
  onEventClick?: OnEventClick;
  onEventDrop?: OnEventDrop;
  onSlotSelect?: OnSlotSelect;
  renderResource?: ResourceRenderer;
  renderEvent?: EventRenderer;
  sx?: SxProps<Theme>;
}

export interface MiniCalendarProps {
  date: Date;
  selectedDate?: Date;
  markedDates?: Map<string, MarkedDate>;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  sx?: SxProps<Theme>;
}

// Level 2 — Controls & Interactions

export interface CalendarToolbarProps {
  date: Date;
  view: CalendarViewType;
  views?: CalendarViewType[];
  title?: string;
  onDateChange?: OnDateChange;
  onViewChange?: OnViewChange;
  onTodayClick?: () => void;
  renderCustomActions?: () => React.ReactNode;
  sx?: SxProps<Theme>;
}

export interface CalendarSidebarProps {
  date: Date;
  calendars: CalendarSource[];
  selectedDate?: Date;
  events?: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  onCalendarToggle?: OnCalendarToggle;
  onCalendarCreate?: () => void;
  sx?: SxProps<Theme>;
}

export interface CalendarListProps {
  calendars: CalendarSource[];
  onToggle?: OnCalendarToggle;
  onColorChange?: (calendarId: string, color: string) => void;
  onEdit?: (calendarId: string) => void;
  onDelete?: (calendarId: string) => void;
  sx?: SxProps<Theme>;
}

export interface EventPopoverProps {
  event: CalendarEvent;
  anchorEl: HTMLElement | null;
  onClose?: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  onDuplicate?: (event: CalendarEvent) => void;
  sx?: SxProps<Theme>;
}

export interface EventEditorProps {
  event?: Partial<CalendarEvent>;
  calendars?: CalendarSource[];
  start?: Date;
  end?: Date;
  isAllDay?: boolean;
  onSave?: (event: Partial<CalendarEvent>) => void;
  onCancel?: () => void;
  onDelete?: (event: CalendarEvent) => void;
  sx?: SxProps<Theme>;
}

export interface DragOverlayProps {
  event: CalendarEvent;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface SelectionOverlayProps {
  start: Date;
  end: Date;
  position: { top: number; left: number; width: number; height: number };
}

// Level 3 — Layout Orchestrator

export interface CalendarLayoutProps {
  date: Date;
  view: CalendarViewType;
  events: CalendarEvent[];
  calendars: CalendarSource[];
  resources?: CalendarResource[];
  sidebarOpen?: boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startHour?: number;
  endHour?: number;
  slotDuration?: TimeSlotDuration;
  views?: CalendarViewType[];
  themeOverrides?: CalendarThemeOverrides;
  onEventClick?: OnEventClick;
  onEventDoubleClick?: OnEventDoubleClick;
  onEventDrop?: OnEventDrop;
  onEventResize?: OnEventResize;
  onSlotClick?: OnSlotClick;
  onSlotSelect?: OnSlotSelect;
  onDateChange?: OnDateChange;
  onViewChange?: OnViewChange;
  onCalendarToggle?: OnCalendarToggle;
  onRangeChange?: OnRangeChange;
  renderEvent?: EventRenderer;
  renderToolbar?: ToolbarRenderer;
  renderSidebar?: (
    props: CalendarSidebarProps,
    defaultRender: () => React.ReactNode,
  ) => React.ReactNode;
  sx?: SxProps<Theme>;
}

// ─── Hook Return Types ─────────────────────────────────────────────────────────

export interface CalendarNavigationState {
  date: Date;
  view: CalendarViewType;
  title: string;
  visibleRange: DateRange;
  goToToday: () => void;
  goForward: () => void;
  goBack: () => void;
  goToDate: (date: Date) => void;
  setView: (view: CalendarViewType) => void;
}

export interface CalendarDragDropState {
  isDragging: boolean;
  dragPayload: DragPayload | null;
  dropTarget: { date: Date; resourceId?: string } | null;
  handleDragStart: (
    event: CalendarEvent,
    type: DragType,
    e: React.PointerEvent,
  ) => void;
  handleDragMove: (e: PointerEvent) => void;
  handleDragEnd: (e: PointerEvent) => void;
}

export interface CalendarSelectionState {
  isSelecting: boolean;
  selection: SelectionPayload | null;
  handleMouseDown: (
    time: Date,
    isAllDay: boolean,
    resourceId?: string,
  ) => void;
  handleMouseMove: (time: Date) => void;
  handleMouseUp: () => void;
  clearSelection: () => void;
}
