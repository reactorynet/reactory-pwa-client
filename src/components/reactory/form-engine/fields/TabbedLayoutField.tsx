/**
 * TabbedLayoutField — the v5 equivalent of the legacy `MaterialTabbedField`
 * (`ui:field: 'TabbedLayout'`).
 *
 * Contract (identical to `ux/mui/fields/MaterialTabbedField.tsx`, so a form's
 * uiSchema is portable between engines):
 *
 *   'ui:field': 'TabbedLayout',
 *   'ui:tab-layout': [{ field: 'identity', title: 'Identity', icon: 'badge' }, ...],
 *   'ui:tab-options': { useRouter?: boolean, path?: string, tabsProps?: {...}, appBarProps?: {...} },
 *   'ui:options': { activeTab?: 'query', activeTabKey?: string, tabsProps?: {...}, appBarProps?: {...} }
 *
 * Each tab renders one of the object's properties (via the registry's
 * `SchemaField`). In addition to the legacy single-`field` entry, a tab may
 * declare `fields: string[]` to group several *flat* properties into one tab —
 * this lets a form adopt tabs without restructuring its schema (and therefore
 * without changing its formData shape / GraphQL mapping).
 *
 * When the object also declares `ui:grid-layout`, the active tab's fields are
 * laid out on the same 12-column grid, so tabs and grids compose.
 *
 * Why this exists: the v5 field registry (`reactoryFields()`) originally
 * registered only `GridLayout` and `ObjectField`. `ui:field: 'TabbedLayout'`
 * therefore did not resolve on the v5 engine, and rjsf silently fell back to
 * the default `ObjectField` — the tabs simply never appeared. Registering this
 * field makes the layout work on both engines.
 */

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Icon from '@mui/material/Icon';
import { getDefaultRegistry } from '@rjsf/core';
import type { FieldProps, IdSchema, RJSFSchema } from '@rjsf/utils';
import { buildGridSpans } from '../templates/ObjectFieldTemplate';

type MuiAppBarProps = React.ComponentProps<typeof AppBar>;
type MuiTabsProps = React.ComponentProps<typeof Tabs>;

/** A tab definition: a single `field`, or a group of `fields`. */
export interface TabLayoutEntry {
  field?: string;
  fields?: string[];
  title?: string;
  icon?: string;
}

export interface TabOptions {
  useRouter?: boolean;
  path?: string;
  tabsProps?: MuiTabsProps;
  appBarProps?: MuiAppBarProps;
}

/** Resolve the tab's constituent property names. */
export function tabFields(entry: TabLayoutEntry): string[] {
  if (Array.isArray(entry?.fields) && entry.fields.length > 0) return entry.fields;
  if (typeof entry?.field === 'string' && entry.field.length > 0) return [entry.field];
  return [];
}

/** Human label for a tab: explicit title -> first property title -> property name. */
export function tabLabel(
  entry: TabLayoutEntry,
  properties: Record<string, RJSFSchema> | undefined,
): string {
  if (entry?.title) return entry.title;
  const first = tabFields(entry)[0];
  const title = first ? (properties?.[first] as RJSFSchema | undefined)?.title : undefined;
  return `${title ?? first ?? ''}`;
}

