import { useReactory } from "@reactory/client-core/api";
import { PropertyFieldProps } from '../../types';

export default function PropertyField(props: PropertyFieldProps) {
  const {
    property,
    validation,
    readonly,
    onChange
  } = props;

  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useCallback: useCallbackReact, useMemo: useMemoReact } = React;

  // Handle value changes
  const handleChange = useCallbackReact((event: React.ChangeEvent<HTMLInputElement>) => {
    if (readonly) return;

    let value: any = event.target.value;

    // Type conversion based on property type
    switch (property.type) {
      case 'number':
        value = value === '' ? '' : Number(value);
        break;
      case 'boolean':
        value = event.target.checked;
        break;
      case 'json':
        try {
          value = value === '' ? {} : JSON.parse(value);
        } catch (e) {
          // Keep as string if invalid JSON
          value = event.target.value;
        }
        break;
      default:
        // Keep as string
        break;
    }

    onChange(value);
  }, [readonly, property.type, onChange]);

  // Handle select changes
  const handleSelectChange = useCallbackReact((event: any) => {
    if (readonly) return;
    onChange(event.target.value);
  }, [readonly, onChange]);

  // Get display value
  const displayValue = useMemoReact(() => {
    if (property.type === 'json' && typeof property.value === 'object') {
      return JSON.stringify(property.value, null, 2);
    }
    return property.value?.toString() || '';
  }, [property.value, property.type]);

  // Get error/warning state
  const hasError = validation.hasError;
  const hasWarning = validation.hasWarning && !hasError;
  const helperText = validation.errorMessage || validation.warningMessage || property.description;

  const {
    Box,
    TextField,
    FormControl,
    FormControlLabel,
    Switch,
    Select,
    MenuItem,
    InputLabel,
    Typography,
    Tooltip
  } = Material.MaterialCore;

  const {
    Error,
    Warning,
    Info
  } = Material.MaterialIcons;

  // Render different field types
  const renderField = () => {
    switch (property.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(property.value)}
                onChange={handleChange}
                disabled={readonly}
                color={hasError ? "error" : hasWarning ? "warning" : "primary"}
              />
            }
            label={property.label}
            sx={{ mb: 1 }}
          />
        );

      case 'select':
        return (
          <FormControl 
            fullWidth 
            size="small"
            error={hasError}
            disabled={readonly}
          >
            <InputLabel>{property.label}</InputLabel>
            <Select
              value={property.value || ''}
              onChange={handleSelectChange}
              label={property.label}
            >
              {property.options?.map((option: any) => (
                <MenuItem key={option.value || option} value={option.value || option}>
                  {option.label || option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'json':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            size="small"
            label={property.label}
            value={displayValue}
            onChange={handleChange}
            disabled={readonly}
            required={property.required}
            error={hasError}
            color={hasWarning ? "warning" : "primary"}
            helperText={helperText}
            InputProps={{
              sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label={property.label}
            value={displayValue}
            onChange={handleChange}
            disabled={readonly}
            required={property.required}
            error={hasError}
            color={hasWarning ? "warning" : "primary"}
            helperText={helperText}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            size="small"
            label={property.label}
            value={displayValue}
            onChange={handleChange}
            disabled={readonly}
            required={property.required}
            error={hasError}
            color={hasWarning ? "warning" : "primary"}
            helperText={helperText}
          />
        );

      default: // 'text'
        return (
          <TextField
            fullWidth
            size="small"
            label={property.label}
            value={displayValue}
            onChange={handleChange}
            disabled={readonly}
            required={property.required}
            error={hasError}
            color={hasWarning ? "warning" : "primary"}
            helperText={helperText}
          />
        );
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Field Label with Status Icons */}
      {property.type !== 'boolean' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: property.required ? 'bold' : 'normal',
              color: hasError ? 'error.main' : hasWarning ? 'warning.main' : 'text.primary'
            }}
          >
            {property.label}
            {property.required && ' *'}
          </Typography>
          
          {hasError && (
            <Tooltip title={validation.errorMessage}>
              <Error sx={{ fontSize: 16, color: 'error.main' }} />
            </Tooltip>
          )}
          
          {hasWarning && (
            <Tooltip title={validation.warningMessage}>
              <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
            </Tooltip>
          )}
          
          {property.description && !hasError && !hasWarning && (
            <Tooltip title={property.description}>
              <Info sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Tooltip>
          )}
        </Box>
      )}

      {/* Field Input */}
      {renderField()}

      {/* Additional Help Text for Boolean Fields */}
      {property.type === 'boolean' && helperText && (
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            mt: 0.5, 
            color: hasError ? 'error.main' : hasWarning ? 'warning.main' : 'text.secondary'
          }}
        >
          {helperText}
        </Typography>
      )}

      {/* Validation Status Indicator */}
      {(hasError || hasWarning) && property.type !== 'boolean' && (
        <Box
          sx={{
            position: 'absolute',
            right: 8,
            top: property.type === 'json' || property.type === 'textarea' ? 8 : 20,
            zIndex: 1
          }}
        >
          {hasError ? (
            <Error sx={{ fontSize: 20, color: 'error.main' }} />
          ) : (
            <Warning sx={{ fontSize: 20, color: 'warning.main' }} />
          )}
        </Box>
      )}
    </Box>
  );
}
