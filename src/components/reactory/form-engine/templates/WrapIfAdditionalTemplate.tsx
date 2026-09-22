import * as React from 'react';
import { Box, Icon, IconButton, TextField } from '@mui/material';
import type { WrapIfAdditionalTemplateProps } from '@rjsf/utils';
import { ADDITIONAL_PROPERTY_FLAG } from '@rjsf/utils';

export function ReactoryWrapIfAdditionalTemplate(
  props: WrapIfAdditionalTemplateProps,
): React.ReactElement {
  const {
    children,
    style,
    label,
    disabled,
    readonly,
    onKeyChange,
    onDropPropertyClick,
    schema,
  } = props;

  if (!(ADDITIONAL_PROPERTY_FLAG in (schema as Record<string, unknown>))) {
    return <>{children}</>;
  }

  return (
    <Box
      className="wrap-if-additional"
      style={style as React.CSSProperties}
      data-key={label}
      sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%', mb: 1 }}
    >
      <TextField
        size="small"
        variant="outlined"
        defaultValue={label}
        onBlur={(event) => onKeyChange(event.target.value)}
        disabled={readonly || disabled}
        inputProps={{ 'aria-label': 'Property key' }}
        sx={{ maxWidth: 240 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <IconButton
        type="button"
        size="small"
        onClick={onDropPropertyClick(label)}
        disabled={readonly || disabled}
        aria-label="Remove"
        sx={{ mt: 0.25 }}
      >
        <Icon>close</Icon>
      </IconButton>
    </Box>
  );
}

export default ReactoryWrapIfAdditionalTemplate;
