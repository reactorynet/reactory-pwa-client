/**
 * useReactoryForm — primary entry hook for the v5 form engine.
 *
 * Composes `ReactoryRegistry`, `ReactoryValidator`, and the Reactory templates
 * into a fully-configured `<Form>` from `@rjsf/core`. Memoizes the registry
 * and validator across renders so referential identity stays stable for
 * rjsf's prop-equality checks.
 *
 * Engine selector (per ADR-0006):
 *   1. If the form definition (or callsite) sets `options.engine`, that wins.
 *   2. Otherwise consult `reactory.featureFlags.get('forms.useV5Engine')`.
 *   3. Default during Phase 2 is **fork**; Phase 3 flips it to **v5**.
 *
 * The legacy fork render path is intentionally NOT implemented here. Existing
 * forms continue to render through the existing `<ReactoryForm>` wrapper at
 * `components/reactory/ReactoryForm/ReactoryForm.tsx` which still uses the
 * fork's `<SchemaForm>`. When the wrapper is migrated in Phase 3 it will
 * call this hook directly. For Phase 2, calling `useReactoryForm` with
 * `engine: 'fork'` returns `null` for `form` and logs a debug warning.
 */

import * as React from 'react';
import { default as RjsfForm } from '@rjsf/core';
import type { FormProps as RjsfFormProps } from '@rjsf/core';
import type { RJSFSchema, UiSchema, ValidatorType, RJSFValidationError } from '@rjsf/utils';

import {
  createReactoryRegistry,
  type ReactoryRegistry,
  type ReactoryRegistrySdk,
} from '../registry/ReactoryRegistry';
import { createReactoryValidator, type ReactoryValidatorOptions } from '../validator/ReactoryValidator';
import { reactoryTemplates } from '../templates';
import { TitleDepthContext } from '../templates/TitleFieldTemplate';
import { useFormTelemetry } from './useFormTelemetry';

export type FormEngine = 'v5' | 'fork';

/**
 * Minimal `formContext` shape this hook reads. The full
 * `ReactoryFormContextType` (Phase 2 introduces it) carries more fields;
 * any extra keys flow through to widgets unchanged.
 */
export interface ReactoryFormHookContext {
  reactory: ReactoryRegistrySdk & {
    featureFlags?: {
      get<T = unknown>(key: string): T | undefined;
    };
  } & Parameters<typeof createReactoryValidator>[0]['reactory'];
  /** Form definition the hook can consult for `options.engine`. */
  formDef?: {
    options?: { engine?: FormEngine };
  };
  [key: string]: unknown;
}

export interface UseReactoryFormArgs<TData = unknown> {
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  formData?: TData;
  formContext: ReactoryFormHookContext;
  /** Optional engine override; takes highest precedence. */
  engine?: FormEngine;
  /** Custom formats merged into the validator's built-ins. */
  customFormats?: ReactoryValidatorOptions['customFormats'];
  /** Static field overrides registered with the registry. */
  staticFields?: Record<string, React.ComponentType<any>>;
  /** Static widget overrides registered with the registry. */
  staticWidgets?: Record<string, React.ComponentType<any>>;
  /** Per-form template overrides; merged on top of the Reactory defaults. */
  templates?: Partial<NonNullable<RjsfFormProps<TData>['templates']>>;
  liveValidate?: boolean;
  noValidate?: boolean;
  noHtml5Validate?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  showErrorList?: false | 'top' | 'bottom';
  onChange?: RjsfFormProps<TData>['onChange'];
  onSubmit?: RjsfFormProps<TData>['onSubmit'];
  onError?: (errors: RJSFValidationError[]) => void;
  /** Stable id used for the form element and as the rjsf idPrefix base. */
  id?: string;
  /**
   * Disable telemetry emission for this form mount. Default false.
   * Useful for tests, transient previews, and forms with sensitive flows
   * that don't want lifecycle events leaving the client.
   */
  disableTelemetry?: boolean;
}

export interface UseReactoryFormResult {
  /** The configured `<Form>` element, ready to render. May be null on the fork path. */
  form: React.ReactElement | null;
  /** Memoized validator instance. Stable across renders. */
  validator: ValidatorType;
  /** Memoized registry. Stable across renders. */
  registry: ReactoryRegistry;
  /** Trigger a programmatic submit. Returns false on fork engine. */
  submit(): boolean;
  /** The engine chosen for this render. */
  engine: FormEngine;
}

const FEATURE_FLAG_KEY = 'forms.useV5Engine';

function chooseEngine(args: UseReactoryFormArgs): FormEngine {
  if (args.engine) return args.engine;
  const fromFormDef = args.formContext.formDef?.options?.engine;
  if (fromFormDef) return fromFormDef;
  const flag = args.formContext.reactory.featureFlags?.get<boolean>(FEATURE_FLAG_KEY);
  return flag === true ? 'v5' : 'fork';
}

