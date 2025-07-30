import React from 'react'
import {
  FormControlLabel,
  Switch,
  Typography,
  Box,
  FormControl,
  FormLabel,
} from '@mui/material'
import Icon from '@mui/material/Icon';
import { get } from 'lodash';

const nilf = (e) => {}

export default (props) => {
  const {
    autofocus,
    disabled,
    errorSchema,
    formContext,
    formData,
    idPrefix,
    idSchema,
    name,
    title,
    onBlur,
    onChange,
    onFocus,
    rawErrors,
    readOnly,
    registry,
    required,
    schema,
    uiSchema,
    hidden
  } = props;

  const options = uiSchema?.['ui:options'] || {};
  const isReadOnly = options.readonly || readOnly;
  const showLabels = options.showLabels !== false; // default true
  const yesLabel = options.yesLabel || 'Yes';
  const noLabel = options.noLabel || 'No';
  const yesIcon = options.yesIcon;
  const noIcon = options.noIcon;
  const yesIconOptions = options.yesIconOptions || {};
  const noIconOptions = options.noIconOptions || {};


  if (uiSchema["ui:widget"]) {
    const Widget = registry.widgets[uiSchema["ui:widget"]]      
    if (Widget) return (<Widget {...props} />)
  }

  if(uiSchema && uiSchema.hidden) {
    return (<input type="hidden" value={formData} />)
  }

  // Helper to render icon if provided
  const renderIcon = (icon, iconOptions) => {
    if (!icon) return null;
    return (
      <Icon sx={iconOptions.sx} color={iconOptions.color} style={{ color: iconOptions.color, fontSize: iconOptions.fontSize }}>{icon}</Icon>
    );
  };

  // Compose label with icon and text
  const getLabel = (checked) => {
    const icon = checked ? yesIcon : noIcon;
    const iconOptions = checked ? yesIconOptions : noIconOptions;
    const label = checked ? yesLabel : noLabel;
    if (!showLabels && !icon) return null;
    return (
      <Box display="flex" alignItems="center" gap={1}>
        {icon && renderIcon(icon, iconOptions)}
        {showLabels && <Typography component="span">{label}</Typography>}
      </Box>
    );
  };

  const toggleSwitch = ( evt, checked ) => {
    if(onChange) onChange(checked === true)
  }

  // Only show the switch if not readonly
  if (!isReadOnly) {
    return (
      <FormControl>
        <FormLabel>{title}</FormLabel>
        <FormControlLabel
          control={
            <Switch
              checked={formData === true}
              onChange={toggleSwitch}
              value={name}
              autoFocus={autofocus}
              disabled={disabled}
            />
          }
          label={getLabel(formData)}
        />
      </FormControl>
    );
  }

  // Readonly: just show the label and icon
  return (
    <FormControl>
      <FormLabel>{title}</FormLabel>
      {getLabel(formData)}          
    </FormControl>
  );
};


