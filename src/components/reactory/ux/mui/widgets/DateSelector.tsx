import * as React from 'react';
import { Dayjs } from 'dayjs';
import TextField from '@mui/material/TextField';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export function DateWidget({ formData, onChange }) {

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <p>sdfsdaf</p>
      <DatePicker
        label="Basic example"
        value={formData}
        onChange={(newValue) => {
          onChange(newValue)
        }}
        renderInput={(params) => <TextField {...params} />}
      />
    </LocalizationProvider>
  );
}
