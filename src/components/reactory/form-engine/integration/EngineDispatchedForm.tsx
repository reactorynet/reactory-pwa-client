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
import { useReactoryFeatureFlag, FORMS_ENGINE_V5_FQN } from '../hooks/useReactoryFeatureFlag';

export interface EngineDispatchedFormProps {
  /** The IReactoryForm definition (carries options.engine, etc.). */
  formDef?: { options?: { engine?: FormEngine } } & Record<string, unknown>;
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
    staticWidgets: reactoryWidgets(),
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
