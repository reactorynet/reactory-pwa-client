# ReactoryCalendar

A composable, pure-component calendar system for the Reactory PWA Client. All components are data-driven, stateless (or locally stateful), and not bound to any specific data service — consumers pass events, calendars, and callbacks as props.

## Architecture

The component library follows a 4-level hierarchy:

```
Level 0 — Foundation     Types, constants, utilities, hooks
Level 1 — Base Primitives  TimeSlot, DayCell, EventChip, EventCard, etc.
Level 2 — Composite Views  MonthView, WeekView, DayView, AgendaView, etc.
Level 2 — Controls         CalendarToolbar, CalendarSidebar, EventEditor, etc.
Level 3 — Orchestrator     CalendarLayout (full-page calendar)
```

## Quick Start

```tsx
import { CalendarLayout } from "@components/shared/ReactoryCalendar";

<CalendarLayout
  date={new Date()}
  view="month"
  events={events}
  calendars={calendars}
  onEventClick={(event) => console.log(event)}
  onSlotClick={(start, end) => console.log("New event", start, end)}
/>
```

## Views

| View | Component | Description |
|------|-----------|-------------|
| Month | `MonthView` | Grid of days with event chips |
| Week | `WeekView` | 7-column time grid with positioned event cards |
| Day | `DayView` | Single-column time grid |
| Agenda | `AgendaView` | Chronological list grouped by day |
| Year | `YearView` | 12 mini calendars with event density markers |
| Multi-Day | `MultiDayView` | Configurable N-day time grid |
| Schedule | `ScheduleView` | Resource lanes (horizontal or vertical) |

## Base Primitives

`TimeSlot`, `DayCell`, `EventChip`, `EventCard`, `TimeGutter`, `DayColumnHeader`, `AllDayRow`, `CurrentTimeIndicator`

## Controls

`CalendarToolbar`, `CalendarSidebar`, `CalendarList`, `EventPopover`, `EventEditor`, `DragOverlay`, `SelectionOverlay`

## Hooks

| Hook | Purpose |
|------|---------|
| `useCalendarNavigation` | Date/view state, navigation methods |
| `useCalendarDragDrop` | Pointer-event-based drag and resize |
| `useCalendarSelection` | Click+drag time range selection |
| `useCalendarKeyboard` | Keyboard shortcuts (t, arrows, m/w/d/a/y, Esc, Del) |
| `useCalendarLayout` | Container dimensions, responsive breakpoints |

## Utilities

| Module | Key Functions |
|--------|---------------|
| `dateUtils` | `getMonthGrid`, `getWeekDays`, `getTimeSlots`, `navigateDate`, `getViewTitle` |
| `eventUtils` | `filterEventsByCalendar`, `filterEventsByDay`, `getEventColor`, `groupEventsByDate` |
| `positionUtils` | `layoutEventsForDay`, `calculateEventStyle`, `layoutEventsForMonth` |
| `recurrenceUtils` | `expandRecurrence`, `isException` |

## Render Props

All composite views and controls accept render prop overrides for customization:

```tsx
<MonthView
  renderEvent={(event, defaultRender) => (
    <CustomEvent event={event} />
  )}
  renderDayCell={(date, events, defaultRender) => (
    <CustomDayCell date={date} events={events} />
  )}
/>
```

## Storybook

Every component has Storybook stories under the `ReactoryCalendar/` category. Run Storybook to browse the full component library interactively.

## Testing

88 unit tests covering all utility modules:

```bash
npx jest --testPathPattern="ReactoryCalendar"
```
