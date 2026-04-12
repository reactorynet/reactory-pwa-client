import React from "react";
import {
  Box,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { CalendarListProps } from "../types";

export const CalendarList: React.FC<CalendarListProps> = ({
  calendars,
  onToggle,
  onColorChange,
  onEdit,
  onDelete,
  sx,
}) => {
  const theme = useTheme();

  return (
    <List dense disablePadding sx={sx}>
      {calendars.map((cal) => (
        <ListItem
          key={cal.id}
          disablePadding
          secondaryAction={
            onEdit ? (
              <IconButton
                edge="end"
                size="small"
                onClick={() => onEdit(cal.id)}
                aria-label={`Edit ${cal.name}`}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            ) : undefined
          }
        >
          <ListItemButton
            dense
            onClick={() => onToggle?.(cal.id, !cal.visible)}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Checkbox
                edge="start"
                checked={cal.visible !== false}
                tabIndex={-1}
                disableRipple
                sx={{
                  color: cal.color || theme.palette.primary.main,
                  "&.Mui-checked": {
                    color: cal.color || theme.palette.primary.main,
                  },
                }}
              />
            </ListItemIcon>
            <ListItemText primary={cal.name} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};