export function ReactoryTabbedLayoutField(props: FieldProps): React.ReactElement | null {
  const {
    schema,
    uiSchema,
    idSchema,
    name,
    formData,
    formContext,
    registry,
    errorSchema,
    disabled,
    readonly,
    onBlur,
    onChange,
  } = props;

  const properties = (schema?.properties ?? {}) as Record<string, RJSFSchema>;
  const layout = (uiSchema?.['ui:tab-layout'] as TabLayoutEntry[] | undefined) ?? [];
  const tabOptions = (uiSchema?.['ui:tab-options'] as TabOptions | undefined) ?? {};
  const uiOptions = (uiSchema?.['ui:options'] as Record<string, unknown> | undefined) ?? {};

  // Only tabs whose properties actually exist in the schema are rendered.
  const tabs = React.useMemo(
    () => layout.filter((entry) => tabFields(entry).some((field) => field in properties)),
    [layout, properties],
  );

  const resolveIndex = (): number => {
    const key = uiOptions.activeTabKey as string | undefined;
    const source = uiOptions.activeTab;
    if (!key || source !== 'query' || typeof window === 'undefined') return 0;
    const value = new URLSearchParams(window.location.search).get(key);
    if (!value) return 0;
    const index = tabs.findIndex((entry) => tabFields(entry).includes(value));
    return index < 0 ? 0 : index;
  };

  const [value, setValue] = React.useState<number>(resolveIndex);

  React.useEffect(() => {
    // Keep the selection valid when the tab layout shrinks (schema/ui swap).
    setValue((current) => (current < tabs.length ? current : 0));
  }, [tabs.length]);

  if (tabs.length === 0) return null;

  const SchemaField =
    (registry?.fields as Record<string, React.ComponentType<any>> | undefined)?.SchemaField ??
    (getDefaultRegistry().fields.SchemaField as React.ComponentType<any>);

  const handleChange = (_event: React.SyntheticEvent, nextValue: number) => setValue(nextValue);

  // Merge a single property update back into the object value.
  const onPropertyChange = (field: string) => (fieldValue: unknown, fieldErrorSchema?: unknown) => {
    const nextFormData = { ...((formData as Record<string, unknown>) ?? {}), [field]: fieldValue };
    if (typeof onChange === 'function') {
      (onChange as (value: unknown, errorSchema?: unknown) => void)(nextFormData, fieldErrorSchema);
    }
  };

  const tabsProps: MuiTabsProps = {
    indicatorColor: 'primary',
    textColor: 'primary',
    variant: 'scrollable',
    scrollButtons: 'auto',
    ...((tabOptions.tabsProps as MuiTabsProps | undefined) ?? {}),
    ...((uiOptions.tabsProps as MuiTabsProps | undefined) ?? {}),
    value,
    onChange: handleChange,
  };

  const appBarProps: MuiAppBarProps = {
    position: 'static',
    color: 'default',
    elevation: 0,
    ...((tabOptions.appBarProps as MuiAppBarProps | undefined) ?? {}),
    ...((uiOptions.appBarProps as MuiAppBarProps | undefined) ?? {}),
  };

  const active = tabs[value];
  const activeFields = active ? tabFields(active).filter((field) => field in properties) : [];

  // Reuse the object's grid spans (if any) so a tab lays its fields out on the
  // same 12-column grid as the rest of the form.
  const gridSpans = buildGridSpans(uiSchema?.['ui:grid-layout']);

  const renderField = (field: string) => {
    const childIdSchema = { $id: `${idSchema?.$id ?? name}_${field}` } as IdSchema;
    return (
      <SchemaField
        key={field}
        name={field}
        required={Array.isArray(schema?.required) && schema.required.includes(field)}
        schema={properties[field]}
        uiSchema={(uiSchema?.[field] as Record<string, unknown> | undefined) ?? {}}
        idSchema={childIdSchema}
        formData={(formData as Record<string, unknown> | undefined)?.[field]}
        errorSchema={(errorSchema as Record<string, unknown> | undefined)?.[field]}
        formContext={formContext}
        onChange={onPropertyChange(field) as never}
        onBlur={onBlur as never}
        registry={registry}
        disabled={disabled}
        readonly={readonly}
      />
    );
  };

  return (
    <Box data-tabbed-layout={name} sx={{ width: '100%' }}>
      <AppBar {...appBarProps}>
        <Tabs {...tabsProps}>
          {tabs.map((entry, index) => (
            <Tab
              key={index}
              value={index}
              icon={entry.icon ? <Icon>{entry.icon}</Icon> : undefined}
              iconPosition={entry.icon ? 'start' : undefined}
              label={tabLabel(entry, properties)}
              id={`tab-${index}`}
              aria-controls={`tabpanel-${index}`}
              sx={{ textTransform: 'none' }}
            />
          ))}
        </Tabs>
      </AppBar>

      <Box
        role="tabpanel"
        id={`tabpanel-${value}`}
        aria-labelledby={`tab-${value}`}
        sx={{ px: 2, pt: 2, pb: 1 }}
      >
        {activeFields.length > 0 && Object.keys(gridSpans).length > 0 ? (
          <Box
            data-tab-grid="ui:grid-layout"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              columnGap: 2,
              rowGap: 2,
              width: '100%',
            }}
          >
            {activeFields.map((field) => (
              <Box key={field} sx={{ gridColumn: gridSpans[field] ?? 'span 12', minWidth: 0 }}>
                {renderField(field)}
              </Box>
            ))}
          </Box>
        ) : (
          activeFields.map((field) => renderField(field))
        )}
      </Box>
    </Box>
  );
}

export default ReactoryTabbedLayoutField;
