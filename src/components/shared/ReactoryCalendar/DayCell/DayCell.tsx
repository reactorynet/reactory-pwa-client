import React, { useCallback } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { isWeekend as dateIsWeekend, format } from "date-fns";
import { DayCellProps } from "../types";
import { EVENT_CHIP_HEIGHT } from "../constants";

export const DayCell: React.FC<DayCellProps> = ({
  date,
  isToday = false,
  isCurrentMonth = true,
  isWeekend,
  isSelected = false,
  eventCount = 0,
  events = [],
  maxVisibleEvents = 3,
  onMoreClick,
  onClick,
  children,
  sx,
}) => {
  const theme = useTheme();
  const weekend = isWeekend ?? dateIsWeekend(date);
  const hiddenCount = Math.max(0, eventCount - maxVisibleEvents);

  const handleClick = useCallback(() => {
    onClick?.(date);
  }, [onClick, date]);

  const handleMoreClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMoreClick?.(date, hiddenCount);
    },
    [onMoreClick, date, hiddenCount],
  );

  return (
    <Box
      role="gridcell"
      aria-label={format(date, "EEEE, MMMM d, yyyy")}
      aria-selected={isSelected}
      onClick={handleClick}
      sx={{
        position: "relative",
        minHeight: 100,
        padding: 0.5,
        borderRight: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: isSelected
          ? theme.palette.action.selected
          : weekend
            ? theme.palette.action.hover
            : theme.palette.background.paper,
        opacity: isCurrentMonth ? 1 : 0.5,
        cursor: "pointer",
        overflow: "hidden",
        "&:hover": {
          backgroundColor: theme.palette.action.hover,
        },
        ...sx,
      }}
    >
      {/* Date Number */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 0.25 }}>
        <Typography
          variant="body2"
          sx={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            fontWeight: isToday ? 700 : 400,
            color: isToday
              ? theme.palette.primary.contrastText
              : isCurrentMonth
                ? theme.palette.text.primary
                : theme.palette.text.disabled,
            backgroundColor: isToday ? theme.palette.primary.main : "transparent",
          }}
        >
          {date.getDate()}
        </Typography>
      </Box>

      {/* Event slots or children */}
      {children}

      {/* "+N more" link */}
      {hiddenCount > 0 && (
        <Typography
          variant="caption"
          onClick={handleMoreClick}
          sx={{
            cursor: "pointer",
            color: theme.palette.text.secondary,
            px: 0.5,
            "&:hover": {
              color: theme.palette.primary.main,
              textDecoration: "underline",
            },
          }}
        >
          +{hiddenCount} more
        </Typography>
      )}
    </Box>
  );
};
