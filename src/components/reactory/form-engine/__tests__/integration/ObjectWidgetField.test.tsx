/**
 * @jest-environment jsdom
 *
 * Regression: `ui:widget` on an object schema must render the widget on the
 * v5 engine, as it does on the legacy fork.
 *
 * rjsf v5's SchemaField always renders objects through ObjectField, which
 * ignores `ui:widget`. The applications dashboard (`core.Applications`) renders
 * each item of its `applications` array through
 * `'ui:widget': 'core.ApplicationCard@1.0.0'`; under v5 it showed the items'
 * raw ID / Avatar / Logo / URL inputs instead of cards.
 */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EngineDispatchedForm } from '../../integration/EngineDispatchedForm';
import { createMockReactorySDK } from '../../testing/mockReactorySDK';
import { adaptWidget } from '../../registry/widgetAdapter';

jest.mock('@reactory/client-core/components/reactory/form', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-fork-form" />,
}));

let catalogueMock: Record<string, React.ComponentType<any>> = {};
jest.mock('../../widgets', () => ({
  reactoryWidgets: () => catalogueMock,
}));

jest.mock('../../hooks/useReactoryFeatureFlag', () => ({
  FORMS_ENGINE_V5_FQN: 'core.FormsEngineV5@1.0.0',
  useReactoryFeatureFlag: () => ({ value: true, loading: false, error: null }),
}));

/** Legacy-shaped widget: reads `formData` and the uiSchema options. */
const ApplicationCard: React.FC<{ formData?: any; options?: any; onChange?: (v: any) => void }> = ({ formData, options, onChange }) => (
  <div data-testid="application-card" data-more={options?.moreRoute}>
    <span>{formData?.title}</span>
    <button type="button" onClick={() => onChange?.({ ...formData, title: `${formData?.title}!` })}>touch</button>
  </div>
);

const schema = {
  type: 'object' as const,
  properties: {
    greeting: { type: 'string', title: 'Greeting' },
    applications: {
      type: 'array',
      title: 'Enabled Applications',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', title: 'ID' },
          title: { type: 'string', title: 'Application name' },
          url: { type: 'string', title: 'Application Url' },
        },
      },
    },
  },
};

const uiSchema = (widget: unknown) => ({
  applications: {
    'ui:options': { allowAdd: false, allowDelete: false, allowReorder: false },
    items: {
      'ui:widget': widget,
      'ui:options': { moreRoute: '/applications/${id}?tab=overview' },
    },
  },
});

const formData = {
  greeting: 'Welcome',
  applications: [
    { id: 'a1', title: 'Reactory Management Client', url: 'http://localhost:3000' },
    { id: 'a2', title: 'BookTutor', url: 'http://localhost:3001' },
  ],
};

const renderV5 = (ui: Record<string, unknown>, components: Record<string, unknown> = {}, onChange?: jest.Mock) => {
  const reactory = createMockReactorySDK({ components });
  return render(
    <EngineDispatchedForm
      schema={schema}
      uiSchema={ui}
      formData={formData}
      formContext={{ reactory }}
      formDef={{}}
      onChange={onChange}
    />,
  );
};

// The real catalogue (widgets/index.tsx) hands rjsf adapted widgets.
const CatalogueApplicationCard = adaptWidget(ApplicationCard as React.ComponentType<any>, 'ApplicationCard');

beforeEach(() => {
  catalogueMock = {};
});

describe('ReactoryObjectField: ui:widget on object schemas (v5 engine)', () => {
  it('renders an FQN widget resolved through the SDK for each object item', () => {
    renderV5(uiSchema('core.ApplicationCard@1.0.0'), {
      'core.ApplicationCard@1.0.0': ApplicationCard,
      'core.ApplicationCard': ApplicationCard,
    });

    expect(screen.queryByTestId('legacy-fork-form')).toBeNull();
    const cards = screen.getAllByTestId('application-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Reactory Management Client');
    expect(cards[1]).toHaveTextContent('BookTutor');
    expect(cards[0]).toHaveAttribute('data-more', '/applications/${id}?tab=overview');
    // The object's own property inputs are not rendered.
    expect(screen.queryByLabelText('Application Url')).toBeNull();
  });

  it('renders a catalogue widget named by its short name', () => {
    catalogueMock = { ApplicationCard: CatalogueApplicationCard };
    renderV5(uiSchema('ApplicationCard'));
    expect(screen.getAllByTestId('application-card')).toHaveLength(2);
  });

  it('propagates the widget onChange as the new object value', () => {
    const onChange = jest.fn();
    catalogueMock = { ApplicationCard: CatalogueApplicationCard };
    renderV5(uiSchema('ApplicationCard'), {}, onChange);

    screen.getAllByText('touch')[1].click();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.formData.applications[1].title).toBe('BookTutor!');
    expect(lastCall.formData.applications[0].title).toBe('Reactory Management Client');
  });

  it('renders the properties as before when no widget is named (control)', () => {
    renderV5({});
    expect(screen.queryByTestId('application-card')).toBeNull();
    expect(screen.getAllByLabelText('Application name').length).toBe(2);
  });

  it('falls back to the properties instead of failing when the widget cannot be resolved', () => {
    renderV5(uiSchema('core.DoesNotExist@1.0.0'));
    expect(screen.queryByTestId('application-card')).toBeNull();
    expect(screen.getAllByLabelText('Application name').length).toBe(2);
  });
});
