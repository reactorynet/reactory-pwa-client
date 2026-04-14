import React, { useMemo, useCallback, useState } from "react";
import { Box, useTheme } from "@mui/material";
import { CalendarLayoutProps, CalendarEvent } from "../types";
import {
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  DEFAULT_SLOT_DURATION,
  DEFAULT_WEEK_STARTS_ON,
  ALL_VIEWS,
} from "../constants";
import { useCalendarNavigation } from "../hooks/useCalendarNavigation";
import { CalendarToolbar } from "../CalendarToolbar";
import { CalendarSidebar } from "../CalendarSidebar";
import { MonthView } from "../MonthView";
import { WeekView } from "../WeekView";
import { DayView } from "../DayView";
import { AgendaView } from "../AgendaView";
import { YearView } from "../YearView";
import { MultiDayView } from "../MultiDayView";
import { ScheduleView } from "../ScheduleView";

export const CalendarLayout: React.FC<CalendarLayoutProps> = ({
  date: initialDate,
  view: initialView,
  events,
  calendars,
  resources,
  sidebarOpen: initialSidebarOpen = true,
  weekStartsOn = DEFAULT_WEEK_STARTS_ON,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
  slotDuration = DEFAULT_SLOT_DURATION,
  views = ALL_VIEWS,
  themeOverrides,
  onEventClick,
  onEventDoubleClick,
  onEventDrop,
  onEventResize,
  onSlotClick,
  onSlotSelect,
  onDateChange,
  onViewChange,
  onCalendarToggle,
  onRangeChange,
  renderEvent,
  renderToolbar,
  renderSidebar,
  sx,
}) => {
  const theme = useTheme();

  const nav = useCalendarNavigation(
    initialDate,
    initialView,
    weekStartsOn,
  );

  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);

  // Forward nav changes to external callbacks
  const handleDateChange = useCallback(
    (d: Date) => {
      nav.goToDate(d);
      onDateChange?.(d);
    },
    [nav, onDateChange],
  );

  const handleViewChange = useCallback(
    (v: typeof nav.view) => {
      nav.setView(v);
      onViewChange?.(v);
    },
    [nav, onViewChange],
  );

  const handleDateSelect = useCallback(
    (d: Date) => {
      nav.goToDate(d);
      onDateChange?.(d);
    },
    [nav, onDateChange],
  );

  // Filter events by visible calendars
  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter((c) => c.visible !== false).map((c) => c.id)),
    [calendars],
  );

  const filteredEvents = useMemo(
    () => events.filter((e) => visibleCalendarIds.has(e.calendarId)),
    [events, visibleCalendarIds],
  );

  const commonViewProps = {
    date: nav.date,
    events: filteredEvents,
    calendars,
    weekStartsOn,
    startHour,
    endHour,
    slotDuration,
    onEventClick,
    onEventDoubleClick,
    onEventDrop,
    onEventResize,
    onSlotClick,
    onSlotSelect,
    renderEvent,
  };

  const renderView = () => {
    switch (nav.view) {
      case "month":
        return <MonthView {...commonViewProps} />;
      case "week":
        return <WeekView {...commonViewProps} />;
      case "day":
        return <DayView {...commonViewProps} />;
      case "agenda":
        return <AgendaView {...commonViewProps} />;
      case "year":
        return (
          <YearView
            date={nav.date}
            events={filteredEvents}
            calendars={calendars}
            onDateClick={handleDateSelect}
          />
        );
      case "multiDay":
        return <MultiDayView {...commonViewProps} numberOfDays={3} />;
      case "schedule":
        return resources ? (
          <ScheduleView
            date={nav.date}
            events={filteredEvents}
            resources={resources}
            startHour={startHour}
            endHour={endHour}
            slotDuration={slotDuration}
            onEventClick={onEventClick}
            onEventDrop={onEventDrop}
            onSlotSelect={onSlotSelect}
            renderEvent={renderEvent}
          />
        ) : (
          <WeekView {...commonViewProps} />
        );
      default:
        return <MonthView {...commonViewProps} />;
    }
  };

  // Toolbar
  const toolbarProps = {
    date: nav.date,
    view: nav.view,
    views,
    title: nav.title,
    onDateChange: handleDateChange,
    onViewChange: handleViewChange,
    onTodayClick: nav.goToToday,
  };

  const defaultToolbar = () => <CalendarToolbar {...toolbarProps} />;

  // Sidebar
  const sidebarProps = {
    date: nav.date,
    calendars,
    selectedDate: nav.date,
    events: filteredEvents,
    onDateSelect: handleDateSelect,
    onCalendarToggle,
  };

  const defaultSidebar = () => <CalendarSidebar {...sidebarProps} />;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        ...sx,
      }}
    >
      {/* Toolbar */}
      {renderToolbar
        ? renderToolbar(toolbarProps, defaultToolbar)
        : defaultToolbar()}

      {/* Body: sidebar + view */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {sidebarOpen &&
          (renderSidebar
            ? renderSidebar(sidebarProps, defaultSidebar)
            : defaultSidebar())}

        <Box sx={{ flex: 1, overflow: "auto" }}>{renderView()}</Box>
      </Box>
    </Box>
  );
};
