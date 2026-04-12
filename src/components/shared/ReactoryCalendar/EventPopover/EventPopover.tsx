import React from "react";
import {
  Popover,
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { format } from "date-fns";
import { EventPopoverProps } from "../types";

export const EventPopover: React.FC<EventPopoverProps> = ({
  event,
  anchorEl,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  sx,
}) => {
  const theme = useTheme();
  const open = Boolean(anchorEl);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{
        paper: { sx: { width: 320, maxWidth: "90vw", ...sx } },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          p: 2,
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: event.color || theme.palette.primary.main,
              flexShrink: 0,
              mt: 0.5,
            }}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {event.title}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Details */}
      <Box sx={{ px: 2, pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <AccessTimeIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {event.isAllDay
              ? format(event.start, "MMM d, yyyy")
              : `${format(event.start, "MMM d, yyyy h:mm a")} – ${format(event.end, "h:mm a")}`}
          </Typography>
        </Box>

        {event.location && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <LocationOnIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {event.location}
            </Typography>
          </Box>
        )}

        {event.description && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {event.description}
          </Typography>
        )}
      </Box>

      {/* Actions */}
      {(onEdit || onDelete || onDuplicate) && (
        <>
          <Divider />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, p: 1 }}>
            {onDuplicate && (
              <IconButton
                size="small"
                onClick={() => onDuplicate(event)}
                aria-label="Duplicate event"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                size="small"
                onClick={() => onDelete(event)}
                aria-label="Delete event"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            {onEdit && (
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => onEdit(event)}
              >
                Edit
              </Button>
            )}
          </Box>
        </>
      )}
    </Popover>
  );
};
