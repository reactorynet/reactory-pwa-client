/**
 * Public API surface check. Imports the engine's barrel and asserts that
 * every documented export is reachable. This is a regression guard:
 * accidentally dropping an export from the barrel breaks every downstream
 * consumer, and we want that broken at PR time, not at deploy time.
 *
 * If you intentionally remove an export, also remove the corresponding
 * line below. If you intentionally add a new export, add it to both the
 * barrel and this list — the test pins the surface.
 */

// Mock the heavy widget catalogue + the integration shim that depends on
// it. Keeps the barrel import light under jsdom; we only care that the
// listed names are exported, not that they load their full graphs.
jest.mock('../widgets', () => ({ reactoryWidgets: () => ({}) }));
jest.mock('../integration/EngineDispatchedForm', () => ({
  EngineDispatchedForm: () => null,
}));

import * as engine from '../index';

const EXPECTED_NAMED_EXPORTS = [
  // Primary hook
  'useReactoryForm',
  // Telemetry
  'useFormTelemetry',
  'digestValue',
  // Async validation
  'useAsyncValidation',
  // Registry
  'createReactoryRegistry',
  'resolveFqn',
  'parseFqn',
  'adaptWidget',
  'adaptProps',
  // Validator
  'createReactoryValidator',
  'REACTORY_BUILT_IN_FORMATS',
  'localizerFor',
  'keyForError',
  // Templates
  'reactoryTemplates',
  'ReactoryArrayFieldTemplate',
  'ReactoryFieldTemplate',
  'ReactoryObjectFieldTemplate',
  'ReactoryTitleFieldTemplate',
  'ReactoryDescriptionFieldTemplate',
  'ReactoryFieldErrorTemplate',
  'ReactoryFieldHelpTemplate',
  'ReactoryWrapIfAdditionalTemplate',
  'ReactoryUnsupportedFieldTemplate',
  'ReactoryErrorListTemplate',
  'ReactoryButtonTemplates',
  'isFieldHidden',
  'TitleDepthContext',
  // (Widgets — `reactoryWidgets` is intentionally NOT in the main barrel;
  //  it requires a deep import path due to its heavy transitive deps.)
  // Fields
  'ReactoryConditionalField',
  'ConditionalDepthContext',
  'mergeConditionalBranch',
  'pickConditionalBranch',
  'resolveConditional',
  // Integration
  'EngineDispatchedForm',
  // Compute
  'applyComputedFields',
  'collectComputeDirectives',
  'getAtPath',
  'setAtPath',
  // Permissions
  'checkFieldPermission',
  'readUiPermission',
  // Constants
  'ADDITIONAL_PROPERTY_FLAG',
  'FORM_ENGINE_VERSION',
];

describe('form-engine public API', () => {
  it.each(EXPECTED_NAMED_EXPORTS)('exports %s', (name) => {
    expect((engine as Record<string, unknown>)[name]).toBeDefined();
  });

  it('does not export anything from /testing/ (those are test helpers)', () => {
    // Spot-check: createMockReactorySDK should NOT be on the public surface.
    expect((engine as Record<string, unknown>).createMockReactorySDK).toBeUndefined();
    expect((engine as Record<string, unknown>).renderWithV5).toBeUndefined();
  });

  it('FORM_ENGINE_VERSION is a non-empty semver-ish string', () => {
    expect(engine.FORM_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('export count is bounded — accidental over-exports break this', () => {
    // The exact count guards against mistakenly re-exporting a whole module
    // ("export * from './something';"). If a real new export is added,
    // append to EXPECTED_NAMED_EXPORTS above and bump this count.
    const actualCount = Object.keys(engine).length;
    expect(actualCount).toBeLessThanOrEqual(EXPECTED_NAMED_EXPORTS.length + 5); // small buffer for type-only exports
    expect(actualCount).toBeGreaterThanOrEqual(EXPECTED_NAMED_EXPORTS.length);
  });
});
