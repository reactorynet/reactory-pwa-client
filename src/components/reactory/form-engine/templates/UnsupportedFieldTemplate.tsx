import * as React from 'react';
import type { UnsupportedFieldProps } from '@rjsf/utils';

export function ReactoryUnsupportedFieldTemplate(props: UnsupportedFieldProps): React.ReactElement {
  const { schema, idSchema, reason } = props;
  return (
    <div className="unsupported-field" role="alert" data-field-id={idSchema?.$id}>
      <strong>{'Unsupported field'}</strong>
      <p>{reason || 'No matching field component for this schema.'}</p>
      <pre>{JSON.stringify(schema, null, 2)}</pre>
    </div>
  );
}

export default ReactoryUnsupportedFieldTemplate;
