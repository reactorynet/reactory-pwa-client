/**
 * GridLayoutField — implements Reactory's `'ui:field': 'GridLayout'`.
 *
 * Reactory forms have used `ui:field: 'GridLayout'` + `ui:grid-layout` since
 * the legacy fork (see e.g. `reactory-core/forms/SQL/uiSchema.ts`). The v5
 * engine had no such field, so a migrated form would render its layout as an
 * unsupported field.
 *
 * Rather than re-implement child rendering (and have to reproduce rjsf's
 * id-schema derivation for every property), this field delegates to the
 * registry's `ObjectField`. The object field template owns the responsive
 * 12-column layout because rjsf hands it each child already rendered with the
 * correct id and registry wiring — see `ObjectFieldTemplate.buildGridSpans`.
 */

import * as React from 'react';
import { Typography } from '@mui/material';
import type { FieldProps } from '@rjsf/utils';

export function ReactoryGridLayoutField(props: FieldProps): React.ReactElement | null {
  const { registry, schema, idSchema } = props;

  const ObjectField = (registry?.fields as Record<string, React.ComponentType<any>> | undefined)?.ObjectField;

  if (!ObjectField) {
    // Defensive: the registry always carries ObjectField, but a broken custom
    // registry should degrade to a visible diagnostic rather than a blank form.
    return (
      <Typography color="error" variant="body2" role="alert">
        GridLayout field could not resolve an ObjectField renderer for {String(idSchema?.$id ?? '')}.
      </Typography>
    );
  }

  return <ObjectField {...(props as any)} schema={schema} />;
}

export default ReactoryGridLayoutField;
