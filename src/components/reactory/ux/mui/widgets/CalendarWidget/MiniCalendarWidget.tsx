import React, { useMemo, useCallback } from 'react';
import { MiniCalendar } from '@reactory/client-core/components/shared/ReactoryCalendar/MiniCalendar';
import type { MarkedDate } from '@reactory/client-core/components/shared/ReactoryCalendar';
import type { MiniCalendarWidgetProps } from './types';

/**
 * MiniCalendarWidget — ReactoryForm wrapper for the MiniCalendar date picker.
 *
 * formData: ISO date string (`"2026-04-14"`) or null.
 *
 * ui:options:
 *  - weekStartsOn: 0-6
 *  - markedDates: Record<string, { color, count }>
 */
const MiniCalendarWidget: React.FC<MiniCalendarWidgetProps> = (props) => {
  const { formData, onChange, uiSchema } = props;

  const uiOptions = uiSchema?.['ui:options'] || {};
  const { weekStartsOn, markedDates: markedDatesObj } = uiOptions;

  const selectedDate = useMemo(() => {
    return formData ? new Date(formData) : undefined;
  }, [formData]);

  const currentDate = useMemo(() => {
    return selectedDate || new Date();
  }, [selectedDate]);

  const markedDates = useMemo(() => {
    if (!markedDatesObj) return undefined;
    const map = new Map<string, MarkedDate>();
    for (const [key, val] of Object.entries(markedDatesObj)) {
      map.set(key, val);
    }
    return map;
  }, [markedDatesObj]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (onChange) {
        onChange(date.toISOString().split('T')[0]);
      }
    },
    [onChange],
  );

  return (
    <MiniCalendar
      date={currentDate}
      selectedDate={selectedDate}
      markedDates={markedDates}
      weekStartsOn={weekStartsOn}
      onDateSelect={handleDateSelect}
    />
  );
};

export default MiniCalendarWidget;
