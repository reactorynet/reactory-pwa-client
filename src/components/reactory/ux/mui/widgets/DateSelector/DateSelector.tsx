import * as React from 'react';
import { Dayjs } from 'dayjs';
import TextField from '@mui/material/TextField';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { SxProps, Theme } from '@mui/material';
import moment from 'moment';

// TypeScript interfaces for better type safety
interface DateWidgetProps {
  formData?: any;
  onChange: (value: any) => void;
  schema?: any;
  idSchema?: any;
  uiSchema?: any;
  [key: string]: any;
}

export function DateWidget({ 
  formData, 
  onChange, 
  schema, 
  idSchema, 
  uiSchema, 
  ...props 
}: DateWidgetProps) {
  
  // Extract uiSchema options
  const uiOptions = uiSchema?.['ui:options'] || {};
  
  // Get label from schema or uiSchema
  const label = uiOptions.label || schema?.title || idSchema?.title;
  
  // Get placeholder from uiSchema options
  const placeholder = uiOptions.placeholder || 'Select date...';
  
  // Get date format from uiSchema or default
  const dateFormat = uiOptions.dateFormat || 'YYYY-MM-DD';
  
  // Get styling from uiSchema
  const sx: SxProps<Theme> = uiOptions.sx || {};
  
  // Get validation constraints
  const minDate = uiOptions.minDate;
  const maxDate = uiOptions.maxDate;
  const disabledDates = uiOptions.disabledDates || [];

  return (        
      <DatePicker
        label={label}
        value={formData ? moment(formData) : null}
        onChange={(newValue) => {
          // the value will be a moment object, so we need to convert it to a string
          const dateStr = newValue.format('YYYY-MM-DD');
          onChange(dateStr);
        }}        
        // Additional date picker options
        format={dateFormat}
        // Add validation constraints if provided
        {...(minDate && { minDate })}
        {...(maxDate && { maxDate })}
        // Add disabled dates if provided
        {...(disabledDates.length > 0 && { 
          shouldDisableDate: (date: any) => {
            if (!date) return false;
            const dateStr = date.format('YYYY-MM-DD');
            return disabledDates.includes(dateStr);
          }
        })}
        sx={sx}
      />    
  );
}
