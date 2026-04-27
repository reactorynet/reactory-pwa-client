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

export interface EngineDispatchedFormProps {
  /** The IReactoryForm definition (carries options.engine, etc.). */
  formDef?: { options?: { engine?: FormEngine } } & Record<string, unknown>;
  /** All other props are forwarded to whichever engine renders. */
  [key: string]: unknown;
}

const FEATURE_FLAG = 'forms.useV5Engine';

interface DispatchSdk {
  featureFlags?: { get<T = unknown>(key: string): T | undefined };
}

function chooseEngine(
  formDef: EngineDispatchedFormProps['formDef'],
  reactory: DispatchSdk | undefined,
): FormEngine {
  const pinned = formDef?.options?.engine;
  if (pinned) return pinned;
  return reactory?.featureFlags?.get<boolean>(FEATURE_FLAG) === true ? 'v5' : 'fork';
}

export const EngineDispatchedForm: React.FC<EngineDispatchedFormProps> = (props) => {
  const { formDef, ...rest } = props;
  const formContext = (rest.formContext ?? {}) as { reactory?: DispatchSdk } & Record<string, unknown>;
  const reactory = formContext.reactory;

  const engine = chooseEngine(formDef, reactory);

  // The hook is always called (rules of hooks) even when we end up using the
  // fork — its internal short-circuit returns null for `form` when engine is
  // not v5, so the cost is low.
  // Cast: the legacy ReactoryForm wrapper supplies a richer `reactory` than
  // the hook's narrow signature; we accept the loosening at the boundary.
  const v5HookArgs = {
    schema: rest.schema,
    uiSchema: rest.uiSchema,
    formData: rest.formData,
    formContext: { ...formContext, reactory, formDef },
    engine,
    staticWidgets: reactoryWidgets(),
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
