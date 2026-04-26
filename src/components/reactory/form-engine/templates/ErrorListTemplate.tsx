import * as React from 'react';
import type { ErrorListProps } from '@rjsf/utils';

export function ReactoryErrorListTemplate(props: ErrorListProps): React.ReactElement | null {
  const { errors } = props;
  if (!errors || errors.length === 0) return null;
  return (
    <div role="alert" className="error-list">
      <h2>{'Validation Errors'}</h2>
      <ul>
        {errors.map((e, i) => (
          <li key={i}>{e.stack || e.message}</li>
        ))}
      </ul>
    </div>
  );
}

export default ReactoryErrorListTemplate;
