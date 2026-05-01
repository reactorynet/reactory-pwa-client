import * as React from 'react';
import type { FieldHelpProps } from '@rjsf/utils';

export function ReactoryFieldHelpTemplate(props: FieldHelpProps): React.ReactElement | null {
  const { help, idSchema } = props;
  if (!help) return null;
  return (
    <div className="field-help" id={`${idSchema.$id}-help`}>
      {help}
    </div>
  );
}

export default ReactoryFieldHelpTemplate;