/** Generate a stable but locally-unique form instance id. */
function newFormInstanceId(): string {
  // Tiny non-cryptographic UUID-ish; enough to scope telemetry within a session.
  return `fi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useReactoryForm<TData = unknown>(
  args: UseReactoryFormArgs<TData>,
): UseReactoryFormResult {
  const { reactory } = args.formContext;
  const formRef = React.useRef<RjsfForm<TData> | null>(null);

  // Stable per-mount instance id. The id flows into telemetry payloads and
  // FQN-resolution miss events so consumers can correlate events across the
  // form's lifecycle.
  const formInstanceIdRef = React.useRef<string | undefined>(undefined);
  if (!formInstanceIdRef.current) {
    formInstanceIdRef.current = newFormInstanceId();
  }
  const formInstanceId = formInstanceIdRef.current;

  const engine = React.useMemo(() => chooseEngine(args as UseReactoryFormArgs), [
    args.engine,
    args.formContext.formDef?.options?.engine,
    reactory,
  ]);

  // Telemetry is wired before the registry/validator so the registry's
  // onMiss callback can emit `form.fqn.miss` events.
  const telemetry = useFormTelemetry({
    reactory: reactory as Parameters<typeof useFormTelemetry>[0]['reactory'],
    formInstanceId,
    signature: (args.formContext as { signature?: string }).signature,
    formId: args.id,
    disabled: args.disableTelemetry,
  });

  const registry = React.useMemo(
    () =>
      createReactoryRegistry({
        reactory,
        staticFields: args.staticFields,
        staticWidgets: args.staticWidgets,
        onMiss: telemetry.emitFqnMiss,
      }),
    [reactory, args.staticFields, args.staticWidgets, telemetry.emitFqnMiss],
  );

  React.useEffect(() => {
    return () => {
      registry.dispose();
    };
  }, [registry]);

  const validator = React.useMemo(
    () =>
      createReactoryValidator({
        reactory,
        customFormats: args.customFormats,
      }),
    [reactory, args.customFormats],
  );

  const templates = React.useMemo(
    () => ({ ...reactoryTemplates(), ...(args.templates ?? {}) }),
    [args.templates],
  );

  // Telemetry-wrapped lifecycle handlers. Stable identities so rjsf's
  // prop-equality checks don't churn the form on every render.
  const userOnChange = args.onChange;
  const userOnSubmit = args.onSubmit;
  const userOnError = args.onError;

  const wrappedOnChange = React.useCallback(
    (e: Parameters<NonNullable<RjsfFormProps<TData>['onChange']>>[0], id?: string) => {
      telemetry.emitChange(id, (e as { formData?: unknown })?.formData);
      userOnChange?.(e, id);
    },
    [userOnChange, telemetry],
  );

  const wrappedOnSubmit = React.useCallback(
    (e: Parameters<NonNullable<RjsfFormProps<TData>['onSubmit']>>[0], evt: React.FormEvent<HTMLFormElement>) => {
      const start = Date.now();
      telemetry.emitSubmitAttempt();
      try {
        userOnSubmit?.(e, evt);
        telemetry.emitSubmitSuccess(Date.now() - start);
      } catch (err) {
        telemetry.emitSubmitError(1, [(err as Error).name ?? 'Error']);
        throw err;
      }
    },
    [userOnSubmit, telemetry],
  );

  const wrappedOnError = React.useCallback(
    (errors: RJSFValidationError[]) => {
      const codes = errors.map((er) => (er as { name?: string }).name ?? 'unknown');
      telemetry.emitSubmitError(errors.length, codes);
      userOnError?.(errors);
    },
    [userOnError, telemetry],
  );

  const form: React.ReactElement | null = React.useMemo(() => {
    if (engine === 'fork') {
      reactory.debug?.(
        '[useReactoryForm] engine=fork; this hook does not implement the legacy render path. ' +
          'Render via the existing <ReactoryForm> wrapper instead.',
      );
      return null;
    }

    // Cast to FormProps<any>: rjsf's per-TData generics over UiSchema/templates
    // unify poorly when callers parameterize TData to concrete shapes. The
    // adapter is the boundary where we accept the loosening; call sites stay typed.
    const formProps = {
      ref: formRef,
      schema: args.schema,
      uiSchema: args.uiSchema,
      formData: args.formData,
      formContext: args.formContext,
      validator,
      fields: registry.fields,
      widgets: registry.widgets,
      templates,
      liveValidate: args.liveValidate,
      noValidate: args.noValidate,
      noHtml5Validate: args.noHtml5Validate,
      disabled: args.disabled,
      readonly: args.readonly,
      showErrorList: args.showErrorList,
      onChange: wrappedOnChange,
      onSubmit: wrappedOnSubmit,
      onError: wrappedOnError,
      id: args.id,
    } as unknown as RjsfFormProps<any>;
    const Form = RjsfForm as unknown as React.ComponentType<RjsfFormProps<any>>;
    return (
      <TitleDepthContext.Provider value={0}>
        <Form {...formProps} />
      </TitleDepthContext.Provider>
    );
  }, [
    engine,
    args.schema,
    args.uiSchema,
    args.formData,
    args.formContext,
    args.liveValidate,
    args.noValidate,
    args.noHtml5Validate,
    args.disabled,
    args.readonly,
    args.showErrorList,
    wrappedOnChange,
    wrappedOnSubmit,
    wrappedOnError,
    args.id,
    validator,
    registry,
    templates,
    reactory,
  ]);

  const submit = React.useCallback((): boolean => {
    if (engine !== 'v5') return false;
    const ref = formRef.current;
    const submitFn = (ref as unknown as { submit?: () => void } | null)?.submit;
    if (typeof submitFn === 'function') {
      submitFn.call(ref);
      return true;
    }
    return false;
  }, [engine]);

  return { form, validator, registry, submit, engine };
}
