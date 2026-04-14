import React, { useCallback } from "react";
import {
  Box,
  Typography,
  Avatar,
  AvatarGroup,
  useTheme,
} from "@mui/material";
import { format } from "date-fns";
import { AccessTime, LocationOn } from "@mui/icons-material";
import { EventCardProps } from "../types";

export const EventCard: React.FC<EventCardProps> = ({
  event,
  color,
  showTime = true,
  showLocation = false,
  showParticipants = false,
  isCompact = false,
  isSelected = false,
  isDragging = false,
  style,
  onClick,
  onDoubleClick,
  onDragStart,
  onResizeStart,
  sx,
}) => {
  const theme = useTheme();
  const cardColor = color || event.color || theme.palette.primary.main;

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

  const handleResizeTop = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onResizeStart?.(event, "resize-start", e);
    },
    [onResizeStart, event],
  );

  const handleResizeBottom = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onResizeStart?.(event, "resize-end", e);
    },
    [onResizeStart, event],
  );

  const timeStr = `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`;

  return (
    <Box
      role="button"
      aria-label={`${event.title}, ${timeStr}`}
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        borderRadius: "4px",
        borderLeft: `4px solid ${cardColor}`,
        backgroundColor: `${cardColor}18`,
        cursor: isDragging ? "grabbing" : "pointer",
        opacity: isDragging ? 0.6 : 1,
        overflow: "hidden",
        userSelect: "none",
        outline: isSelected
          ? `2px solid ${theme.palette.primary.dark}`
          : "none",
        outlineOffset: 1,
        transition: "box-shadow 150ms ease, opacity 150ms ease",
        "&:hover": {
          boxShadow: theme.shadows[3],
        },
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 1,
        },
        ...sx,
      }}
      style={style}
    >
      {/* Resize handle — top */}
      {onResizeStart && (
        <Box
          onPointerDown={handleResizeTop}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            cursor: "ns-resize",
          }}
        />
      )}

      {/* Content */}
      <Box sx={{ px: 1, py: isCompact ? 0.25 : 0.5 }}>
        <Typography
          variant="body2"
          noWrap
          sx={{ fontWeight: 600, fontSize: isCompact ? "0.75rem" : "0.8125rem" }}
        >
          {event.title}
        </Typography>

        {showTime && !isCompact && (
          <Box sx={{ display: "flex", alignItems: "center", mt: 0.25 }}>
            <AccessTime sx={{ fontSize: 12, mr: 0.5, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {timeStr}
            </Typography>
          </Box>
        )}

        {showLocation && event.location && !isCompact && (
          <Box sx={{ display: "flex", alignItems: "center", mt: 0.25 }}>
            <LocationOn sx={{ fontSize: 12, mr: 0.5, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {event.location}
            </Typography>
          </Box>
        )}

        {showParticipants &&
          event.participants &&
          event.participants.length > 0 &&
          !isCompact && (
            <AvatarGroup max={4} sx={{ mt: 0.5, justifyContent: "flex-start" }}>
              {event.participants.map((p) => (
                <Avatar
                  key={p.id}
                  alt={p.name}
                  src={p.avatar}
                  sx={{ width: 20, height: 20, fontSize: "0.625rem" }}
                >
                  {p.name?.[0]}
                </Avatar>
              ))}
            </AvatarGroup>
          )}
      </Box>

      {/* Resize handle — bottom */}
      {onResizeStart && (
        <Box
          onPointerDown={handleResizeBottom}
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            cursor: "ns-resize",
          }}
        />
      )}
    </Box>
  );
};
