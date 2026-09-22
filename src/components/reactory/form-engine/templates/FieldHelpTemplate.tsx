import * as React from 'react';
import { FormHelperText } from '@mui/material';
import type { FieldHelpProps } from '@rjsf/utils';

export function ReactoryFieldHelpTemplate(props: FieldHelpProps): React.ReactElement | null {
  const { help, idSchema } = props;
  if (!help) return null;

  return (
    <FormHelperText
      component="div"
      className="field-help"
      id={`${idSchema.$id}-help`}
      sx={{ mx: 0, mt: 0.5, color: 'text.secondary' }}
    >
      {help}
    </FormHelperText>
  );
}

export default ReactoryFieldHelpTemplate;
