import React, { useCallback, useMemo } from "react";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import {
  format,
  isSameDay,
  isSameMonth,
  isToday as dateIsToday,
  isWeekend as dateIsWeekend,
  addMonths,
  subMonths,
} from "date-fns";
import { MiniCalendarProps, MarkedDate } from "../types";
import { DEFAULT_WEEK_STARTS_ON, MONTH_YEAR_FORMAT } from "../constants";
import { getMonthGrid } from "../utils/dateUtils";

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  date,
  selectedDate,
  markedDates,
  weekStartsOn = DEFAULT_WEEK_STARTS_ON,
  onDateSelect,
  onMonthChange,
  sx,
}) => {
  const theme = useTheme();

  const grid = useMemo(
    () => getMonthGrid(date, weekStartsOn),
    [date, weekStartsOn],
  );

  // Day name headers
  const dayHeaders = useMemo(() => {
    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const result: string[] = [];
    for (let i = 0; i < 7; i++) {
      result.push(days[(weekStartsOn + i) % 7]);
    }
    return result;
  }, [weekStartsOn]);

  const handlePrev = useCallback(() => {
    onMonthChange?.(subMonths(date, 1));
  }, [date, onMonthChange]);

  const handleNext = useCallback(() => {
    onMonthChange?.(addMonths(date, 1));
  }, [date, onMonthChange]);

  return (
    <Box
      role="grid"
      aria-label="Date navigator"
      sx={{ width: 240, userSelect: "none", ...sx }}
    >
      {/* Month/Year header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 0.5,
        }}
      >
        <IconButton size="small" onClick={handlePrev} aria-label="Previous month">
          <ChevronLeft fontSize="small" />
        </IconButton>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {format(date, MONTH_YEAR_FORMAT)}
        </Typography>
        <IconButton size="small" onClick={handleNext} aria-label="Next month">
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>

      {/* Day name row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          mb: 0.25,
        }}
      >
        {dayHeaders.map((d) => (
          <Typography
            key={d}
            variant="caption"
            align="center"
            sx={{
              fontWeight: 600,
              fontSize: "0.65rem",
              color: theme.palette.text.secondary,
            }}
          >
            {d}
          </Typography>
        ))}
      </Box>

      {/* Date grid */}
      {grid.map((week, wi) => (
        <Box
          key={wi}
          sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}
        >
          {week.map((day, di) => {
            const today = dateIsToday(day);
            const inMonth = isSameMonth(day, date);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const key = format(day, "yyyy-MM-dd");
            const mark = markedDates?.get(key);

            return (
              <Box
                key={di}
                role="gridcell"
                aria-selected={!!selected}
                onClick={() => onDateSelect?.(day)}
                sx={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  borderRadius: "50%",
                  mx: "auto",
                  fontWeight: today ? 700 : 400,
                  fontSize: "0.75rem",
                  color: selected
                    ? theme.palette.primary.contrastText
                    : !inMonth
                      ? theme.palette.text.disabled
                      : today
                        ? theme.palette.primary.main
                        : theme.palette.text.primary,
                  backgroundColor: selected
                    ? theme.palette.primary.main
                    : "transparent",
                  "&:hover": {
                    backgroundColor: selected
                      ? theme.palette.primary.dark
                      : theme.palette.action.hover,
                  },
                }}
              >
                {day.getDate()}
                {/* Event marker dot */}
                {mark && mark.count > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 2,
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      backgroundColor: mark.color || theme.palette.primary.main,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};
