import React, { useCallback } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { format, isToday as dateIsToday } from "date-fns";
import { DayColumnHeaderProps } from "../types";
import { DAY_NAME_SHORT, DATE_FORMAT_SHORT } from "../constants";

export const DayColumnHeader: React.FC<DayColumnHeaderProps> = ({
  date,
  isToday,
  format: dateFormat,
  showDayName = true,
  showDate = true,
  onClick,
  sx,
}) => {
  const theme = useTheme();
  const today = isToday ?? dateIsToday(date);

  const handleClick = useCallback(() => {
    onClick?.(date);
  }, [onClick, date]);

  return (
    <Box
      role="columnheader"
      aria-label={format(date, "EEEE, MMMM d")}
      onClick={handleClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 0.5,
        px: 1,
        cursor: onClick ? "pointer" : "default",
        borderBottom: `1px solid ${theme.palette.divider}`,
        ...sx,
      }}
    >
      {showDayName && (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 500,
            color: today ? theme.palette.primary.main : theme.palette.text.secondary,
            textTransform: "uppercase",
            fontSize: "0.7rem",
          }}
        >
          {format(date, DAY_NAME_SHORT)}
        </Typography>
      )}
      {showDate && (
        <Typography
          variant="h6"
          sx={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            fontWeight: today ? 700 : 400,
            fontSize: "1rem",
            color: today
              ? theme.palette.primary.contrastText
              : theme.palette.text.primary,
            backgroundColor: today ? theme.palette.primary.main : "transparent",
          }}
        >
          {dateFormat ? format(date, dateFormat) : date.getDate()}
        </Typography>
      )}
    </Box>
  );
};
