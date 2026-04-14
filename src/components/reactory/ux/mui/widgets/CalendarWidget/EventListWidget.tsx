import React, { useMemo, useCallback } from 'react';
import { AgendaView } from '@reactory/client-core/components/shared/ReactoryCalendar/AgendaView';
import type { CalendarEvent, OnEventClick } from '@reactory/client-core/components/shared/ReactoryCalendar';
import type { EventListWidgetProps } from './types';

/**
 * EventListWidget — ReactoryForm wrapper for the AgendaView component.
 *
 * formData: CalendarEvent[]
 *
 * ui:options:
 *  - daysToShow: number (default: 7)
 *  - groupBy: 'day' | 'calendar'
 *  - emptyMessage: string
 *  - referenceDate: ISO date string
 *  - calendars: CalendarSource[]
 */
const EventListWidget: React.FC<EventListWidgetProps> = (props) => {
  const { formData, onChange, uiSchema, formContext } = props;

  const uiOptions = uiSchema?.['ui:options'] || {};
  const {
    daysToShow = 7,
    groupBy = 'day',
    emptyMessage,
    referenceDate,
    calendars,
  } = uiOptions;

  const events = useMemo(() => {
    return formData || [];
  }, [formData]);

  const date = useMemo(() => {
    return referenceDate ? new Date(referenceDate) : new Date();
  }, [referenceDate]);

  const handleEventClick: OnEventClick = useCallback(
    (event, nativeEvent) => {
      // If formContext has a $ref callback for event clicks, invoke it
      const refCallback = formContext?.$ref?.['onEventClick'];
      if (typeof refCallback === 'function') {
        (refCallback as (event: CalendarEvent) => void)(event);
      }
    },
    [formContext],
  );

  return (
    <AgendaView
      date={date}
      events={events}
      calendars={calendars}
      daysToShow={daysToShow}
      groupBy={groupBy}
      emptyMessage={emptyMessage}
      onEventClick={handleEventClick}
    />
  );
};

export default EventListWidget;
