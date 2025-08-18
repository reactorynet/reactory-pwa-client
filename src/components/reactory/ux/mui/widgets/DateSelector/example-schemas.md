# DateSelector Widget Example Schemas

This document provides comprehensive examples of how to use the DateSelector widget for all supported date selection patterns.

## 1. Single Date Selection

### Basic Single Date
```typescript
const singleDateSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    eventDate: {
      type: 'string',
      title: 'Event Date',
      description: 'Select the date for the event',
      format: 'date'
    }
  }
};

const singleDateUISchema: Reactory.Schema.IUISchema = {
  eventDate: {
    'ui:widget': 'DateWidget',
    'ui:options': {
      showLabel: true,
      showDescription: true,
      placeholder: 'Select event date...',
      dateFormat: 'YYYY-MM-DD',
      minDate: '2024-01-01',
      maxDate: '2025-12-31',
      disabledDates: ['2024-12-25', '2025-01-01'],
      sx: {
        minWidth: 250,
        marginBottom: 2
      }
    }
  }
};
```

### Single Date with Custom Format
```typescript
const customDateSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    birthDate: {
      type: 'string',
      title: 'Birth Date',
      description: 'Enter your date of birth',
      format: 'date'
    }
  }
};

const customDateUISchema: Reactory.Schema.IUISchema = {
  birthDate: {
    'ui:widget': 'DateWidget',
    'ui:options': {
      dateFormat: 'MM/DD/YYYY',
      placeholder: 'MM/DD/YYYY',
      maxDate: 'now',
      showClearButton: true,
      sx: {
        width: '100%',
        maxWidth: 300
      }
    }
  }
};
```

## 2. Single Date & Time Selection

### Basic Date-Time
```typescript
const dateTimeSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    meetingTime: {
      type: 'string',
      title: 'Meeting Time',
      description: 'Select the date and time for the meeting',
      format: 'date-time'
    }
  }
};

const dateTimeUISchema: Reactory.Schema.IUISchema = {
  meetingTime: {
    'ui:widget': 'DateWidget',
    'ui:options': {
      showLabel: true,
      showDescription: true,
      placeholder: 'Select meeting date and time...',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm',
      timePrecision: 'minute',
      hourFormat: '24', // or '12'
      showRelativeTime: true,
      relativeTimeOptions: ['now', 'endOfDay', 'startOfDay'],
      sx: {
        minWidth: 300,
        marginBottom: 2
      }
    }
  }
};
```

### Date-Time with Seconds Precision
```typescript
const preciseDateTimeSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    timestamp: {
      type: 'string',
      title: 'Precise Timestamp',
      description: 'Select date and time with second precision',
      format: 'date-time'
    }
  }
};

const preciseDateTimeUISchema: Reactory.Schema.IUISchema = {
  timestamp: {
    'ui:widget': 'DateWidget',
    'ui:options': {
      timePrecision: 'second',
      timeFormat: 'HH:mm:ss',
      showTimeZone: true,
      defaultTimeZone: 'UTC',
      sx: {
        minWidth: 350
      }
    }
  }
};
```

## 3. Date Range Selection

### Basic Date Range
```typescript
const dateRangeSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    period: {
      type: 'object',
      title: 'Select Period',
      description: 'Choose the start and end dates for the period',
      properties: {
        periodStart: {
          type: 'string',
          title: 'Start Date',
          format: 'date-time'
        },
        periodEnd: {
          type: 'string',
          title: 'End Date',
          format: 'date-time'
        }
      }
    }
  }
};

const dateRangeUISchema: Reactory.Schema.IUISchema = {
  period: {
    'ui:widget': 'GridLayout',
    'ui:options': {
      container: 'Paper',
      containerProps: {
        elevation: 0,
        variant: 'outlined',
        sx: { padding: 2, marginBottom: 2 }
      }
    },
    'ui:grid-layout': [
      {
        periodStart: { xs: 6, sm: 6, md: 6, lg: 6, xl: 6 },
        periodEnd: { xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }
      }
    ],
    periodStart: {
      'ui:widget': 'DateWidget',
      'ui:options': {
        showLabel: true,
        placeholder: 'Start date...',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        timePrecision: 'minute',
        sx: { marginRight: 1 }
      }
    },
    periodEnd: {
      'ui:widget': 'DateWidget',
      'ui:options': {
        showLabel: true,
        placeholder: 'End date...',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        timePrecision: 'minute',
        sx: { marginLeft: 1 }
      }
    }
  }
};
```

