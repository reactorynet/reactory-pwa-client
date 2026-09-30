/**
 * Regression guard for `ui:field: 'TabbedLayout'` on the LEGACY fork.
 *
 * The v5 field (`form-engine/fields/TabbedLayoutField.tsx`) accepts either
 * `field: 'x'` (one property per tab) or `fields: ['a','b']` (a group of flat
 * properties). `MaterialTabbedField` originally understood only `field`, so a
 * `fields`-based `ui:tab-layout` produced **no tab bar and no panels at all** —
 * a blank form — for every user on the fork engine (i.e. whenever the
 * `core.FormsEngineV5` flag is off).
 *
 * The AI Providers/Models editors use `fields`, so they rendered empty. These
 * tests pin both contract forms on the legacy field.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import MaterialTabbedField from '../MaterialTabbedField';

// The field pulls `useReactory` from the ApiProvider module (not the barrel).
jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: jest.fn(),
}));

// The field reads params/query for `activeTab` routing; a plain object suffices.
jest.mock('react-router', () => ({
  useParams: () => ({}),
  useNavigate: () => jest.fn(),
}));

const theme = createTheme();

const StubSchemaField = ({ name, schema, onChange }: any) => (
  <div>
    <div data-testid={`field-${name}`}>{String(schema?.title ?? name)}</div>
    <button type="button" data-testid={`edit-${name}`} onClick={() => onChange('gpt-4o', undefined)}>
      edit
    </button>
  </div>
);

const registry = {
  definitions: {},
  fields: {
    SchemaField: StubSchemaField,
    TitleField: () => null,
    DescriptionField: () => null,
  },
};

const SCHEMA = {
  type: 'object',
  title: 'AI Model',
  properties: {
    providerId: { type: 'string', title: 'Provider' },
    modelKey: { type: 'string', title: 'Model Key' },
    sampling: { type: 'object', title: 'Sampling' },
    thinking: { type: 'object', title: 'Thinking' },
  },
};

const ID_SCHEMA = {
  $id: 'root',
  providerId: { $id: 'root_providerId' },
  modelKey: { $id: 'root_modelKey' },
  sampling: { $id: 'root_sampling' },
  thinking: { $id: 'root_thinking' },
};

const renderTabbed = (tabLayout: any[]) => {
  const onChange = jest.fn();
  (useReactory as jest.Mock).mockReturnValue({
    muiTheme: theme,
    utils: {
      lodash: { findIndex: (arr: any[], fn: any) => arr.findIndex(fn) },
      template: () => () => '/',
    },
    getComponent: () => ({
      retrieveSchema: (schema: any) => schema,
      getDefaultRegistry: () => registry,
    }),
  });

  return {
    onChange,
    ...render(
      <ThemeProvider theme={theme}>
        <MaterialTabbedField
          name="root"
          schema={SCHEMA}
          uiSchema={{ 'ui:field': 'TabbedLayout', 'ui:tab-layout': tabLayout }}
          idSchema={ID_SCHEMA}
          errorSchema={{}}
          formData={{ providerId: 'openai' }}
          registry={registry}
          onChange={onChange}
        />
      </ThemeProvider>,
    ),
  };
};

describe('MaterialTabbedField — ui:tab-layout contract', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a tab for a legacy single-`field` entry (backwards compatible)', () => {
    renderTabbed([{ field: 'providerId', title: 'Identity' }]);
    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.getByTestId('field-providerId')).toBeInTheDocument();
  });

  it('renders a tab for a `fields` group — the regression that blanked the form', () => {
    renderTabbed([{ fields: ['providerId', 'modelKey'], title: 'Identity' }]);

    // Previously: no Tab at all, so nothing rendered.
    expect(screen.getByText('Identity')).toBeInTheDocument();
  });

  it('renders every field of the active group', () => {
    renderTabbed([{ fields: ['providerId', 'modelKey'], title: 'Identity' }]);

    expect(screen.getByTestId('field-providerId')).toBeInTheDocument();
    expect(screen.getByTestId('field-modelKey')).toBeInTheDocument();
  });

  it('renders one tab per entry and switches panels on select', () => {
    renderTabbed([
      { fields: ['providerId', 'modelKey'], title: 'Identity' },
      { fields: ['sampling', 'thinking'], title: 'Advanced' },
    ]);

    expect(screen.getByTestId('field-providerId')).toBeInTheDocument();
    expect(screen.queryByTestId('field-sampling')).toBeNull();

    fireEvent.click(screen.getByText('Advanced'));

    expect(screen.getByTestId('field-sampling')).toBeInTheDocument();
    expect(screen.getByTestId('field-thinking')).toBeInTheDocument();
    expect(screen.queryByTestId('field-providerId')).toBeNull();
  });

  it('ignores entries whose properties are absent from the schema', () => {
    renderTabbed([
      { fields: ['providerId'], title: 'Identity' },
      { fields: ['doesNotExist'], title: 'Ghost' },
    ]);

    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.queryByText('Ghost')).toBeNull();
  });

  it('merges a group property change back into the object value', () => {
    const { onChange } = renderTabbed([{ fields: ['providerId', 'modelKey'], title: 'Identity' }]);

    // Drive the consolidated handler exactly as a child field would, then assert
    // the whole object value is re-emitted with just that property replaced.
    fireEvent.click(screen.getByTestId('edit-modelKey'));

    // The whole object value is re-emitted with just that property replaced
    // (the second argument carries per-property errors, which is undefined here).
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toEqual({ providerId: 'openai', modelKey: 'gpt-4o' });
  });
});
