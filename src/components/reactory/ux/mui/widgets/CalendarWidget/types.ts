/**
 * CalendarWidget Type Definitions
 *
 * Type definitions for the ReactoryCalendar widget family:
 * - CalendarWidget (full calendar layout)
 * - MiniCalendarWidget (date picker)
 * - EventEditorWidget (single event editor)
 * - EventListWidget (agenda/event list display)
 */
import type Reactory from '@reactorynet/reactory-core';
import type {
  CalendarViewType,
  CalendarEvent,
  CalendarSource,
  CalendarResource,
  CalendarThemeOverrides,
  TimeSlotDuration,
} from '@reactory/client-core/components/shared/ReactoryCalendar';

// ─── CalendarWidget ───────────────────────────────────────────────────────────

/**
 * The formData shape for the CalendarWidget.
 * Represents the current calendar state.
 */
export interface CalendarWidgetData {
  date: string;
  view: CalendarViewType;
  events: CalendarEvent[];
  calendars: CalendarSource[];
  selectedEventId?: string;
}

/**
 * Options accepted via `uiSchema['ui:options']` for CalendarWidget.
 */
export interface CalendarWidgetUIOptions {
  /** Initial view if not set in formData */
  defaultView?: CalendarViewType;
  /** Available view types */
  views?: CalendarViewType[];
  /** Calendar resources for schedule view */
  resources?: CalendarResource[];
  /** Show sidebar with mini-calendar and calendar list */
  sidebarOpen?: boolean;
  /** First day of the week: 0=Sunday, 1=Monday, etc. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Start hour for day/week time grid */
  startHour?: number;
  /** End hour for day/week time grid */
  endHour?: number;
  /** Time slot duration in minutes */
  slotDuration?: TimeSlotDuration;
  /** Calendar theme overrides */
  themeOverrides?: CalendarThemeOverrides;
  /** Override height of the calendar container */
  height?: string | number;
  /** Whether events can be edited (drag, resize, create) */
  editable?: boolean;
}

export interface CalendarWidgetUISchema extends Reactory.Schema.IUISchema {
  'ui:options'?: CalendarWidgetUIOptions;
}

export interface CalendarWidgetProps
  extends Reactory.Client.IReactoryWidgetProps<
    CalendarWidgetData,
    unknown,
    Reactory.Schema.ISchema,
    CalendarWidgetUISchema
  > {
  formData: CalendarWidgetData;
  onChange: (value: CalendarWidgetData) => void;
}

// ─── MiniCalendarWidget ───────────────────────────────────────────────────────

/**
 * Options accepted via `uiSchema['ui:options']` for MiniCalendarWidget.
 */
export interface MiniCalendarWidgetUIOptions {
  /** First day of the week: 0=Sunday, 1=Monday */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Dates to mark with dots/badges (keyed by ISO date string) */
  markedDates?: Record<string, { color: string; count: number }>;
}

export interface MiniCalendarWidgetUISchema extends Reactory.Schema.IUISchema {
  'ui:options'?: MiniCalendarWidgetUIOptions;
}

export interface MiniCalendarWidgetProps
  extends Reactory.Client.IReactoryWidgetProps<
    string | null,
    unknown,
    Reactory.Schema.ISchema,
    MiniCalendarWidgetUISchema
  > {
  formData: string | null;
  onChange: (value: string | null) => void;
}

// ─── EventEditorWidget ────────────────────────────────────────────────────────

/**
 * Options accepted via `uiSchema['ui:options']` for EventEditorWidget.
 */
export interface EventEditorWidgetUIOptions {
  /** Available calendars for the calendar selector */
  calendars?: CalendarSource[];
  /** Whether to show delete button for existing events */
  showDelete?: boolean;
}

export interface EventEditorWidgetUISchema extends Reactory.Schema.IUISchema {
  'ui:options'?: EventEditorWidgetUIOptions;
}

export interface EventEditorWidgetProps
  extends Reactory.Client.IReactoryWidgetProps<
    Partial<CalendarEvent> | null,
    unknown,
    Reactory.Schema.ISchema,
    EventEditorWidgetUISchema
  > {
  formData: Partial<CalendarEvent> | null;
  onChange: (value: Partial<CalendarEvent> | null) => void;
}

// ─── EventListWidget ──────────────────────────────────────────────────────────

/**
 * Options accepted via `uiSchema['ui:options']` for EventListWidget.
 */
export interface EventListWidgetUIOptions {
  /** Number of days to show in the agenda */
  daysToShow?: number;
  /** How to group events */
  groupBy?: 'day' | 'calendar';
  /** Message when no events exist */
  emptyMessage?: string;
  /** Reference date for day-relative grouping */
  referenceDate?: string;
  /** Available calendars for filtering */
  calendars?: CalendarSource[];
}

export interface EventListWidgetUISchema extends Reactory.Schema.IUISchema {
  'ui:options'?: EventListWidgetUIOptions;
}

export interface EventListWidgetProps
  extends Reactory.Client.IReactoryWidgetProps<
    CalendarEvent[],
    unknown,
    Reactory.Schema.ISchema,
    EventListWidgetUISchema
  > {
  formData: CalendarEvent[];
  onChange: (value: CalendarEvent[]) => void;
}
