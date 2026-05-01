/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EngineDispatchedForm } from '../../integration/EngineDispatchedForm';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

// Mock the legacy SchemaForm so we don't pull the fork's MUI tree into
// these unit tests. We only need to assert WHICH engine got rendered.
jest.mock('@reactory/client-core/components/reactory/form', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div data-testid="legacy-fork-form">{JSON.stringify(Object.keys(props))}</div>
  ),
}));

// The widgets barrel pulls heavy deps under jsdom; mock it.
jest.mock('../../widgets', () => ({
  reactoryWidgets: () => ({}),
}));

// Mock the feature-flag hook to avoid needing an ApolloProvider in unit
// tests. Each test sets `flagValueMock` to drive engine selection.
let flagValueMock = false;
jest.mock('../../hooks/useReactoryFeatureFlag', () => ({
  FORMS_ENGINE_V5_FQN: 'core.FormsEngineV5@1.0.0',
  useReactoryFeatureFlag: () => ({ value: flagValueMock, loading: false, error: null }),
}));
beforeEach(() => {
  flagValueMock = false;
});

const baseProps = (over: Partial<React.ComponentProps<typeof EngineDispatchedForm>> = {}) => {
  const reactory = createMockReactorySDK();
  return {
    schema: { type: 'object' as const, properties: { name: { type: 'string', title: 'Name' } } },
    uiSchema: {},
    formData: { name: '' },
    formContext: { reactory },
    formDef: undefined,
    ...over,
  } as React.ComponentProps<typeof EngineDispatchedForm>;
};

describe('EngineDispatchedForm', () => {
  it('renders the legacy fork by default (flag unset, no per-form pin)', () => {
    render(<EngineDispatchedForm {...baseProps()} />);
    expect(screen.getByTestId('legacy-fork-form')).toBeInTheDocument();
  });

  it('renders the v5 engine when the global flag (core.FormsEngineV5@1.0.0) is true', () => {
    flagValueMock = true;
    const reactory = createMockReactorySDK();
    render(<EngineDispatchedForm {...baseProps({ formContext: { reactory } })} />);
    // V5 engine renders rjsf's <form> wrapper, not our fork stub.
    expect(screen.queryByTestId('legacy-fork-form')).toBeNull();
  });

  it('renders the v5 engine when formDef.options.engine = "v5" (pin overrides flag)', () => {
    flagValueMock = false;
    const reactory = createMockReactorySDK();
    render(
      <EngineDispatchedForm
        {...baseProps({
          formContext: { reactory },
          formDef: { options: { engine: 'v5' } },
        })}
      />,
    );
    expect(screen.queryByTestId('legacy-fork-form')).toBeNull();
  });

  it('renders the fork when formDef.options.engine = "fork" (pin overrides flag)', () => {
    flagValueMock = true;
    const reactory = createMockReactorySDK();
    render(
      <EngineDispatchedForm
        {...baseProps({
          formContext: { reactory },
          formDef: { options: { engine: 'fork' } },
        })}
      />,
    );
    expect(screen.getByTestId('legacy-fork-form')).toBeInTheDocument();
  });

  it('forwards reactory through formContext to the v5 engine for telemetry', () => {
    flagValueMock = true;
    const reactory = createMockReactorySDK();
    render(<EngineDispatchedForm {...baseProps({ formContext: { reactory } })} />);
    // form.mount fires from useFormTelemetry inside useReactoryForm.
    expect(reactory.telemetryCalls.some((e) => e.name === 'form.mount')).toBe(true);
  });

  it('forwards all non-formDef props to the legacy engine', () => {
    render(
      <EngineDispatchedForm
        {...baseProps({
          formContext: { reactory: createMockReactorySDK() },
        })}
      />,
    );
    const legacy = screen.getByTestId('legacy-fork-form');
    // Legacy stub serialises prop keys; verify the schema/uiSchema/formData arrived.
    const keys = JSON.parse(legacy.textContent ?? '[]') as string[];
    expect(keys).toEqual(expect.arrayContaining(['schema', 'uiSchema', 'formData', 'formContext']));
    // formDef should NOT be forwarded (it's a control prop, not a form prop).
    expect(keys).not.toContain('formDef');
  });
});
