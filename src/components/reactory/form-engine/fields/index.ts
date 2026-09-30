/**
 * Barrel for the Reactory v5 field overrides.
 *
 * `reactoryFields()` mirrors `reactoryWidgets()` in `../widgets`: it returns the
 * static field map handed to the registry so `ui:field: '<Name>'` resolves
 * without every caller having to pass `staticFields`.
 */

import * as React from 'react';
import { ReactoryGridLayoutField } from './GridLayoutField';
import { ReactoryObjectField } from './ObjectWidgetField';
import { ReactoryTabbedLayoutField } from './TabbedLayoutField';

export { ReactoryGridLayoutField, ReactoryObjectField, ReactoryTabbedLayoutField };

export function reactoryFields(): Record<string, React.ComponentType<any>> {
  return {
    // Reactory's responsive 12-column layout field: `ui:field: 'GridLayout'`
    // combined with `ui:grid-layout` rows.
    GridLayout: ReactoryGridLayoutField as unknown as React.ComponentType<any>,
    // Replaces rjsf's ObjectField so `ui:widget` on an object schema renders
    // the widget, as the legacy fork does. Delegates to rjsf's ObjectField
    // when no widget is named. See ObjectWidgetField.tsx.
    ObjectField: ReactoryObjectField as unknown as React.ComponentType<any>,
    // Tabbed layout: `ui:field: 'TabbedLayout'` + `ui:tab-layout`. The legacy
    // fork resolves this key from `ux/mui/fields` (MaterialTabbedField); the v5
    // field map did not, so the tabs were silently ignored. See
    // TabbedLayoutField.tsx.
    TabbedLayout: ReactoryTabbedLayoutField as unknown as React.ComponentType<any>,
  };
}
