import { useState, useCallback, useMemo } from "react";
import {
  CalendarViewType,
  CalendarNavigationState,
} from "../types";
import { DEFAULT_VIEW, DEFAULT_WEEK_STARTS_ON } from "../constants";
import { navigateDate, getVisibleRange, getViewTitle } from "../utils/dateUtils";

export function useCalendarNavigation(
  initialDate: Date = new Date(),
  initialView: CalendarViewType = DEFAULT_VIEW,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = DEFAULT_WEEK_STARTS_ON,
  numberOfDays = 3,
): CalendarNavigationState {
  const [date, setDate] = useState(initialDate);
  const [view, setView] = useState<CalendarViewType>(initialView);

  const title = useMemo(() => getViewTitle(date, view), [date, view]);

  const visibleRange = useMemo(
    () => getVisibleRange(date, view, weekStartsOn, numberOfDays),
    [date, view, weekStartsOn, numberOfDays],
  );

  const goToToday = useCallback(() => setDate(new Date()), []);

  const goForward = useCallback(() => {
    setDate((prev) => navigateDate(prev, view, "forward", numberOfDays));
  }, [view, numberOfDays]);

  const goBack = useCallback(() => {
    setDate((prev) => navigateDate(prev, view, "back", numberOfDays));
  }, [view, numberOfDays]);

  const goToDate = useCallback((d: Date) => setDate(d), []);

  return {
    date,
    view,
    title,
    visibleRange,
    goToToday,
    goForward,
    goBack,
    goToDate,
    setView,
  };
}
