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
 * Router integration (`ui:tab-options.useRouter === true`): selecting a tab
 * updates the URL via `ui:tab-options.path` (an interpolated path template,
 * e.g. `/applications/${formContext.props.applicationId}?tab=${tab_id}`) and
 * the selected tab is kept in step with the `?tab=` query — including browser
 * back/forward. Router hooks are only read when the field is actually rendered
 * inside a `<Router>` (guarded by `useInRouterContext`), so tabbed forms that
 * are shown in modals or other non-routed hosts keep working unchanged.
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
import { useInRouterContext, useLocation, useNavigate } from 'react-router';
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

interface RouterTabsBridgeProps {
  keyForIndex: (index: number) => string | undefined;
  resolveIndexFromSearch: (search: string) => number;
  buildPath: (key: string) => string | null;
  onIndexChange: (index: number) => void;
  navigateRef: React.MutableRefObject<((index: number) => void) | null>;
}

/**
 * Isolates the react-router hooks so the tab field itself can render outside a
 * `<Router>` (the field must not call `useNavigate`/`useLocation` unless a
 * router ancestor is guaranteed). This component is only mounted when the field
 * detects router context and `useRouter` is enabled.
 */
const RouterTabsBridge: React.FC<RouterTabsBridgeProps> = ({
  keyForIndex,
  resolveIndexFromSearch,
  buildPath,
  onIndexChange,
  navigateRef,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hand the parent a "navigate to tab index" function without the parent
  // having to consume router hooks.
  React.useEffect(() => {
    navigateRef.current = (index: number) => {
      const key = keyForIndex(index);
      if (!key) return;
      const to = buildPath(key);
      if (to) navigate(to);
    };
    return () => {
      navigateRef.current = null;
    };
  }, [navigate, keyForIndex, buildPath, navigateRef]);

  // Keep the selected tab in step with the URL (?tab=...), including browser
  // back/forward and any external navigation that changes the query string.
  React.useEffect(() => {
    const index = resolveIndexFromSearch(location.search);
    if (index >= 0) onIndexChange(index);
  }, [location.search, resolveIndexFromSearch, onIndexChange]);

  return null;
};

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

  const reactory = (formContext as { reactory?: unknown } | undefined)?.reactory as
    | { utils?: { template?: (...args: unknown[]) => (...args: unknown[]) => string } }
    | undefined;

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

  // Router wiring — resolved lazily so non-routed hosts are unaffected.
  const inRouter = useInRouterContext();
  const useRouter = tabOptions.useRouter === true;
  const navigateRef = React.useRef<((index: number) => void) | null>(null);

  const keyForIndex = React.useCallback(
    (index: number): string | undefined => tabFields(tabs[index] ?? {})[0],
    [tabs],
  );

  const resolveIndexFromSearch = React.useCallback(
    (search: string): number => {
      const key = uiOptions.activeTabKey as string | undefined;
      if (!key || uiOptions.activeTab !== 'query' || typeof search !== 'string') return -1;
      const queryValue = new URLSearchParams(search).get(key);
      if (!queryValue) return -1;
      const index = tabs.findIndex((entry) => tabFields(entry).includes(queryValue));
      return index < 0 ? -1 : index;
    },
    [tabs, uiOptions.activeTab, uiOptions.activeTabKey],
  );

  const buildPath = React.useCallback(
    (key: string): string | null => {
      const template = reactory?.utils?.template;
      if (typeof template !== 'function' || !tabOptions.path) return null;
      try {
        return template(tabOptions.path)({ ...(props as unknown as Record<string, unknown>), tab_id: key });
      } catch {
        return null;
      }
    },
    [reactory, tabOptions.path, props],
  );

  const applyIndex = React.useCallback((index: number) => {
    setValue((current) => (current === index ? current : index));
  }, []);

  const handleChange = (_event: React.SyntheticEvent, nextValue: number) => {
    // Update immediately so the tab body/indicator never lag behind the click,
    // then (optionally) push the change into the URL.
    setValue(nextValue);
    if (useRouter && navigateRef.current) {
      navigateRef.current(nextValue);
    }
  };

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
      {inRouter && useRouter ? (
        <RouterTabsBridge
          keyForIndex={keyForIndex}
          resolveIndexFromSearch={resolveIndexFromSearch}
          buildPath={buildPath}
          onIndexChange={applyIndex}
          navigateRef={navigateRef}
        />
      ) : null}
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
