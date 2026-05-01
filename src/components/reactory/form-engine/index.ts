/**
 * Public API surface of the Reactory form engine.
 *
 * What's stable here:
 *   - The primary hook (`useReactoryForm`) and its types
 *   - The registry helpers (`createReactoryRegistry`, `resolveFqn`, `adaptWidget`)
 *   - The validator factory (`createReactoryValidator`)
 *   - The templates barrel (`reactoryTemplates`, individual templates)
 *   - The widgets barrel (`reactoryWidgets`)
 *   - The fields directory (`ReactoryConditionalField`)
 *   - The integration shim (`EngineDispatchedForm`)
 *   - The compute helpers and async-validation hook
 *   - The RBAC permission resolver
 *   - The telemetry hook
 *   - The TypeScript module augmentation (`Reactory.Forms.IReactoryForm.options.engine`)
 *
 * Deprecated re-exports (kept for one minor version per
 * `07-public-api.md`):
 *   - `ADDITIONAL_PROPERTY_FLAG` is re-exported from `@rjsf/utils` so
 *     legacy fork consumers can import the constant from here without
 *     a deep path change. The migration codemod (Phase 5 final task)
 *     rewrites the deep imports.
 *
 * Internal-only paths (NOT exported):
 *   - `testing/` — test helpers, only loaded by Jest
 *   - Per-template internal types
 *   - The legacy fork at `components/reactory/form/`
 *
 * See `docs/forms-engine/07-public-api.md` for the consumer contract.
 */

// === Primary entry hook ===
export {
  useReactoryForm,
  type UseReactoryFormArgs,
  type UseReactoryFormResult,
  type ReactoryFormHookContext,
  type FormEngine,
} from './hooks/useReactoryForm';

// === Telemetry ===
export {
  useFormTelemetry,
  digestValue,
  type FormTelemetry,
  type UseFormTelemetryArgs,
} from './hooks/useFormTelemetry';

// === Async validation ===
export {
  useAsyncValidation,
  type AsyncValidator,
  type UseAsyncValidationArgs,
  type UseAsyncValidationResult,
} from './hooks/useAsyncValidation';

// === Registry ===
export {
  createReactoryRegistry,
  type ReactoryRegistry,
  type ReactoryRegistryOptions,
  type ReactoryRegistrySdk,
} from './registry/ReactoryRegistry';
export {
  resolveFqn,
  parseFqn,
  type FqnKind,
  type ParsedFqn,
  type ResolveFqnDeps,
} from './registry/resolveFqn';
export {
  adaptWidget,
  adaptProps,
  type ReactoryWidgetLikeProps,
} from './registry/widgetAdapter';

// === Validator ===
export {
  createReactoryValidator,
  REACTORY_BUILT_IN_FORMATS,
  type ReactoryValidatorOptions,
} from './validator/ReactoryValidator';
export {
  localizerFor,
  keyForError,
  type Localizer,
  type ReactoryLocalizerSdk,
} from './validator/localizer';

// === Templates ===
export {
  reactoryTemplates,
  ReactoryArrayFieldTemplate,
  ReactoryFieldTemplate,
  ReactoryObjectFieldTemplate,
  ReactoryTitleFieldTemplate,
  ReactoryDescriptionFieldTemplate,
  ReactoryFieldErrorTemplate,
  ReactoryFieldHelpTemplate,
  ReactoryWrapIfAdditionalTemplate,
  ReactoryUnsupportedFieldTemplate,
  ReactoryErrorListTemplate,
  ReactoryButtonTemplates,
} from './templates';
export {
  isFieldHidden,
  type UiHidden,
  type UiHiddenCallback,
} from './templates/FieldTemplate';
export { TitleDepthContext } from './templates/TitleFieldTemplate';

// === Widgets ===
// `reactoryWidgets` is intentionally NOT re-exported from the main barrel.
// The widget catalogue's transitive dependency graph (Apollo upload-client
// ESM, MermaidDiagram, localforage, third-party charts) is heavy and hostile
// to jsdom test loading. Advanced consumers who need to override or pre-load
// the catalogue import from the deep path:
//
//   import { reactoryWidgets } from '@reactory/client-core/components/reactory/form-engine/widgets';
//
// `EngineDispatchedForm` consumes the catalogue internally, so the typical
// consumer path through `<ReactoryForm>` does NOT need this import.

// === Fields (Reactory-specific) ===
export {
  ReactoryConditionalField,
  ConditionalDepthContext,
  mergeConditionalBranch,
  pickConditionalBranch,
  resolveConditional,
} from './fields/ReactoryConditionalField';

// === Integration shim (legacy ReactoryForm wrapper) ===
export {
  EngineDispatchedForm,
  type EngineDispatchedFormProps,
} from './integration/EngineDispatchedForm';

// === Compute (computed fields) ===
export {
  applyComputedFields,
  collectComputeDirectives,
  getAtPath,
  setAtPath,
  type Compute,
  type ComputeFn,
  type ComputeDirective,
  type ApplyComputedFieldsDeps,
} from './compute/computeFields';

// === Permissions (RBAC ui:permission) ===
export {
  checkFieldPermission,
  readUiPermission,
  type UiPermission,
  type RedactMode,
  type PermissionDecision,
  type PermissionsService,
  type PermissionResolveDeps,
} from './permissions/checkPermission';

// === Type-only re-exports ===
// Importing this file as a side-effect augments Reactory.Forms.IReactoryForm
// with options.engine. Consumers who set options.engine in a form definition
// should add `import '@reactory/client-core/components/reactory/form-engine';`
// at the top of the file (or rely on a transitive import via this barrel).
import './types';

// === Deprecated re-exports (one-minor-version compatibility, per 07-public-api.md) ===
/**
 * @deprecated Import from `@rjsf/utils` directly, or rely on
 *   `WrapIfAdditionalTemplate` to render additional-property fields.
 *   This re-export keeps legacy fork consumers compiling for one minor
 *   version; the codemod removes such imports.
 */
export { ADDITIONAL_PROPERTY_FLAG } from '@rjsf/utils';

/**
 * Engine version. Bumped per ADR. Plugins can read this to gate
 * behaviour against engine generations during the migration.
 */
export const FORM_ENGINE_VERSION = '1.0.0' as const;
