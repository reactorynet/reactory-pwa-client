import React, { useCallback } from "react";
import { Box, useTheme } from "@mui/material";
import { TimeSlotProps } from "../types";

export const TimeSlot: React.FC<TimeSlotProps> = ({
  time,
  duration,
  isCurrentTime = false,
  isWorkingHour = false,
  isSelected = false,
  children,
  onClick,
  onMouseDown,
  onMouseEnter,
  sx,
}) => {
  const theme = useTheme();

  const handleClick = useCallback(() => {
    onClick?.(time);
  }, [onClick, time]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      onMouseDown?.(time, e);
    },
    [onMouseDown, time],
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      onMouseEnter?.(time, e);
    },
    [onMouseEnter, time],
  );

  const slotHeight = (duration / 60) * 60; // 60px per hour

  return (
    <Box
      role="gridcell"
      aria-label={`Time slot at ${time.toLocaleTimeString()}`}
      aria-selected={isSelected}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      sx={{
        position: "relative",
        height: slotHeight,
        minHeight: slotHeight,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: isSelected
          ? theme.palette.action.selected
          : isWorkingHour
            ? theme.palette.background.paper
            : theme.palette.action.hover,
        cursor: "pointer",
        transition: "background-color 150ms ease",
        "&:hover": {
          backgroundColor: theme.palette.action.hover,
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};
