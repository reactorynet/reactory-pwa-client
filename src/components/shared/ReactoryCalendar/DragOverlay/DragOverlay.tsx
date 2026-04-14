import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { DragOverlayProps } from "../types";
import { DEFAULT_EVENT_COLOR } from "../constants";

export const DragOverlay: React.FC<DragOverlayProps> = ({
  event,
  position,
  width,
  height,
}) => {
  const theme = useTheme();
  const color = event.color || DEFAULT_EVENT_COLOR;

  return (
    <Box
      sx={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width,
        height,
        bgcolor: color,
        color: theme.palette.getContrastText(color),
        borderRadius: 1,
        px: 1,
        py: 0.5,
        opacity: 0.85,
        boxShadow: theme.shadows[4],
        pointerEvents: "none",
        zIndex: theme.zIndex.tooltip,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Typography variant="caption" noWrap>
        {event.title}
      </Typography>
    </Box>
  );
};
