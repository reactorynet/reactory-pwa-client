import * as React from 'react';
import type { DescriptionFieldProps } from '@rjsf/utils';

interface UIDescriptionFieldOptions {
  description?: string;
  field?: string;
  fieldOptions?: Record<string, unknown>;
  icon?: string;
  iconOptions?: { color?: string; size?: number; position?: 'before' | 'after' };
}

type RegistryWithResolveFqn = {
  resolveFqn?: (name: string, kind: 'field' | 'widget') => React.ComponentType<Record<string, unknown>> | null;
};

export const DescriptionDepthContext = React.createContext(0);

function DefaultDescription({
  id,
  description,
}: {
  id: string;
  description: string | React.ReactElement;
}): React.ReactElement {
  return (
    <p className="description-field" id={`${id}__description`}>
      {description}
    </p>
  );
}

export function ReactoryDescriptionFieldTemplate(props: DescriptionFieldProps): React.ReactElement | null {
  const { id, description, uiSchema, registry } = props;
  const depth = React.useContext(DescriptionDepthContext);

  const rawUiDesc = (uiSchema as Record<string, unknown> | undefined)?.['ui:description'];

  if (rawUiDesc === false) return null;

  if (rawUiDesc !== null && rawUiDesc !== undefined && typeof rawUiDesc === 'object') {
    const opts = rawUiDesc as UIDescriptionFieldOptions;
    const effectiveDescription = opts.description ?? description;

    if (opts.field && depth < 3) {
      const resolveFqn = (registry as unknown as RegistryWithResolveFqn).resolveFqn;
      const Resolved = resolveFqn ? resolveFqn(opts.field, 'field') : null;

      if (Resolved) {
        return (
          <DescriptionDepthContext.Provider value={depth + 1}>
            <Resolved
              {...(props as Record<string, unknown>)}
              description={effectiveDescription}
              {...(opts.fieldOptions ?? {})}
              icon={opts.icon}
              iconOptions={opts.iconOptions}
              idSchema={{ $id: id }}
              formContext={registry.formContext}
            />
          </DescriptionDepthContext.Provider>
        );
      }

      const reactory = (
        registry.formContext as { reactory?: { debug?: (msg: string, params?: unknown) => void } } | undefined
      )?.reactory;
      reactory?.debug?.(
        `[DescriptionFieldTemplate] Could not resolve field "${opts.field}"; falling back to default.`,
      );
    }

    return <DefaultDescription id={id} description={effectiveDescription} />;
  }

  const displayDesc = typeof rawUiDesc === 'string' ? rawUiDesc : description;
  return <DefaultDescription id={id} description={displayDesc} />;
}

export default ReactoryDescriptionFieldTemplate;