### Date Range with Presets
```typescript
const dateRangeWithPresetsSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    reportingPeriod: {
      type: 'object',
      title: 'Reporting Period',
      properties: {
        periodStart: {
          type: 'string',
          title: 'Start Date',
          format: 'date-time'
        },
        periodEnd: {
          type: 'string',
          title: 'End Date',
          format: 'date-time'
        }
      }
    }
  }
};

const dateRangeWithPresetsUISchema: Reactory.Schema.IUISchema = {
  reportingPeriod: {
    'ui:widget': 'DateRangeWidget',
    'ui:options': {
      showPresetRanges: true,
      presetRanges: [
        { label: 'Today', start: 'startOf("day")', end: 'endOf("day")' },
        { label: 'This Week', start: 'startOf("week")', end: 'endOf("week")' },
        { label: 'This Month', start: 'startOf("month")', end: 'endOf("month")' },
        { label: 'Last 7 Days', start: 'subtract(7, "days")', end: 'now' },
        { label: 'Last 30 Days', start: 'subtract(30, "days")', end: 'now' },
        { label: 'This Quarter', start: 'startOf("quarter")', end: 'endOf("quarter")' },
        { label: 'This Year', start: 'startOf("year")', end: 'endOf("year")' }
      ],
      showDuration: true,
      showQuickActions: true,
      minRangeDuration: '1 day',
      maxRangeDuration: '1 year',
      sx: {
        minWidth: 600,
        marginBottom: 3
      }
    }
  }
};
```

## 4. Multiple Single Date Selections

### Multiple Dates Array
```typescript
const multipleDatesSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    eventDates: {
      type: 'array',
      title: 'Event Dates',
      description: 'Select multiple dates for recurring events',
      items: {
        type: 'string',
        format: 'date'
      },
      minItems: 1,
      maxItems: 10
    }
  }
};

const multipleDatesUISchema: Reactory.Schema.IUISchema = {
  eventDates: {
    'ui:widget': 'MultipleDatesWidget',
    'ui:options': {
      showLabel: true,
      showDescription: true,
      placeholder: 'Select event dates...',
      dateFormat: 'YYYY-MM-DD',
      maxItems: 10,
      minItems: 1,
      showAddButton: true,
      showRemoveButton: true,
      allowDuplicates: false,
      showBulkActions: true,
      bulkActions: ['sort', 'clear', 'export'],
      sx: {
        minWidth: 400,
        marginBottom: 2
      }
    }
  }
};
```

### Multiple Dates with Constraints
```typescript
const constrainedMultipleDatesSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    availableDates: {
      type: 'array',
      title: 'Available Dates',
      description: 'Select dates when you are available',
      items: {
        type: 'string',
        format: 'date'
      }
    }
  }
};

const constrainedMultipleDatesUISchema: Reactory.Schema.IUISchema = {
  availableDates: {
    'ui:widget': 'MultipleDatesWidget',
    'ui:options': {
      minDate: 'today',
      maxDate: 'add(6, "months")',
      disabledDates: ['weekends'], // Disable weekends
      maxItems: 20,
      showSorting: true,
      defaultSort: 'asc',
      sx: {
        minWidth: 450
      }
    }
  }
};
```

## 5. Multiple Date Range Selections

### Multiple Date Ranges
```typescript
const multipleDateRangesSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    vacationPeriods: {
      type: 'array',
      title: 'Vacation Periods',
      description: 'Select multiple vacation periods',
      items: {
        type: 'object',
        properties: {
          periodStart: {
            type: 'string',
            title: 'Start Date',
            format: 'date-time'
          },
          periodEnd: {
            type: 'string',
            title: 'End Date',
            format: 'date-time'
          }
        }
      }
    }
  }
};

const multipleDateRangesUISchema: Reactory.Schema.IUISchema = {
  vacationPeriods: {
    'ui:widget': 'MultipleDateRangesWidget',
    'ui:options': {
      showLabel: true,
      showDescription: true,
      maxItems: 5,
      minItems: 1,
      showAddButton: true,
      showRemoveButton: true,
      allowOverlappingRanges: false,
      showOverlapWarning: true,
      showDuration: true,
      showPresetRanges: true,
      presetRanges: [
        { label: '1 Day', start: 'startOf("day")', end: 'endOf("day")' },
        { label: '3 Days', start: 'startOf("day")', end: 'add(2, "days")' },
        { label: '1 Week', start: 'startOf("day")', end: 'add(6, "days")' }
      ],
      showBulkActions: true,
      bulkActions: ['sort', 'merge', 'clear', 'export'],
      sx: {
        minWidth: 700,
        marginBottom: 3
      }
    }
  }
};
```

### Complex Multiple Date Ranges
```typescript
const complexMultipleDateRangesSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    projectPhases: {
      type: 'array',
      title: 'Project Phases',
      description: 'Define multiple project phases with dates',
      items: {
        type: 'object',
        properties: {
          phaseName: {
            type: 'string',
            title: 'Phase Name'
          },
          periodStart: {
            type: 'string',
            title: 'Start Date',
            format: 'date-time'
          },
          periodEnd: {
            type: 'string',
            title: 'End Date',
            format: 'date-time'
          },
          phaseType: {
            type: 'string',
            title: 'Phase Type',
            enum: ['planning', 'development', 'testing', 'deployment']
          }
        }
      }
    }
  }
};

const complexMultipleDateRangesUISchema: Reactory.Schema.IUISchema = {
  projectPhases: {
    'ui:widget': 'MultipleDateRangesWidget',
    'ui:options': {
      showLabel: true,
      showDescription: true,
      maxItems: 10,
      minItems: 1,
      showAddButton: true,
      showRemoveButton: true,
      allowOverlappingRanges: false,
      showOverlapWarning: true,
      showDuration: true,
      showPhaseType: true,
      phaseTypeOptions: ['planning', 'development', 'testing', 'deployment'],
      showGanttView: true,
      showTimeline: true,
      showBulkActions: true,
      bulkActions: ['sort', 'merge', 'split', 'clear', 'export'],
      validationRules: {
        minPhaseDuration: '1 day',
        maxPhaseDuration: '6 months',
        requirePhaseType: true
      },
      sx: {
        minWidth: 800,
        marginBottom: 3
      }
    }
  }
};
```

