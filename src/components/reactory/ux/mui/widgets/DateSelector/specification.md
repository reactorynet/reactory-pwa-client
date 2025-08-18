# Overview: Date Selector Component
The Date Selector widget is a comprehensive widget that can be used as part of the ReactoryForm widget stack for rendering dynamic forms based on JSONSchemaForm. It supports multiple date selection patterns and integrates seamlessly with the Reactory form engine.

# Features Required

## Core Requirements
1. Use the standard properties of `schema`, `uiSchema`, `idSchema`, `formData` and `formContext` for all decision inputs
2. Support multiple date selection patterns (single, range, multiple, multiple ranges)
3. Allow for style / sx properties to be passed from uiSchema
4. Proper integration with ReactoryForm validation and data flow
5. Support for both date-only and date-time precision
6. Responsive design that works across different screen sizes

## Date Selection Patterns

### 1. Single Date Selection
- **Schema Type**: `string` with `format: "date"`
- **Widget**: `DateWidget`
- **Features**:
  - Date picker with calendar interface
  - Configurable date format
  - Min/max date constraints
  - Disabled dates support
  - Clear button option

### 2. Single Date & Time Selection
- **Schema Type**: `string` with `format: "date-time"`
- **Widget**: `DateTimeWidget`
- **Features**:
  - Date picker with time picker
  - Configurable time precision (minutes, seconds)
  - 12/24 hour format options
  - Time zone handling
  - Relative time options (e.g., "now", "end of day")

### 3. Date Range Selection
- **Schema Type**: `object` with `periodStart` and `periodEnd` properties
- **Widget**: `DateRangeWidget`
- **Features**:
  - Start and end date pickers
  - Range validation (end > start)
  - Preset ranges (today, this week, this month, etc.)
  - Custom range input
  - Range duration display
  - Time precision options for both start and end

### 4. Multiple Single Date Selections
- **Schema Type**: `array` of `string` with `format: "date"`
- **Widget**: `MultipleDatesWidget`
- **Features**:
  - Multiple date pickers
  - Add/remove date functionality
  - Duplicate date prevention
  - Bulk date operations
  - Date sorting options

### 5. Multiple Date Range Selections
- **Schema Type**: `array` of objects with `periodStart` and `periodEnd`
- **Widget**: `MultipleDateRangesWidget`
- **Features**:
  - Multiple date range pickers
  - Add/remove range functionality
  - Range overlap detection
  - Range merging/splitting
  - Bulk range operations

## Schema Integration

### Single Date Schema
```typescript
{
  type: "string",
  title: "Select Date",
  format: "date",
  description: "Choose a date"
}
```

### Date-Time Schema
```typescript
{
  type: "string",
  title: "Select Date & Time",
  format: "date-time",
  description: "Choose a date and time"
}
```

### Date Range Schema
```typescript
{
  type: "object",
  title: "Select Date Range",
  properties: {
    periodStart: {
      type: "string",
      title: "Start Date",
      format: "date-time"
    },
    periodEnd: {
      type: "string",
      title: "End Date", 
      format: "date-time"
    }
  }
}
```

### Multiple Dates Schema
```typescript
{
  type: "array",
  title: "Select Multiple Dates",
  items: {
    type: "string",
    format: "date"
  }
}
```

### Multiple Date Ranges Schema
```typescript
{
  type: "array",
  title: "Select Multiple Date Ranges",
  items: {
    type: "object",
    properties: {
      periodStart: {
        type: "string",
        format: "date-time"
      },
      periodEnd: {
        type: "string",
        format: "date-time"
      }
    }
  }
}
```

## UI Schema Options

### Common Options
```typescript
{
  "ui:widget": "DateWidget", // or appropriate widget
  "ui:options": {
    // Display options
    showLabel: true,
    showDescription: true,
    placeholder: "Select date...",
    
    // Format options
    dateFormat: "YYYY-MM-DD",
    timeFormat: "HH:mm:ss",
    timePrecision: "minute", // "second", "minute", "hour"
    
    // Validation options
    minDate: "2020-01-01",
    maxDate: "2030-12-31",
    disabledDates: ["2023-12-25", "2024-01-01"],
    
    // UI options
    variant: "outlined", // "standard", "filled", "outlined"
    size: "medium", // "small", "medium", "large"
    fullWidth: true,
    
    // Style options
    sx: {
      marginBottom: 2,
      minWidth: 200
    }
  }
}
```

### Date Range Specific Options
```typescript
{
  "ui:options": {
    // Range options
    presetRanges: [
      { label: "Today", start: "startOf('day')", end: "endOf('day')" },
      { label: "This Week", start: "startOf('week')", end: "endOf('week')" },
      { label: "This Month", start: "startOf('month')", end: "endOf('month')" },
      { label: "Last 7 Days", start: "subtract(7, 'days')", end: "now" }
    ],
    
    // Validation options
    minRangeDuration: "1 day",
    maxRangeDuration: "1 year",
    allowOverlappingRanges: false,
    
    // Display options
    showDuration: true,
    showPresetRanges: true,
    showQuickActions: true
  }
}
```

### Multiple Dates/Ranges Options
```typescript
{
  "ui:options": {
    // Array options
    maxItems: 10,
    minItems: 1,
    
    // UI options
    showAddButton: true,
    showRemoveButton: true,
    allowDuplicates: false,
    
    // Bulk operations
    showBulkActions: true,
    bulkActions: ["sort", "clear", "export"]
  }
}
```

## Component Architecture

### Base Components
1. **BaseDateWidget**: Common functionality for all date widgets
2. **DatePicker**: Single date selection
3. **DateTimePicker**: Date and time selection
4. **DateRangePicker**: Date range selection
5. **MultipleDatesPicker**: Multiple date selection
6. **MultipleDateRangesPicker**: Multiple date range selection

### Widget Factory
The main `DateWidget` component will act as a factory that determines which specific widget to render based on the schema structure and uiSchema options.

### Integration Points
- **ReactoryForm**: Proper form data binding and validation
- **Validation Engine**: Schema validation and custom validation rules
- **Theme System**: Consistent styling with MUI theme
- **Internationalization**: Date format localization
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## Technical Implementation

### Dependencies
- `@mui/x-date-pickers` (v6+)
- `@mui/material` (v5+)
- `dayjs` (for date manipulation)
- `@reactory/client-core` (for Reactory integration)

### State Management
- Form data binding through ReactoryForm
- Local state for UI interactions
- Validation state management
- Error handling and display

### Performance Considerations
- Lazy loading of date picker components
- Debounced validation
- Efficient re-rendering strategies
- Memory management for large date arrays

## Testing Strategy

### Unit Tests
- Widget rendering with different schemas
- Date validation logic
- Format conversion functions
- Error handling scenarios

### Integration Tests
- ReactoryForm integration
- Schema validation flow
- Data binding and updates
- UI interaction patterns

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- ARIA label accuracy
- Color contrast compliance

## Migration Path

### From Current Implementation
1. Maintain backward compatibility with existing `DateWidget` usage
2. Gradual migration to new widget types
3. Deprecation warnings for old patterns
4. Documentation updates and examples

### Version Compatibility
- Support for both v5 and v6 MUI date pickers
- Backward compatibility with existing schemas
- Forward compatibility with new features