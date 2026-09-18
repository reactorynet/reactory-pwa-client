import * as React from 'react';
import { Alert, AlertTitle, Box, Typography } from '@mui/material';
import type { UnsupportedFieldProps } from '@rjsf/utils';

export function ReactoryUnsupportedFieldTemplate(props: UnsupportedFieldProps): React.ReactElement {
  const { schema, idSchema, reason } = props;

  return (
    <Alert
      severity="warning"
      role="alert"
      className="unsupported-field"
      data-field-id={idSchema?.$id}
      sx={{ mb: 2 }}
    >
      <AlertTitle>Unsupported field</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {reason || 'No matching field component for this schema.'}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1,
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontSize: 12,
          overflowX: 'auto',
        }}
      >
        {JSON.stringify(schema, null, 2)}
      </Box>
    </Alert>
  );
}

export default ReactoryUnsupportedFieldTemplate;
