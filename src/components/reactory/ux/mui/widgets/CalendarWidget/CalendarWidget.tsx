import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { useReactory } from '@reactory/client-core/api';
import { CalendarLayout } from '@reactory/client-core/components/shared/ReactoryCalendar/CalendarLayout';
import type {
  CalendarEvent,
  CalendarViewType,
  OnEventClick,
  OnEventDrop,
  OnEventResize,
  OnSlotSelect,
  OnDateChange,
  OnViewChange,
  OnCalendarToggle,
  MarkedDate,
} from '@reactory/client-core/components/shared/ReactoryCalendar';
import type { CalendarWidgetProps, CalendarWidgetData } from './types';

const defaultFormData: CalendarWidgetData = {
  date: new Date().toISOString(),
  view: 'month',
  events: [],
  calendars: [],
};

/**
 * CalendarWidget — ReactoryForm wrapper for the CalendarLayout component.
 *
 * formData shape: `{ date: string, view: CalendarViewType, events: CalendarEvent[], calendars: CalendarSource[], selectedEventId?: string }`
 *
 * ui:options:
 *  - defaultView: initial view type
 *  - views: array of enabled view types
 *  - resources: CalendarResource[] for schedule view
 *  - sidebarOpen: boolean
 *  - weekStartsOn: 0-6
 *  - startHour, endHour: number
 *  - slotDuration: 15 | 30 | 60
 *  - themeOverrides: CalendarThemeOverrides
 *  - height: string | number
 *  - editable: boolean
 */
const CalendarWidget: React.FC<CalendarWidgetProps> = (props) => {
  const { formData: rawFormData, onChange, uiSchema, schema, formContext } = props;
  const reactory = useReactory();
  const data = rawFormData || defaultFormData;

  const uiOptions = uiSchema?.['ui:options'] || {};
  const {
    defaultView = 'month',
    views,
    resources,
    sidebarOpen = true,
    weekStartsOn,
    startHour,
    endHour,
    slotDuration,
    themeOverrides,
    height = '100%',
    editable = true,
  } = uiOptions;

  const currentDate = useMemo(() => {
    return data.date ? new Date(data.date) : new Date();
  }, [data.date]);

  const currentView = data.view || defaultView;

  const updateFormData = useCallback(
    (patch: Partial<CalendarWidgetData>) => {
      if (onChange) {
        onChange({ ...data, ...patch });
      }
    },
    [data, onChange],
  );

  const handleDateChange: OnDateChange = useCallback(
    (date) => {
      updateFormData({ date: date.toISOString() });
    },
    [updateFormData],
  );

  const handleViewChange: OnViewChange = useCallback(
    (view) => {
      updateFormData({ view });
    },
    [updateFormData],
  );

  const handleEventClick: OnEventClick = useCallback(
    (event, nativeEvent) => {
      updateFormData({ selectedEventId: event.id });
    },
    [updateFormData],
  );

  const handleEventDrop: OnEventDrop = useCallback(
    (event, newStart, newEnd, resourceId) => {
      if (!editable) return;
      const updatedEvents = data.events.map((e) =>
        e.id === event.id
          ? { ...e, start: newStart, end: newEnd, ...(resourceId !== undefined ? { resourceId } : {}) }
          : e,
      );
      updateFormData({ events: updatedEvents });
    },
    [data.events, editable, updateFormData],
  );

  const handleEventResize: OnEventResize = useCallback(
    (event, newStart, newEnd) => {
      if (!editable) return;
      const updatedEvents = data.events.map((e) =>
        e.id === event.id ? { ...e, start: newStart, end: newEnd } : e,
      );
      updateFormData({ events: updatedEvents });
    },
    [data.events, editable, updateFormData],
  );

  const handleSlotSelect: OnSlotSelect = useCallback(
    (start, end, isAllDay, resourceId) => {
      if (!editable) return;
      const newEvent: CalendarEvent = {
        id: `new-${Date.now()}`,
        calendarId: data.calendars?.[0]?.id || 'default',
        title: 'New Event',
        start,
        end,
        isAllDay,
        status: 'draft',
        priority: 'normal',
        ...(resourceId ? { resourceId } : {}),
      };
      updateFormData({ events: [...data.events, newEvent] });
    },
    [data.events, data.calendars, editable, updateFormData],
  );

  const handleCalendarToggle: OnCalendarToggle = useCallback(
    (calendarId, visible) => {
      const updatedCalendars = data.calendars.map((c) =>
        c.id === calendarId ? { ...c, visible } : c,
      );
      updateFormData({ calendars: updatedCalendars });
    },
    [data.calendars, updateFormData],
  );

  return (
    <Box sx={{ height, minHeight: 400 }}>
      <CalendarLayout
        date={currentDate}
        view={currentView}
        events={data.events || []}
        calendars={data.calendars || []}
        resources={resources}
        sidebarOpen={sidebarOpen}
        weekStartsOn={weekStartsOn}
        startHour={startHour}
        endHour={endHour}
        slotDuration={slotDuration}
        views={views}
        themeOverrides={themeOverrides}
        onEventClick={handleEventClick}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        onSlotSelect={handleSlotSelect}
        onDateChange={handleDateChange}
        onViewChange={handleViewChange}
        onCalendarToggle={handleCalendarToggle}
      />
    </Box>
  );
};

export default CalendarWidget;
