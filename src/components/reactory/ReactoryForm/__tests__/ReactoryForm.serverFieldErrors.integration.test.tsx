/**
 * REACTORY-302016408 — end-to-end acceptance test.
 *
 * This is the only test that exercises the *relay seams* this ticket added with
 * the real implementations on both sides:
 *
 *   reactory.graphqlMutation (mocked, resolves `{ errors }`)
 *     -> useGraphQLDataManager.onSubmit      (builds the rjsf errorSchema)
 *     -> useDataManager                      (mirrors errorSchema/errors into form state)
 *     -> useFormDefinition                   (passes them to the wrapper)
 *     -> ReactoryForm                        (formProps.extraErrors)
 *     -> EngineDispatchedForm                (forwards extraErrors to v5)
 *     -> useReactoryForm / rjsf <Form>       (extraErrors -> field error)
 *     -> FieldTemplate                       (role="alert" on the field)
 *
 * Only the SDK boundary (`reactory.graphqlMutation`, the component registry and
 * the Apollo-backed feature-flag hook) is stubbed. Everything else is production
 * code, which is what makes deleting any single relay fail this test.
 *
 * The form definition below is the documented `onError.fieldMap` shape, and the
 * server payload is what the classroom service produces for a duplicate class
 * code — including the fact that it carries `extensions.code` but no
 * `extensions.field`, so attribution has to come from `fieldMap`.
 */

import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import lodash from 'lodash';
import * as MaterialCore from '@mui/material';
import * as MaterialIcons from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const mockReactory: any = {
  debug: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  i18n: {
    t: (key: string, options?: any) => options?.defaultValue ?? key,
    language: 'en',
    changeLanguage: jest.fn(),
  },
  utils: {
    nil: (value: any) => value === null || value === undefined,
    lodash,
    template: lodash.template,
    objectMapper: (data: any) => data,
    parseObjectMap: (map: any) => map,
    omitDeep: (value: any) => value,
    queryString: { parse: () => ({}) },
    localForage: { getItem: jest.fn(), setItem: jest.fn() },
  },
  form: jest.fn(() => undefined),
  // `useToolbar` reads the theme straight off the SDK (`reactory.muiTheme`).
  muiTheme: createTheme(),
  getComponent: jest.fn(() => null),
  // The real `ReactoryApi.getComponents` keys its result by *component name*
  // (`componentMap[component.name]`), not by FQN — `useExports` destructures
  // `{ FullScreenModal, Material }` from it and uses `Material.MaterialCore`.
  // A mock keyed by FQN silently yields undefined there and the whole form
  // throws before rendering, so mirror the real contract.
  getComponents: jest.fn((deps: string[] = []) => {
    const components: Record<string, any> = {};
    (deps || []).forEach((fqn) => {
      const name = String(fqn).split('.').pop() as string;
      components[name] = name === 'Material'
        ? { MaterialCore, MaterialIcons }
        : () => null;
    });
    return components;
  }),
  componentRegister: {},
  featureFlags: { get: jest.fn(() => undefined), isEnabled: jest.fn(() => false) },
  telemetry: { emit: jest.fn() },
  graphqlMutation: jest.fn(),
  graphqlQuery: jest.fn(async () => ({ data: {} })),
  createNotification: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeListener: jest.fn(),
  formTranslationMaps: {},
  formValidationMaps: {},
  amq: { onReactoryPluginLoaded: jest.fn(), raiseReactoryPluginEvent: jest.fn() },
};

// The UX barrels decorate their widgets with `withReactory` from the provider;
// a partial mock must keep that export or importing the widget catalogue throws
// (`withReactory is not a function`). Identity is enough here — the form under
// test renders plain text fields.
jest.mock('@reactory/client-core/api', () => ({
  useReactory: () => mockReactory,
  withReactory: (Component: any) => Component,
  WITH_REACTORY: (Component: any) => Component,
  ReactoryApiEventNames: {
    onLogin: 'onLogin',
    onComponentRegistered: 'onComponentRegistered',
  },
}));

jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  __esModule: true,
  useReactory: () => mockReactory,
  withReactory: (Component: any) => Component,
  WITH_REACTORY: (Component: any) => Component,
}));

jest.mock('react-router', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ search: '', pathname: '/' }),
  useParams: () => ({}),
}));

// EngineDispatchedForm reads the v5 flag through Apollo; there is no
// ApolloProvider here. The form pins `options.engine: 'v5'`, so the value is
// irrelevant — only the hook must not reach for a provider.
jest.mock('@reactory/client-core/components/reactory/form-engine/hooks/useReactoryFeatureFlag', () => ({
  useReactoryFeatureFlag: () => ({ value: false, loading: false }),
  FORMS_ENGINE_V5_FQN: 'core.FormsEngineV5@1.0.0',
}));

// ReactoryForm resolves its UX package from the shared `ux/mui` barrel, which
// includes the chart widgets. Those decorate with `react-measure`, whose
// decorator is not usable under jsdom (the same limitation the engine's own
// integration tests work around). Stubbing just `react-measure` keeps every
// other widget, field and template real, so this test still renders through the
// production registry.
jest.mock('react-measure', () => ({
  __esModule: true,
  withContentRect: () => (Component: any) => Component,
  Measure: ({ children }: any) => children({ measureRef: () => undefined }),
}));

