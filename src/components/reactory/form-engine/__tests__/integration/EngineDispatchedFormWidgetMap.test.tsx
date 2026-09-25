/**
 * @jest-environment jsdom
 *
 * Regression: forms that declare widgets through `widgetMap` must render on
 * the v5 engine.
 *
 * `useFormDefinition` resolves each widgetMap entry onto
 * `formDef.widgets[map.widget]`. The legacy fork saw those by side effect
 * (formDef.widgets is the shared mui barrel that getDefaultRegistry reads);
 * the v5 registry was built from a fresh catalogue literal and never did, so
 * any `ui:widget: '<short name>'` declared via widgetMap threw
 * `No widget '<name>' for type '<type>'` and took the form down.
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  EngineDispatchedForm,
  collectWidgetMapWidgets,
  useMergedFormWidgets,
} from '../../integration/EngineDispatchedForm';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';

jest.mock('@reactory/client-core/components/reactory/form', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-fork-form" />,
}));

// Catalogue is mocked per test through this holder so we can also prove
// widgetMap entries override catalogue entries of the same name.
let catalogueMock: Record<string, React.ComponentType<any>> = {};
jest.mock('../../widgets', () => ({
  reactoryWidgets: () => catalogueMock,
}));

jest.mock('../../hooks/useReactoryFeatureFlag', () => ({
  FORMS_ENGINE_V5_FQN: 'core.FormsEngineV5@1.0.0',
  useReactoryFeatureFlag: () => ({ value: true, loading: false, error: null }),
}));

/** A legacy-shaped widget: reads `formData`, as the ux/mui catalogue does. */
const PluginWidget: React.FC<{ formData?: unknown; value?: unknown }> = ({ formData, value }) => (
  <div data-testid="plugin-widget">{`plugin:${String(formData ?? value)}`}</div>
);

const CatalogueWidget: React.FC = () => <div data-testid="catalogue-widget">catalogue</div>;

const schema = {
  type: 'object' as const,
  properties: { name: { type: 'string', title: 'Name' } },
};
const uiSchema = { name: { 'ui:widget': 'PluginWidget' } };

/** Mirrors what useFormDefinition leaves on the form definition. */
const formDefWithMap = (widgets: Record<string, unknown>) => ({
  widgetMap: [{ widget: 'PluginWidget', componentFqn: 'test.PluginWidget@1.0.0' }],
  widgets,
});

const renderV5 = (formDef: Record<string, unknown> | undefined) => {
  const reactory = createMockReactorySDK();
  return render(
    <EngineDispatchedForm
      schema={schema}
      uiSchema={uiSchema}
      formData={{ name: 'hello' }}
      formContext={{ reactory }}
      formDef={formDef}
    />,
  );
};

beforeEach(() => {
  catalogueMock = {};
});

describe('EngineDispatchedForm: widgetMap widgets on the v5 engine', () => {
  it('renders a widget declared through widgetMap by its short name', () => {
    renderV5(formDefWithMap({ PluginWidget }));

    expect(screen.queryByTestId('legacy-fork-form')).toBeNull();
    expect(screen.getByTestId('plugin-widget')).toHaveTextContent('plugin:hello');
  });

  it('fails as before when the form has no widgetMap entry for the name (control)', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => renderV5({ widgets: { PluginWidget } })).toThrow(/No widget 'PluginWidget'/);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('lets a widgetMap entry override a catalogue widget of the same name (legacy semantics)', () => {
    catalogueMock = { PluginWidget: CatalogueWidget };
    renderV5(formDefWithMap({ PluginWidget }));

    expect(screen.getByTestId('plugin-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('catalogue-widget')).toBeNull();
  });

  it('honours widgetMap entries keyed by `field` as well as `widget`', () => {
    const formDef = {
      widgetMap: [{ field: 'PluginWidget', componentFqn: 'test.PluginWidget@1.0.0' }],
      widgets: { PluginWidget },
    };
    renderV5(formDef);
    expect(screen.getByTestId('plugin-widget')).toHaveTextContent('plugin:hello');
  });
});

describe('collectWidgetMapWidgets', () => {
  it('returns only the keys named in widgetMap, not the whole widgets table', () => {
    const Other: React.FC = () => null;
    const out = collectWidgetMapWidgets({
      widgetMap: [{ widget: 'PluginWidget' }],
      widgets: { PluginWidget, TextWidget: Other, SelectWidget: Other },
    });
    expect(Object.keys(out)).toEqual(['PluginWidget']);
  });

  it('skips map entries whose component has not resolved yet', () => {
    const out = collectWidgetMapWidgets({
      widgetMap: [{ widget: 'LatePlugin' }, { widget: 'PluginWidget' }],
      widgets: { PluginWidget, LatePlugin: undefined },
    });
    expect(Object.keys(out)).toEqual(['PluginWidget']);
  });

  it('returns an empty map when there is no widgetMap or no widgets table', () => {
    expect(collectWidgetMapWidgets(undefined)).toEqual({});
    expect(collectWidgetMapWidgets({ widgetMap: [] , widgets: {} })).toEqual({});
    expect(collectWidgetMapWidgets({ widgetMap: [{ widget: 'X' }] })).toEqual({});
  });
});

describe('useMergedFormWidgets', () => {
  const Probe: React.FC<{ formDef: any; base: Record<string, React.ComponentType<any>>; onResult: (r: unknown) => void }> = ({
    formDef,
    base,
    onResult,
  }) => {
    const merged = useMergedFormWidgets(formDef, base);
    onResult(merged);
    return null;
  };

  it('keeps the merged object identity stable while inputs are unchanged', () => {
    const results: unknown[] = [];
    const base = {};
    const formDef = formDefWithMap({ PluginWidget });
    const { rerender } = render(<Probe formDef={formDef} base={base} onResult={(r) => results.push(r)} />);
    rerender(<Probe formDef={{ ...formDef }} base={base} onResult={(r) => results.push(r)} />);

    expect(results).toHaveLength(2);
    expect(results[0]).toBe(results[1]);
  });

  it('produces a new merged object when a mapped component changes (late plugin registration)', () => {
    const results: Array<Record<string, unknown>> = [];
    const base = {};
    const Replacement: React.FC = () => null;
    const { rerender } = render(
      <Probe formDef={formDefWithMap({ PluginWidget })} base={base} onResult={(r) => results.push(r as any)} />,
    );
    rerender(
      <Probe formDef={formDefWithMap({ PluginWidget: Replacement })} base={base} onResult={(r) => results.push(r as any)} />,
    );

    expect(results[0]).not.toBe(results[1]);
    expect(results[0].PluginWidget).not.toBe(results[1].PluginWidget);
  });

  it('reuses one adapted component per source component across forms', () => {
    const results: Array<Record<string, unknown>> = [];
    render(<Probe formDef={formDefWithMap({ PluginWidget })} base={{}} onResult={(r) => results.push(r as any)} />);
    render(<Probe formDef={formDefWithMap({ PluginWidget })} base={{}} onResult={(r) => results.push(r as any)} />);

    expect(results[0].PluginWidget).toBe(results[1].PluginWidget);
  });
});
