import * as React from 'react';
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
    <div className="wrap-if-additional" style={style} data-key={label}>
      <input
        type="text"
        defaultValue={label}
        onBlur={e => onKeyChange(e.target.value)}
        disabled={readonly || disabled}
        aria-label="Property key"
      />
      {children}
      <button
        type="button"
        onClick={onDropPropertyClick(label)}
        aria-label="Remove"
      >
        {'x'}
      </button>
    </div>
  );
}

export default ReactoryWrapIfAdditionalTemplate;
