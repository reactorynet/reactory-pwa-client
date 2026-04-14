import React, { useCallback, useRef } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { format } from "date-fns";
import { EventChipProps } from "../types";
import { EVENT_CHIP_HEIGHT } from "../constants";

export const EventChip: React.FC<EventChipProps> = ({
  event,
  color,
  isMultiDay = false,
  isStart = true,
  isEnd = true,
  isSelected = false,
  isDragging = false,
  onClick,
  onDoubleClick,
  onDragStart,
  sx,
}) => {
  const theme = useTheme();
  const chipColor = color || event.color || theme.palette.primary.main;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(event, e);
    },
    [onClick, event],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(event, e);
    },
    [onDoubleClick, event],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      onDragStart?.(event, e);
    },
    [onDragStart, event],
  );

  return (
    <Box
      role="button"
      aria-label={`${event.title}${event.isAllDay ? ", all day" : ""}`}
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      sx={{
        display: "flex",
        alignItems: "center",
        height: EVENT_CHIP_HEIGHT,
        px: 0.5,
        borderRadius: isMultiDay
          ? `${isStart ? 4 : 0}px ${isEnd ? 4 : 0}px ${isEnd ? 4 : 0}px ${isStart ? 4 : 0}px`
          : "4px",
        backgroundColor: chipColor,
        color: theme.palette.getContrastText(chipColor),
        cursor: isDragging ? "grabbing" : "pointer",
        opacity: isDragging ? 0.6 : 1,
        overflow: "hidden",
        whiteSpace: "nowrap",
        userSelect: "none",
        outline: isSelected ? `2px solid ${theme.palette.primary.dark}` : "none",
        outlineOffset: 1,
        transition: "opacity 150ms ease, box-shadow 150ms ease",
        "&:hover": {
          boxShadow: theme.shadows[2],
        },
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 1,
        },
        ...sx,
      }}
    >
      {/* Time indicator dot for non-allday events */}
      {!event.isAllDay && isStart && (
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: theme.palette.getContrastText(chipColor),
            mr: 0.5,
            flexShrink: 0,
            opacity: 0.8,
          }}
        />
      )}
      <Typography
        variant="caption"
        noWrap
        sx={{ fontSize: "0.7rem", lineHeight: 1.2, fontWeight: 500 }}
      >
        {isStart && !event.isAllDay && (
          <>{format(event.start, "h:mm")} </>
        )}
        {event.title}
      </Typography>
    </Box>
  );
};
