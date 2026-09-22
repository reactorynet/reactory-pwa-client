import * as React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import type { ErrorListProps } from '@rjsf/utils';

export function ReactoryErrorListTemplate(props: ErrorListProps): React.ReactElement | null {
  const { errors } = props;
  if (!errors || errors.length === 0) return null;

  return (
    <Alert severity="error" role="alert" className="error-list" sx={{ mb: 2 }}>
      {/* Rendered as a real heading (rather than MUI's AlertTitle div) so the
          form-level error summary is reachable by heading navigation. */}
      <Typography component="h2" variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
        Validation Errors
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {errors.map((e, i) => (
          <Box component="li" key={i} sx={{ mb: 0.5 }}>
            {e.stack || e.message}
          </Box>
        ))}
      </Box>
    </Alert>
  );
}

export default ReactoryErrorListTemplate;
