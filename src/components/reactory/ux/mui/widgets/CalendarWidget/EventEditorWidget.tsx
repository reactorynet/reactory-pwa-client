import React, { useMemo, useCallback } from 'react';
import { EventEditor } from '@reactory/client-core/components/shared/ReactoryCalendar/EventEditor';
import type { CalendarEvent } from '@reactory/client-core/components/shared/ReactoryCalendar';
import type { EventEditorWidgetProps } from './types';

/**
 * EventEditorWidget — ReactoryForm wrapper for the EventEditor component.
 *
 * formData: Partial<CalendarEvent> | null
 *
 * ui:options:
 *  - calendars: CalendarSource[] for the calendar selector
 *  - showDelete: boolean
 */
const EventEditorWidget: React.FC<EventEditorWidgetProps> = (props) => {
  const { formData, onChange, uiSchema, formContext } = props;

  const uiOptions = uiSchema?.['ui:options'] || {};
  const { calendars, showDelete = false } = uiOptions;

  const eventData = useMemo(() => {
    return formData || undefined;
  }, [formData]);

  const handleSave = useCallback(
    (event: Partial<CalendarEvent>) => {
      if (onChange) {
        onChange(event);
      }
    },
    [onChange],
  );

  const handleCancel = useCallback(() => {
    if (formContext?.reset) {
      formContext.reset();
    }
  }, [formContext]);

  const handleDelete = useCallback(
    (event: CalendarEvent) => {
      if (onChange) {
        onChange(null);
      }
    },
    [onChange],
  );

  return (
    <EventEditor
      event={eventData}
      calendars={calendars}
      start={eventData?.start ? new Date(eventData.start) : undefined}
      end={eventData?.end ? new Date(eventData.end) : undefined}
      isAllDay={eventData?.isAllDay}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={showDelete ? handleDelete : undefined}
    />
  );
};

export default EventEditorWidget;
