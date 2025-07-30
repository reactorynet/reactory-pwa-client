import * as React from 'react';
import { Dayjs } from 'dayjs';
import TextField from '@mui/material/TextField';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export function DateWidget({ formData, onChange, schema, idSchema, uiSchema, ...props }) {

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>      
      <DatePicker
        label={schema?.title || idSchema?.title}
        value={formData}
        onChange={(newValue) => {
          onChange(newValue)
        }}
        renderInput={(params) => <TextField {...params} />}
      />
    </LocalizationProvider>
  );
}
