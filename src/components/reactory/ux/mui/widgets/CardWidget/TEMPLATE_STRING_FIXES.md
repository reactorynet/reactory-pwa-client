# CardWidget Template String Fixes

## Overview
Fixed critical issues with template string processing in the CardWidget component to ensure dynamic content rendering works correctly with our dashboard implementations.

## Issues Identified and Fixed

### 1. **Action Label Template Processing** ❌➡️✅
**Problem**: Action labels with template strings weren't being processed
```typescript
// This wasn't working:
label: 'Active: ${formData?.activeInstances || 0}'
```

**Fix**: Added template processing for action labels:
```typescript
// Process label template string
if (typeof action.label === 'string' && action.label.indexOf('${') > -1) {
  try {
    processedAction.label = reactory.utils.template(action.label)(props);
  } catch (error) {
    console.warn('Failed to process action label template:', action.label, error);
    processedAction.label = action.label; // Fallback to original
  }
}
```

### 2. **String-based onClick Handler Support** ❌➡️✅
**Problem**: String onClick handlers like `'event:lifecycle:viewActive'` weren't being handled
```typescript
// This wasn't working:
onClick: 'event:lifecycle:viewActive'
onClick: 'mutation:pauseWorkflowSystem'
```

**Fix**: Added comprehensive string-based onClick handling:
```typescript
} else if (typeof action.onClick === 'string') {
  // Handle string-based onClick events
  if (action.onClick.startsWith('event:')) {
    // Dispatch reactory event
    const eventName = action.onClick.replace('event:', '');
    reactory.emit(eventName, { formData, schema, idSchema, uiSchema, action, event });
  } else if (action.onClick.startsWith('mutation:')) {
    // Handle GraphQL mutation by emitting a mutation event
    const mutationName = action.onClick.replace('mutation:', '');
    reactory.emit('mutation', { 
      mutationName,
      variables: formData,
      formData, schema, idSchema, uiSchema, action, event 
    });
  } else {
    // Generic event emission for other string patterns
    reactory.emit(action.onClick, { formData, schema, idSchema, uiSchema, action, event });
  }
```

### 3. **Action Subtitle Support** ❌➡️✅
**Problem**: Action subtitles were not supported
```typescript
// This wasn't working:
{
  label: '${formData?.recentActivity?.[0]?.event || "No recent activity"}',
  subtitle: '${formData?.recentActivity?.[0]?.workflowName ? formData.recentActivity[0].workflowName + " - " + formData.recentActivity[0].status : ""}'
}
```

**Fix**: Added subtitle template processing and rendering:
```typescript
// Process subtitle template string if present
if (typeof action.subtitle === 'string' && action.subtitle.indexOf('${') > -1) {
  try {
    processedAction.subtitle = reactory.utils.template(action.subtitle)(props);
  } catch (error) {
    console.warn('Failed to process action subtitle template:', action.subtitle, error);
    processedAction.subtitle = action.subtitle; // Fallback to original
  }
}
```

And updated the rendering:
```typescript
<Button>
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
    <Typography variant="button" component="span">
      {action.label}
    </Typography>
    {action.subtitle && (
      <Typography variant="caption" component="span" sx={{ textTransform: 'none', opacity: 0.7 }}>
        {action.subtitle}
      </Typography>
    )}
  </Box>
</Button>
```

### 4. **Enhanced Error Handling** ❌➡️✅
**Problem**: Template processing failures could break the component
**Fix**: Added comprehensive error handling with fallbacks:
```typescript
try {
  processedAction.label = reactory.utils.template(action.label)(props);
} catch (error) {
  console.warn('Failed to process action label template:', action.label, error);
  processedAction.label = action.label; // Fallback to original
}
```

## Template String Features Now Working

### ✅ **Dynamic Metrics Display**
```typescript
{
  label: 'Active: ${formData?.activeInstances || 0}',
  icon: 'play_circle',
  onClick: 'event:lifecycle:viewActive'
}
```

### ✅ **Conditional Visibility**
```typescript
{
  label: 'Failed: ${formData?.failedInstances || 0}',
  icon: 'error',
  onClick: 'event:lifecycle:viewFailed',
  visible: '${formData?.failedInstances > 0}'
}
```

### ✅ **Complex Template Expressions**
```typescript
{
  label: 'Avg Time: ${formData?.averageExecutionTime ? reactory.utils.moment.duration(formData.averageExecutionTime).humanize() : "N/A"}',
  icon: 'schedule',
  onClick: 'event:lifecycle:viewTiming'
}
```

### ✅ **Array Operations**
```typescript
{
  label: 'Critical: ${formData?.alerts?.filter(a => a.severity === "critical").length || 0}',
  icon: 'error',
  onClick: 'event:alerts:viewCritical',
  visible: '${formData?.alerts?.filter(a => a.severity === "critical").length > 0}'
}
```

### ✅ **Event System Integration**
- `event:category:action` - Dispatches reactory events
- `mutation:mutationName` - Triggers GraphQL mutations
- Generic string events - Emitted directly

## Benefits Achieved

1. **Dynamic Content**: All dashboard metrics now display real-time values
2. **Conditional Actions**: Actions appear/hide based on data state
3. **Event Integration**: Proper integration with reactory's event system
4. **Error Resilience**: Graceful handling of template processing failures
5. **Consistent Behavior**: Uniform template string support across all card instances

## Impact on Dashboards

### SystemDashboard ✅
- All CardWidget instances now properly render dynamic content
- Template strings like `'${formData?.status || "Unknown"}'` work correctly
- Event handlers like `'event:system:viewDetails'` are properly dispatched

### OperationsDashboard ✅  
- Converted MetricsCard, ActivityFeed, AlertsList all benefit from template fixes
- Complex expressions like moment formatting work properly
- Conditional visibility based on data state functions correctly

Both dashboards now have fully functional dynamic content with proper template string processing and event handling.
