import React from "react";
import {
  Box,
  IconButton,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  useTheme,
} from "@mui/material";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import { CalendarToolbarProps, CalendarViewType } from "../types";
import { ALL_VIEWS, VIEW_LABELS, TOOLBAR_HEIGHT } from "../constants";
import { navigateDate } from "../utils/dateUtils";

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  date,
  view,
  views = ALL_VIEWS,
  title,
  onDateChange,
  onViewChange,
  onTodayClick,
  renderCustomActions,
  sx,
}) => {
  const theme = useTheme();

  return (
    <Box
      role="toolbar"
      aria-label="Calendar toolbar"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        height: TOOLBAR_HEIGHT,
        borderBottom: `1px solid ${theme.palette.divider}`,
        flexShrink: 0,
        ...sx,
      }}
    >
      {/* Left: navigation */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={onTodayClick}
          startIcon={<TodayIcon />}
        >
          Today
        </Button>
        <IconButton
          size="small"
          aria-label="Previous"
          onClick={() => onDateChange?.(navigateDate(date, view, "back"))}
        >
          <ChevronLeft />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Next"
          onClick={() => onDateChange?.(navigateDate(date, view, "forward"))}
        >
          <ChevronRight />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1, fontWeight: 500 }}>
          {title || ""}
        </Typography>
      </Box>

      {/* Right: view switcher + custom actions */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {renderCustomActions?.()}
        <ToggleButtonGroup
          value={view}
          exclusive
          size="small"
          onChange={(_, v) => {
            if (v) onViewChange?.(v as CalendarViewType);
          }}
          aria-label="Calendar view"
        >
          {views.map((v) => (
            <ToggleButton key={v} value={v}>
              {VIEW_LABELS[v]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
};
