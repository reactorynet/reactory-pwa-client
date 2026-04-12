import React, { useEffect, useState } from "react";
import { Box, useTheme } from "@mui/material";
import { CurrentTimeIndicatorProps } from "../types";
import { HOUR_HEIGHT } from "../constants";

export const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  containerHeight,
  startHour,
  endHour,
  sx,
}) => {
  const theme = useTheme();
  const [now, setNow] = useState(new Date());

  // Update every 60 seconds
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (currentHour < startHour || currentHour >= endHour) return null;

  const topPx =
    (currentHour - startHour) * HOUR_HEIGHT +
    (currentMinute / 60) * HOUR_HEIGHT;

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: "absolute",
        top: topPx,
        left: 0,
        right: 0,
        zIndex: 3,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        ...sx,
      }}
    >
      {/* Dot */}
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: theme.palette.error.main,
          flexShrink: 0,
          transform: "translateX(-5px)",
        }}
      />
      {/* Line */}
      <Box
        sx={{
          flex: 1,
          height: 2,
          backgroundColor: theme.palette.error.main,
        }}
      />
    </Box>
  );
};
