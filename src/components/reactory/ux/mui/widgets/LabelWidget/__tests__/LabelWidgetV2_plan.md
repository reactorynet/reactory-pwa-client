# Test Plan for LabelWidgetV2

## Overview
Tests for the refactored LabelWidget component that provides a versatile label/display widget for ReactoryForm.

## Test Scenarios

### Basic Rendering
- [ ] Renders with default props
- [ ] Renders with formData as string
- [ ] Renders with formData as number
- [ ] Renders with empty/null formData shows emptyText
- [ ] Renders with custom className

### Text Formatting
- [ ] Formats text using lodash template
- [ ] Handles template errors gracefully
- [ ] Uses custom emptyText when value is null/undefined
- [ ] Supports custom $format function

### Boolean Display
- [ ] Renders boolean true with yesLabel
- [ ] Renders boolean false with noLabel
- [ ] Renders boolean with custom icons
- [ ] Applies correct icon options for boolean states

### Icon Rendering
- [ ] Renders icon on the left position
- [ ] Renders icon on the right position
- [ ] Renders icon inline with text
- [ ] Handles dynamic icon names from templates
- [ ] Applies iconSx styling

### Copy to Clipboard
- [ ] Shows copy button when copyToClipboard is true
- [ ] Does not show copy button when copyToClipboard is false
- [ ] Calls clipboard API on copy button click
- [ ] Shows notification after successful copy

### Styling
- [ ] Applies legacy containerProps.style
- [ ] Applies modern containerSx
- [ ] Merges legacy and modern styles (sx takes precedence)
- [ ] Applies valueSx to label body
- [ ] Applies copyButtonSx to copy button

### GraphQL Lookup
- [ ] Shows loading indicator during lookup
- [ ] Displays lookup result value
- [ ] Shows error alert on lookup failure

### Dynamic Component (componentFqn)
- [ ] Delegates to DynamicWidget when componentFqn is set
- [ ] Passes componentProps to DynamicWidget
- [ ] Passes componentPropsMap to DynamicWidget

### Accessibility
- [ ] Has role="text" attribute
- [ ] Has aria-label with label text
- [ ] Loading indicator has aria-live="polite"

## Coverage Targets
- Target: 80% minimum
- Current: [To be filled after test execution]

## Test Results
- [ ] All tests passing
- [ ] Coverage target met
- [ ] Plan updated with results

## Dependencies to Mock
- `useReactory` hook
- `useTheme` hook
- GraphQL query execution
- Clipboard API
- DynamicWidget component
