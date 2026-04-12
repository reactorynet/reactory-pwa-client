import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { format } from "date-fns";
import { TimeGutterProps } from "../types";
import { TIME_FORMAT_24H, HOUR_HEIGHT } from "../constants";

export const TimeGutter: React.FC<TimeGutterProps> = ({
  startHour,
  endHour,
  slotDuration,
  timeFormat = TIME_FORMAT_24H,
  showCurrentTime = false,
  sx,
}) => {
  const theme = useTheme();
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) {
    hours.push(h);
  }

  // Current time marker
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isCurrentVisible =
    showCurrentTime && currentHour >= startHour && currentHour < endHour;
  const currentTopPx = isCurrentVisible
    ? (currentHour - startHour) * HOUR_HEIGHT +
      (currentMinute / 60) * HOUR_HEIGHT
    : 0;

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: 64,
        flexShrink: 0,
        ...sx,
      }}
    >
      {hours.map((h) => {
        const d = new Date();
        d.setHours(h, 0, 0, 0);
        return (
          <Box
            key={h}
            sx={{
              height: HOUR_HEIGHT,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              pr: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: "0.7rem",
                lineHeight: 1,
                transform: "translateY(-6px)",
              }}
            >
              {h === startHour ? "" : format(d, timeFormat)}
            </Typography>
          </Box>
        );
      })}

      {/* Current time marker */}
      {isCurrentVisible && (
        <Box
          sx={{
            position: "absolute",
            top: currentTopPx,
            right: 0,
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: theme.palette.error.main,
            transform: "translate(50%, -50%)",
            zIndex: 2,
          }}
        />
      )}
    </Box>
  );
};