// ReactoryForm wraps the form in `<IntersectionVisible>`, which constructs an
// IntersectionObserver. jsdom does not implement one.
class MockIntersectionObserver {
  public root = null;
  public rootMargin = '';
  public thresholds: number[] = [];
  observe() { /* no-op */ }
  unobserve() { /* no-op */ }
  disconnect() { /* no-op */ }
  takeRecords() { return []; }
}
(globalThis as any).IntersectionObserver = MockIntersectionObserver;
(window as any).IntersectionObserver = MockIntersectionObserver;

// The import must come after the mocks above so they apply to the module graph.
import { ReactoryForm } from '../ReactoryForm';

const DUPLICATE_CODE_MESSAGE = "Class with code '10A' already exists";

const createFormDefinition = (): any => ({
  id: 'classroom.ReactoryClassroomClassForm@1.0.0',
  name: 'ReactoryClassroomClassForm',
  nameSpace: 'classroom',
  version: '1.0.0',
  title: 'Class Details',
  uiFramework: 'material',
  __complete__: true,
  options: { engine: 'v5' },
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Class Name' },
      code: { type: 'string', title: 'Class Code' },
    },
  },
  uiSchema: {},
  uiSchemas: [],
  widgetMap: [],
  fieldMap: [],
  components: [],
  defaultFormValue: { name: 'Class 10A', code: '10A' },
  graphql: {
    mutation: {
      edit: {
        name: 'updateClass',
        text: 'mutation UpdateClass($input: ReactoryClassroomClassInput) { updateClass(input: $input) { id } }',
        onError: {
          onErrorMethod: 'none',
          method: 'function',
          componentRef: 'classroom.ClassFormErrorHandler@1.0.0',
          fieldMap: { classCode: 'code' },
        },
      },
    },
  },
});

// The real app mounts forms inside the Reactory theme provider; `useToolbar`
// reads `theme.palette`, so the test needs one too.
const theme = createTheme();
const renderForm = () => render(
  <ThemeProvider theme={theme}>
    <ReactoryForm formDef={createFormDefinition()} mode="edit" formData={{ name: 'Class 10A', code: '10A' }} />
  </ThemeProvider>,
);

/**
 * Submit the way the form engine does: rjsf owns the `<form onSubmit>` handler,
 * which is the same entry point `useDataManager.onSubmit` receives from the
 * Reactory toolbar button. Driving the DOM submit event avoids depending on
 * which of the two submit affordances is rendered.
 */
const submit = async () => {
  // ReactoryForm renders its own `<form>` container and the rjsf engine renders
  // a form inside it, so target the engine's (the one carrying `class="rjsf"`).
  const engineForm = document.querySelector('form.rjsf');
  expect(engineForm).not.toBeNull();
  fireEvent.submit(engineForm as HTMLFormElement);
  await waitFor(() => {
    expect(mockReactory.graphqlMutation).toHaveBeenCalled();
  });
};

describe('ReactoryForm — server field errors end to end', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReactory.graphqlMutation.mockResolvedValue({
      errors: [
        {
          message: DUPLICATE_CODE_MESSAGE,
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        },
      ],
      data: null,
    });
  });

  afterEach(cleanup);

  it('renders the server message inline on the mapped field after a failed save', async () => {
    renderForm();

    // The form is rendered through the real v5 engine.
    await waitFor(() => expect(document.getElementById('root_code')).not.toBeNull());

    await submit();

    // 1. The message is visible at all.
    const message = await screen.findByText(DUPLICATE_CODE_MESSAGE);
    expect(message).toBeTruthy();

    // 2. It is rendered as a field error (role="alert") on the `code` field, not
    //    as a page-level notification. FieldTemplate ids error regions
    //    `${idSchema.$id}-error`, so the code field's region is `root_code-error`.
    const alert = document.getElementById('root_code-error');
    expect(alert).not.toBeNull();
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain(DUPLICATE_CODE_MESSAGE);

    // 3. The alert belongs to the `code` input's field wrapper.
    const codeInput = document.getElementById('root_code');
    expect(codeInput).not.toBeNull();
    const fieldWrapper = alert.closest('.field');
    expect(fieldWrapper).not.toBeNull();
    expect(fieldWrapper.contains(codeInput)).toBe(true);

    // 4. The untouched field is unaffected — the mapping is not form-wide.
    expect(document.getElementById('root_name-error')).toBeNull();

    // 5. Nothing bespoke was needed. The form declares the classroom handler as
    //    `onError.componentRef`, but this run has no component registry, so the
    //    lookup returns null — the field error still renders, because it comes
    //    from the shared FieldTemplate and the wrapper's errorSchema, not from a
    //    registered renderer.
    expect(mockReactory.getComponent).toHaveBeenCalledWith(
      'classroom.ClassFormErrorHandler@1.0.0',
    );
    expect(mockReactory.getComponent.mock.results.every((r: any) => r.value === null)).toBe(true);
    expect(alert.getAttribute('class')).toBe('field-errors');
  });

  it('does not keep a stale field error after the next successful save', async () => {
    renderForm();
    await waitFor(() => expect(document.getElementById('root_code')).not.toBeNull());

    await submit();
    await screen.findByText(DUPLICATE_CODE_MESSAGE);

    mockReactory.graphqlMutation.mockResolvedValue({
      data: { updateClass: { id: '1' } },
    });

    await submit();

    await waitFor(() => {
      expect(document.getElementById('root_code-error')).toBeNull();
    });
  });
});
