/**
 * EngineDispatchedForm — the seam between the legacy ReactoryForm wrapper
 * and the v5 form engine.
 *
 * Renders the appropriate engine for a given form definition. Picks engine
 * by:
 *   1. `formDef.options?.engine` (per-form pin; highest precedence)
 *   2. `reactory.featureFlags.get('forms.useV5Engine')` (global flag)
 *   3. defaults to 'fork' (legacy) until Phase 3's flip
 *
 * Used by `components/reactory/ReactoryForm/ReactoryForm.tsx` in place of
 * the previous direct `<SchemaForm>` render. The wrapper still owns
 * everything else (definition loading, data managers, loading states,
 * error boundaries, toolbars); only the inner form rendering passes
 * through this component.
 */

import * as React from 'react';
import LegacySchemaForm from '@reactory/client-core/components/reactory/form';
import { useReactoryForm, type FormEngine } from '../hooks/useReactoryForm';
import { reactoryWidgets } from '../widgets';
import { reactoryFields } from '../fields';
import { adaptWidget } from '../registry/widgetAdapter';
import { useReactoryFeatureFlag, FORMS_ENGINE_V5_FQN } from '../hooks/useReactoryFeatureFlag';

/**
 * Shape of the parts of an IReactoryForm this seam reads. Kept structural so
 * the wrapper can pass its richer form definition without a cast.
 */
export interface FormWidgetSource {
  /** `useFormDefinition` resolves each map entry onto `widgets[map.widget]`. */
  widgetMap?: Array<{ widget?: string; field?: string; componentFqn?: string; component?: unknown }>;
  /** The per-form widget table; in the legacy path this IS the shared mui barrel. */
  widgets?: Record<string, unknown>;
}

/**
 * Collect exactly the widgets a form contributed through its `widgetMap`.
 *
 * Why this exists: `useFormDefinition` writes every resolved `widgetMap` entry
 * onto `formDef.widgets[map.widget]` (or `[map.field]`). The legacy fork picks
 * those up by side effect, because `formDef.widgets` is the very same object
 * as the `ux/mui/widgets` barrel that `getDefaultRegistry()` reads. The v5
 * registry is built from a fresh `reactoryWidgets()` literal, so the mutation
 * never reached it and every `ui:widget: '<short name>'` declared via
 * `widgetMap` missed, which makes rjsf throw `No widget '<name>' for type`.
 *
 * We deliberately pull only the keys named in `widgetMap`, not the whole
 * `formDef.widgets` table. Pulling the whole table would replace curated v5
 * catalogue entries and rjsf's own defaults with raw legacy components.
 */
export function collectWidgetMapWidgets(
  formDef: FormWidgetSource | undefined,
): Record<string, React.ComponentType<any>> {
  const map = formDef?.widgetMap;
  const widgets = formDef?.widgets;
  if (!Array.isArray(map) || !widgets) return {};

  const out: Record<string, React.ComponentType<any>> = {};
  for (const entry of map) {
    const keys = [entry?.widget, entry?.field].filter(
      (k): k is string => typeof k === 'string' && k.length > 0,
    );
    for (const key of keys) {
      const candidate = widgets[key];
      if (typeof candidate === 'function' || (candidate && typeof candidate === 'object')) {
        out[key] = candidate as React.ComponentType<any>;
      }
    }
  }
  return out;
}

/**
 * Adapted-component cache keyed by the source component, so a widget mapped by
 * several forms (or re-rendered many times) resolves to one stable React type.
 * Stable identity matters: rjsf reconciles on component type, and a fresh
 * wrapper per render would remount every mapped input on each keystroke.
 */
const adaptedByComponent = new WeakMap<object, React.ComponentType<any>>();

function adaptStable(name: string, component: React.ComponentType<any>): React.ComponentType<any> {
  const cached = adaptedByComponent.get(component as unknown as object);
  if (cached) return cached;
  const adapted = adaptWidget(component, name);
  adaptedByComponent.set(component as unknown as object, adapted);
  return adapted;
}

function sameEntries(
  a: Array<[string, React.ComponentType<any>]>,
  b: Array<[string, React.ComponentType<any>]>,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
}

/**
 * Merge the static v5 catalogue with the form's `widgetMap` widgets, adapted to
 * rjsf v5 props. `widgetMap` entries win over catalogue entries of the same
 * name, matching the legacy fork where the map assignment overwrote the barrel
 * entry. The returned object keeps its identity across renders until a mapped
 * component actually changes (for example after a late plugin registration),
 * so the registry memo in `useReactoryForm` is not invalidated every render.
 */
