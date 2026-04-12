import React, { useState, useMemo } from "react";
import {
  Box,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  MenuItem,
  Typography,
  useTheme,
} from "@mui/material";
import { format } from "date-fns";
import { EventEditorProps, CalendarEvent } from "../types";

function toDatetimeLocal(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function toDateOnly(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export const EventEditor: React.FC<EventEditorProps> = ({
  event,
  calendars,
  start,
  end,
  isAllDay: initialAllDay = false,
  onSave,
  onCancel,
  onDelete,
  sx,
}) => {
  const theme = useTheme();
  const isNew = !event?.id;

  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [calendarId, setCalendarId] = useState(
    event?.calendarId || calendars?.[0]?.id || "",
  );
  const [allDay, setAllDay] = useState(event?.isAllDay ?? initialAllDay);
  const [startStr, setStartStr] = useState(
    allDay
      ? toDateOnly(event?.start || start || new Date())
      : toDatetimeLocal(event?.start || start || new Date()),
  );
  const [endStr, setEndStr] = useState(
    allDay
      ? toDateOnly(event?.end || end || new Date())
      : toDatetimeLocal(event?.end || end || new Date()),
  );

  const handleSave = () => {
    const s = allDay
      ? new Date(`${startStr}T00:00:00`)
      : new Date(startStr);
    const e = allDay
      ? new Date(`${endStr}T23:59:59`)
      : new Date(endStr);

    onSave?.({
      ...event,
      title,
      description: description || undefined,
      location: location || undefined,
      calendarId,
      isAllDay: allDay,
      start: s,
      end: e,
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 3,
        maxWidth: 480,
        ...sx,
      }}
    >
      <Typography variant="h6">
        {isNew ? "New Event" : "Edit Event"}
      </Typography>

      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        fullWidth
        required
      />

      <FormControlLabel
        control={
          <Switch
            checked={allDay}
            onChange={(e) => {
              setAllDay(e.target.checked);
              if (e.target.checked) {
                setStartStr(toDateOnly(new Date(startStr)));
                setEndStr(toDateOnly(new Date(endStr)));
              } else {
                setStartStr(toDatetimeLocal(new Date(startStr)));
                setEndStr(toDatetimeLocal(new Date(endStr)));
              }
            }}
          />
        }
        label="All day"
      />

      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          label="Start"
          type={allDay ? "date" : "datetime-local"}
          value={startStr}
          onChange={(e) => setStartStr(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End"
          type={allDay ? "date" : "datetime-local"}
          value={endStr}
          onChange={(e) => setEndStr(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <TextField
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        fullWidth
      />

      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        multiline
        rows={3}
      />

      {calendars && calendars.length > 1 && (
        <TextField
          label="Calendar"
          select
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          fullWidth
        >
          {calendars.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
        {!isNew && onDelete && (
          <Button
            color="error"
            onClick={() => onDelete(event as CalendarEvent)}
            sx={{ mr: "auto" }}
          >
            Delete
          </Button>
        )}
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!title.trim()}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
};
