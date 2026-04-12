import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { addMonths, startOfYear, format } from "date-fns";
import { YearViewProps } from "../types";
import { countEventsByDay } from "../utils/eventUtils";
import { MiniCalendar } from "../MiniCalendar";

export const YearView: React.FC<YearViewProps> = ({
  date,
  events,
  calendars,
  onDateClick,
  onMonthClick,
  renderMonth,
  sx,
}) => {
  const theme = useTheme();

  const yearStart = useMemo(() => startOfYear(date), [date]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i)),
    [yearStart],
  );

  // Build marked dates from events for the whole year
  const markedDates = useMemo(() => {
    const counts = countEventsByDay(events);
    const marked = new Map<string, { color: string; count: number }>();
    counts.forEach((count, key) => {
      marked.set(key, { color: theme.palette.primary.main, count });
    });
    return marked;
  }, [events, theme.palette.primary.main]);

  return (
    <Box
      role="grid"
      aria-label="Year view"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 3,
        p: 2,
        flex: 1,
        overflow: "auto",
        ...sx,
      }}
    >
      {months.map((monthDate, i) => {
        const defaultRender = () => (
          <Box key={i}>
            <MiniCalendar
              date={monthDate}
              markedDates={markedDates}
              onDateSelect={onDateClick}
              onMonthChange={() => onMonthClick?.(monthDate)}
            />
          </Box>
        );

        return (
          <React.Fragment key={i}>
            {renderMonth
              ? renderMonth(monthDate, defaultRender)
              : defaultRender()}
          </React.Fragment>
        );
      })}
    </Box>
  );
};
