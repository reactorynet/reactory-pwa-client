/**
 * @jest-environment jsdom
 *
 * Migration parity check — for every form that has been migrated to the v5
 * engine via `options.engine: 'v5'`, this suite asserts the dispatcher
 * routes correctly. Append to MIGRATED_FORM_IDS as forms are migrated;
 * each entry adds one regression-guarding test case.
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EngineDispatchedForm } from '../../integration/EngineDispatchedForm';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';
import ReactoryNewFormInput from '@reactory/client-core/components/reactory/formDefinitions/ReactoryNewFormInput';

jest.mock('@reactory/client-core/components/reactory/form', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-fork-form" />,
}));
jest.mock('../../widgets', () => ({ reactoryWidgets: () => ({}) }));
// The migration parity test asserts forms render via v5 because of their
// per-form `options.engine: 'v5'` pin. The pin wins over the flag, so the
// flag value is irrelevant here — we mock the hook to keep Apollo out of
// the test render tree.
jest.mock('../../hooks/useReactoryFeatureFlag', () => ({
  FORMS_ENGINE_V5_FQN: 'core.FormsEngineV5@1.0.0',
  useReactoryFeatureFlag: () => ({ value: false, loading: false, error: null }),
}));

interface MigratedFormSpec {
  formDef: Reactory.Forms.IReactoryForm;
  description: string;
}

const MIGRATED_FORMS: MigratedFormSpec[] = [
  {
    formDef: ReactoryNewFormInput,
    description: 'core.ReactoryNewFormInput — first Phase 3 migration (4-string create-form dialog)',
  },
];

describe('Phase 3 migrated forms — dispatcher parity', () => {
  it.each(MIGRATED_FORMS)('$description renders via the v5 engine', ({ formDef }) => {
    expect(formDef.options?.engine).toBe('v5');

    const reactory = createMockReactorySDK();
    render(
      <EngineDispatchedForm
        formDef={formDef}
        schema={formDef.schema as Reactory.Schema.ISchema}
        uiSchema={(formDef.uiSchema as Reactory.Schema.IUISchema) ?? {}}
        formData={(formDef.defaultFormValue as Record<string, unknown>) ?? {}}
        formContext={{ reactory }}
      />,
    );
    // V5 path: the legacy-fork stub must NOT have rendered.
    expect(screen.queryByTestId('legacy-fork-form')).toBeNull();
    // V5 path: telemetry hook fires form.mount on the new engine.
    expect(reactory.telemetryCalls.some((e) => e.name === 'form.mount')).toBe(true);
  });

  it('a non-migrated form (no options.engine) still renders via the fork', () => {
    const reactory = createMockReactorySDK();
    const legacyFormDef = {
      id: 'core.LegacyForm',
      name: 'LegacyForm',
      nameSpace: 'core',
      version: '1.0.0',
      schema: { type: 'object' as const, properties: {} },
      __complete__: true,
    } as Reactory.Forms.IReactoryForm;

    render(
      <EngineDispatchedForm
        formDef={legacyFormDef}
        schema={legacyFormDef.schema as Reactory.Schema.ISchema}
        formContext={{ reactory }}
      />,
    );
    expect(screen.getByTestId('legacy-fork-form')).toBeInTheDocument();
  });
});