## Advanced Configuration Examples

### Conditional Date Widgets
```typescript
const conditionalDateSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    eventType: {
      type: 'string',
      title: 'Event Type',
      enum: ['single', 'recurring', 'range']
    },
    singleDate: {
      type: 'string',
      title: 'Event Date',
      format: 'date'
    },
    recurringDates: {
      type: 'array',
      title: 'Recurring Dates',
      items: { type: 'string', format: 'date' }
    },
    dateRange: {
      type: 'object',
      properties: {
        periodStart: { type: 'string', format: 'date-time' },
        periodEnd: { type: 'string', format: 'date-time' }
      }
    }
  }
};

const conditionalDateUISchema: Reactory.Schema.IUISchema = {
  eventType: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      placeholder: 'Select event type...'
    }
  },
  singleDate: {
    'ui:widget': 'DateWidget',
    'ui:options': {
      showWhen: 'eventType === "single"',
      sx: { marginBottom: 2 }
    }
  },
  recurringDates: {
    'ui:widget': 'MultipleDatesWidget',
    'ui:options': {
      showWhen: 'eventType === "recurring"',
      sx: { marginBottom: 2 }
    }
  },
  dateRange: {
    'ui:widget': 'DateRangeWidget',
    'ui:options': {
      showWhen: 'eventType === "range"',
      sx: { marginBottom: 2 }
    }
  }
};
```

### Localized Date Widgets
```typescript
const localizedDateSchema: Reactory.Schema.ISchema = {
  type: 'object',
  properties: {
    localDate: {
      type: 'string',
      title: 'Local Date',
      format: 'date'
    }
  }
};

const localizedDateUISchema: Reactory.Schema.IUISchema = {
  localDate: {
    'ui:widget': 'DateWidget',
    'ui:options': {
      locale: 'en-US', // or 'de-DE', 'fr-FR', etc.
      dateFormat: 'L', // Localized format
      timeFormat: 'LT', // Localized time format
      showLocaleSelector: true,
      availableLocales: ['en-US', 'de-DE', 'fr-FR', 'es-ES'],
      sx: {
        minWidth: 300
      }
    }
  }
};
```

## Integration with Existing Forms

### Leaderboards Form Integration
```typescript
// Updated period schema for the existing LeaderboardsHome form
const updatedPeriodSchema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Select Period',
  properties: {
    periodStart: {
      type: 'string',
      title: 'Period Start',
      description: 'The start date of the period',
      format: 'date-time'
    },
    periodEnd: {
      type: 'string',
      title: 'Period End',
      description: 'The end date of the period',
      format: 'date-time'
    }
  }
};

const updatedPeriodUISchema: Reactory.Schema.IUISchema = {
  period: {
    'ui:widget': 'DateRangeWidget',
    'ui:options': {
      showPresetRanges: true,
      presetRanges: [
        { label: 'Today', start: 'startOf("day")', end: 'endOf("day")' },
        { label: 'This Week', start: 'startOf("week")', end: 'endOf("week")' },
        { label: 'This Month', start: 'startOf("month")', end: 'endOf("month")' },
        { label: 'Last 7 Days', start: 'subtract(7, "days")', end: 'now' },
        { label: 'Last 30 Days', start: 'subtract(30, "days")', end: 'now' }
      ],
      showDuration: true,
      showQuickActions: true,
      minRangeDuration: '1 day',
      maxRangeDuration: '1 year',
      sx: {
        minWidth: 600,
        marginBottom: 2
      }
    }
  }
};
```

## Best Practices

### Schema Design
1. **Use appropriate formats**: `date` for date-only, `date-time` for date+time
2. **Provide clear titles and descriptions**: Help users understand what to select
3. **Set reasonable constraints**: Min/max dates, array limits, etc.
4. **Consider validation rules**: Range validation, overlap prevention, etc.

### UI Schema Configuration
1. **Choose the right widget**: Match the widget to your schema structure
2. **Configure presets**: Provide common options for better UX
3. **Set appropriate styling**: Use sx props for consistent theming
4. **Enable helpful features**: Duration display, quick actions, etc.

### Performance Considerations
1. **Limit array sizes**: Set reasonable maxItems for multiple selections
2. **Use lazy loading**: For large date arrays
3. **Optimize validation**: Debounce validation calls
4. **Cache results**: For expensive date calculations

### Accessibility
1. **Provide clear labels**: Use descriptive titles and descriptions
2. **Support keyboard navigation**: Ensure all interactions work with keyboard
3. **Include ARIA attributes**: Proper screen reader support
4. **Test with assistive technology**: Verify accessibility compliance