export function useMergedFormWidgets(
  formDef: FormWidgetSource | undefined,
  base: Record<string, React.ComponentType<any>>,
): Record<string, React.ComponentType<any>> {
  const extras = collectWidgetMapWidgets(formDef);
  const entries = Object.entries(extras) as Array<[string, React.ComponentType<any>]>;

  const cache = React.useRef<{
    base: Record<string, React.ComponentType<any>>;
    entries: Array<[string, React.ComponentType<any>]>;
    merged: Record<string, React.ComponentType<any>>;
  } | null>(null);

  const prev = cache.current;
  if (prev && prev.base === base && sameEntries(prev.entries, entries)) {
    return prev.merged;
  }

  const merged: Record<string, React.ComponentType<any>> = { ...base };
  for (const [name, component] of entries) {
    merged[name] = adaptStable(name, component);
  }
  cache.current = { base, entries, merged };
  return merged;
}

export interface EngineDispatchedFormProps {
  /** The IReactoryForm definition (carries options.engine, widgetMap, widgets, etc.). */
  formDef?: { options?: { engine?: FormEngine } } & FormWidgetSource & Record<string, unknown>;
  /** All other props are forwarded to whichever engine renders. */
  [key: string]: unknown;
}

function chooseEngine(
  formDef: EngineDispatchedFormProps['formDef'],
  flagValue: boolean,
): FormEngine {
  const pinned = formDef?.options?.engine;
  if (pinned) return pinned;
  return flagValue === true ? 'v5' : 'fork';
}

export const EngineDispatchedForm: React.FC<EngineDispatchedFormProps> = (props) => {
  const { formDef, ...rest } = props;
  const formContext = (rest.formContext ?? {}) as { reactory?: unknown } & Record<string, unknown>;
  const reactory = formContext.reactory;

  // Resolve the v5 engine flag via Apollo. Cache-first, so once the
  // ReactoryEffectiveFeatureFlags query has resolved (typically right
  // after login) every subsequent form mount reads from the cache.
  // Default false so forms render through the legacy fork during
  // the first-page-load window — fail-safe.
  const { value: v5FlagOn } = useReactoryFeatureFlag(FORMS_ENGINE_V5_FQN, false);

  const engine = chooseEngine(formDef, v5FlagOn);

  // Static v5 catalogue once per mount, then the form's own widgetMap widgets
  // layered on top. See collectWidgetMapWidgets for why the map must be
  // applied explicitly on this path.
  const catalogue = React.useMemo(() => reactoryWidgets(), []);
  const widgets = useMergedFormWidgets(formDef, catalogue);

  // The Reactory wrapper owns the form toolbar, and with it the submit
  // affordance: the legacy fork's SchemaForm rendered only the SchemaField tree
  // and never rjsf's form chrome. rjsf v5's `<Form>` renders its own
  // SubmitButton, which would put a second, unbranded "Submit" button inside
  // the form body (below the toolbar). Default it off so v5 matches fork
  // behaviour; a form that explicitly configures `ui:submitButtonOptions` still
  // wins, and `ui:options.submitText` / `submitIcon` are honoured by the
  // wrapper's own SubmitButton (see useDataManager).
  const requestedUiSchema = (rest.uiSchema ?? {}) as Record<string, unknown>;
  const uiSchemaForEngine =
    'ui:submitButtonOptions' in requestedUiSchema
      ? requestedUiSchema
      : { ...requestedUiSchema, 'ui:submitButtonOptions': { norender: true } };


  // The hook is always called (rules of hooks) even when we end up using the
  // fork — its internal short-circuit returns null for `form` when engine is
  // not v5, so the cost is low.
  // Cast: the legacy ReactoryForm wrapper supplies a richer `reactory` than
  // the hook's narrow signature; we accept the loosening at the boundary.
  const v5HookArgs = {
    schema: rest.schema,
    uiSchema: uiSchemaForEngine,
    formData: rest.formData,
    formContext: { ...formContext, reactory, formDef },
    engine,
    staticWidgets: widgets,
    // Reactory field overrides. Carries `GridLayout`, which forms such as
    // core.SQLQueryForm declare via `ui:field: 'GridLayout'` + `ui:grid-layout`.
    staticFields: reactoryFields(),
    onChange: rest.onChange,
    onSubmit: rest.onSubmit,
    onError: rest.onError,
    liveValidate: rest.liveValidate,
    noValidate: rest.noValidate,
    disabled: rest.disabled,
    readonly: rest.readonly,
    showErrorList: rest.showErrorList,
  } as unknown as Parameters<typeof useReactoryForm>[0];
  const v5 = useReactoryForm(v5HookArgs);

  if (engine === 'v5' && v5.form) {
    return v5.form;
  }

  // Fork path: hand the props verbatim to the legacy SchemaForm. The legacy
  // form has its own broad prop interface; we don't model it strictly here.
  const Legacy = LegacySchemaForm as unknown as React.ComponentType<Record<string, unknown>>;
  return <Legacy {...rest} />;
};

export default EngineDispatchedForm;
