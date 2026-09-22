/**
 * Barrel for the Reactory v5 field overrides.
 *
 * `reactoryFields()` mirrors `reactoryWidgets()` in `../widgets`: it returns the
 * static field map handed to the registry so `ui:field: '<Name>'` resolves
 * without every caller having to pass `staticFields`.
 */

import * as React from 'react';
import { ReactoryGridLayoutField } from './GridLayoutField';

export { ReactoryGridLayoutField };

export function reactoryFields(): Record<string, React.ComponentType<any>> {
  return {
    // Reactory's responsive 12-column layout field: `ui:field: 'GridLayout'`
    // combined with `ui:grid-layout` rows.
    GridLayout: ReactoryGridLayoutField as unknown as React.ComponentType<any>,
  };
}
