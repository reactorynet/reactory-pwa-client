import * as React from 'react';
import type { TitleFieldProps } from '@rjsf/utils';

interface UITitleFieldOptions {
  title?: string;
  field?: string;
  fieldOptions?: Record<string, unknown>;
  icon?: string;
  iconOptions?: { color?: string; size?: number; position?: 'before' | 'after' };
}

type RegistryWithResolveFqn = {
  resolveFqn?: (name: string, kind: 'field' | 'widget') => React.ComponentType<Record<string, unknown>> | null;
};

export const TitleDepthContext = React.createContext(0);

function DefaultTitle({
  id,
  title,
  required,
}: {
  id: string;
  title: string;
  required?: boolean;
}): React.ReactElement {
  return (
    <h5 className="title-field" id={`${id}__title`}>
      {title}
      {required ? ' *' : ''}
    </h5>
  );
}

export function ReactoryTitleFieldTemplate(props: TitleFieldProps): React.ReactElement | null {
  const { id, title, required, uiSchema, registry } = props;
  const depth = React.useContext(TitleDepthContext);

  const rawUiTitle = (uiSchema as Record<string, unknown> | undefined)?.['ui:title'];

  if (rawUiTitle === false) return null;

  if (rawUiTitle !== null && rawUiTitle !== undefined && typeof rawUiTitle === 'object') {
    const opts = rawUiTitle as UITitleFieldOptions;
    const effectiveTitle = opts.title ?? title;

    if (opts.field && depth < 3) {
      const resolveFqn = (registry as unknown as RegistryWithResolveFqn).resolveFqn;
      const Resolved = resolveFqn ? resolveFqn(opts.field, 'field') : null;

      if (Resolved) {
        return (
          <TitleDepthContext.Provider value={depth + 1}>
            <Resolved
              {...(props as Record<string, unknown>)}
              title={effectiveTitle}
              {...(opts.fieldOptions ?? {})}
              icon={opts.icon}
              iconOptions={opts.iconOptions}
              idSchema={{ $id: id }}
              formContext={registry.formContext}
            />
          </TitleDepthContext.Provider>
        );
      }

      const reactory = (
        registry.formContext as { reactory?: { debug?: (msg: string, params?: unknown) => void } } | undefined
      )?.reactory;
      reactory?.debug?.(
        `[TitleFieldTemplate] Could not resolve field "${opts.field}"; falling back to default.`,
      );
    }

    return <DefaultTitle id={id} title={effectiveTitle} required={required} />;
  }

  const displayTitle = typeof rawUiTitle === 'string' ? rawUiTitle : title;
  return <DefaultTitle id={id} title={displayTitle} required={required} />;
}

export default ReactoryTitleFieldTemplate;
