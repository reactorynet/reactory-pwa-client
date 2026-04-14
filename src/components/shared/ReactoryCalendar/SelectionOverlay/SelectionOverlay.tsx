import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { format } from "date-fns";
import { SelectionOverlayProps } from "../types";

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  start,
  end,
  position,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "absolute",
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
        bgcolor: theme.palette.primary.main,
        opacity: 0.15,
        border: `2px solid ${theme.palette.primary.main}`,
        borderRadius: 0.5,
        pointerEvents: "none",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        px: 0.5,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: theme.palette.primary.main,
          fontWeight: 600,
          opacity: 1 / 0.15,
        }}
      >
        {format(start, "h:mm a")} – {format(end, "h:mm a")}
      </Typography>
    </Box>
  );
};
