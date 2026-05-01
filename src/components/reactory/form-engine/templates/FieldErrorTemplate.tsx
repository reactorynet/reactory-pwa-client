import * as React from 'react';
import type { FieldErrorProps } from '@rjsf/utils';

interface UIFieldErrorOptions {
  field?: string;
  fieldOptions?: Record<string, unknown>;
  icon?: string;
  iconOptions?: unknown;
}

type RegistryWithResolveFqn = {
  resolveFqn?: (name: string, kind: 'field' | 'widget') => React.ComponentType<Record<string, unknown>> | null;
};

export function ReactoryFieldErrorTemplate(props: FieldErrorProps): React.ReactElement | null {
  const { errors, errorSchema, schema, uiSchema, idSchema, registry } = props;

  const rawUiError = (uiSchema as Record<string, unknown> | undefined)?.['ui:error'];

  if (rawUiError === false) return null;

  if (rawUiError !== null && rawUiError !== undefined && typeof rawUiError === 'object') {
    const opts = rawUiError as UIFieldErrorOptions;
    if (opts.field) {
      const resolveFqn = (registry as unknown as RegistryWithResolveFqn).resolveFqn;
      const Resolved = resolveFqn ? resolveFqn(opts.field, 'field') : null;

      if (Resolved) {
        return (
          <Resolved
            {...(props as Record<string, unknown>)}
            errors={errors}
            errorSchema={errorSchema}
            schema={schema}
            uiSchema={uiSchema}
            idSchema={idSchema}
            {...(opts.fieldOptions ?? {})}
            icon={opts.icon}
            iconOptions={opts.iconOptions}
            registry={registry}
            formContext={registry.formContext}
          />
        );
      }
    }
  }

  const errorList = errors ?? [];
  if (errorList.length === 0) return null;

  const stringOverride = typeof rawUiError === 'string' ? rawUiError : null;

  return (
    <>
      {stringOverride ? <p className="error-summary">{stringOverride}</p> : null}
      <ul role="alert">
        {errorList.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </>
  );
}

export default ReactoryFieldErrorTemplate;
