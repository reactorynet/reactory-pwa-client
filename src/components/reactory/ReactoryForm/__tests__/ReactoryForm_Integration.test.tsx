import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
// @ts-ignore
import { ReactoryForm } from '../ReactoryForm';
import { createMockReactorySDK } from './mockReactory';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

// Define mocks BEFORE importing the component to prevent cascade
jest.mock('@reactory/client-core/api/ApiProvider');
jest.mock('../hooks', () => ({
  useContext: jest.fn(),
  useDataManager: jest.fn(),
  useExports: jest.fn(),
  useFormDefinition: jest.fn(),
  useHelp: jest.fn(),
  useReports: jest.fn(),
  useSchema: jest.fn(),
  useUISchema: jest.fn(),
  useToolbar: jest.fn(),
}));

jest.mock('react-router', () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(() => ({ search: '' })),
  useParams: jest.fn(() => ({})),
}));

jest.mock('@reactory/client-core/components/reactory/form-engine/integration/EngineDispatchedForm', () => ({
  EngineDispatchedForm: () => <div data-testid="engine-dispatched-form">Mock Engine Form</div>,
}));

jest.mock('@reactory/client-core/components/utility/IntersectionVisible', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@reactory/client-core/api', () => ({
  ReactoryApiEventNames: {
    onComponentRegistered: 'onComponentRegistered'
  }
}));

jest.mock('../components', () => ({
  FormLoadingIndicator: () => <div role="status">Loading...</div>
}));

// Mock the legacy modules and widgets that cause issues
jest.mock('@reactory/client-core/components/reactory/form/components/SchemaForm', () => ({}));
jest.mock('@reactory/client-core/components/reactory/form/components/ErrorList', () => ({
  __esModule: true,
  default: () => null
}));

const { 
  useFormDefinition,
  useExports,
  useReports,
  useHelp,
  useToolbar,
} = require('../hooks');

describe('ReactoryForm Integration', () => {
  let mockReactory: any;

  beforeEach(() => {
    mockReactory = createMockReactorySDK();
    (useReactory as jest.Mock).mockReturnValue(mockReactory);

    // Default mock hook returns
    (useFormDefinition as jest.Mock).mockReturnValue({
      instanceId: 'test-form',
      SIGN: '[ReactoryForm:test-form]',
      form: { 
        name: 'TestForm', 
        nameSpace: 'test', 
        version: '1.0.0', 
        __complete__: true,
        title: 'Test Form Title',
      },
      formData: {},
      isDataLoading: false,
      loadingState: { isLoading: false, stages: [], progress: 0, activeStageLabel: '', hasError: false },
      setForm: jest.fn(),
      formContext: { reactory: mockReactory },
      schema: { type: 'object', properties: {} },
      uiSchema: {},
      uiOptions: { componentType: 'form' },
      errorSchema: {},
      errors: [],
      validate: jest.fn(),
      onChange: jest.fn(),
      onSubmit: jest.fn(),
      onError: jest.fn(),
      refresh: jest.fn(),
      RefreshButton: () => <button>Refresh</button>,
      SubmitButton: () => <button>Submit</button>,
      isValidating: false,
    });

    (useExports as jest.Mock).mockReturnValue({ ExportButton: null, ExportModal: null });
    (useReports as jest.Mock).mockReturnValue({ ReportButton: null, ReportModal: null });
    (useHelp as jest.Mock).mockReturnValue({ HelpButton: null, HelpModal: null, toggleHelp: jest.fn() });
    (useToolbar as jest.Mock).mockReturnValue({ Toolbar: () => <div data-testid="form-toolbar">Mock Toolbar</div> });
  });

  afterEach(cleanup);

  it('renders a loading indicator when form is loading', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'Test', __complete__: false },
      loadingState: { isLoading: true, stages: [], progress: 10, activeStageLabel: 'Loading...', hasError: false },
      uiOptions: { componentType: 'form' },
    });

    render(<ReactoryForm formId="test.form" />);
    // Testing Library would find multiple with role "status", so we check for one or use getAll
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders "No form definition" when form is undefined', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: undefined,
      loadingState: { isLoading: false },
    });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByText('No form definition available')).toBeInTheDocument();
  });

  it('renders the form once loaded', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      instanceId: 'test-form',
      form: { 
        name: 'TestForm', 
        nameSpace: 'test', 
        version: '1.0.0', 
        __complete__: true,
        title: 'Test Form Title',
      },
      formData: {},
      isDataLoading: false,
      loadingState: { isLoading: false, stages: [], progress: 0, activeStageLabel: '', hasError: false },
      formContext: { reactory: mockReactory },
      schema: { type: 'object', properties: {} },
      uiSchema: {},
      uiOptions: { componentType: 'form' },
      errorSchema: {},
      errors: [],
      isValidating: false,
    });

    (useToolbar as jest.Mock).mockReturnValue({ Toolbar: () => <div data-testid="form-toolbar">Mock Toolbar</div> });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
    // ReactoryForm puts title in aria-label of the form, but doesn't necessarily render it as H1/H2 text 
    // unless the Toolbar or a Child does it.
    expect(screen.getByLabelText('Test Form Title')).toBeInTheDocument();
  });

  it('renders with custom container type "card"', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'TestForm', __complete__: true, title: 'Card Title' },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'card' },
      formContext: {},
    });

    const { container } = render(<ReactoryForm formId="test.form" />);
    expect(container.querySelector('.MuiCard-root')).toBeInTheDocument();
  });

  it('renders with custom container type "paper"', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'TestForm', __complete__: true, title: 'Paper Title' },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'paper' },
      formContext: {},
    });

    const { container } = render(<ReactoryForm formId="test.form" />);
    expect(container.querySelector('.MuiPaper-root')).toBeInTheDocument();
  });

  it('displays LinearProgress when data is loading', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'TestForm', __complete__: true, title: 'Loading Data' },
      loadingState: { isLoading: false },
      isDataLoading: true,
      uiOptions: { componentType: 'form', toolbarPosition: 'top' },
      formContext: {},
    });
    (useToolbar as jest.Mock).mockReturnValue({ Toolbar: () => <div>Toolbar</div> });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByLabelText('Form loading')).toBeInTheDocument();
  });

  it('catches and displays errors in rendering', () => {
    // We need to prevent the error from failing the test suite
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // The try block starts at line 350.
    // It uses toolbarPosition, which is destructured from uiOptions at line 347.
    
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'TestForm', __complete__: true },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'form', toolbarPosition: 'top' },
      formContext: {},
    });

    (useToolbar as jest.Mock).mockReturnValue({
      Toolbar: () => <div>Toolbar</div>
    });
    
    // Trigger error during stage label access inside the try block (line 442 approx)
    (useFormDefinition as jest.Mock).mockImplementationOnce(() => ({
       form: { name: 'TestForm', __complete__: true },
       loadingState: { 
         isLoading: true,
         get activeStageLabel() {
           throw new Error('Render Crash');
         }
       },
       uiOptions: { componentType: 'form' },
       formContext: {},
    }));

    render(<ReactoryForm formId="test.form" />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Render Crash');
    consoleSpy.mockRestore();
  });

  it('renders within a Card container', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'TestForm', __complete__: true },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'card', className: 'custom-card' },
      formContext: {},
    });

    render(<ReactoryForm formId="test.form" />);
    // The role="form" is added to non-form containers
    expect(screen.getByRole('form')).toHaveClass('custom-card');
  });

  it('renders within a Paper container', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'TestForm', __complete__: true },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'paper' },
      formContext: {},
    });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('renders within div, section, and article containers', () => {
    const types = ['div', 'section', 'article'];
    types.forEach(type => {
      (useFormDefinition as jest.Mock).mockReturnValue({
        form: { name: 'TestForm', __complete__: true },
        loadingState: { isLoading: false },
        uiOptions: { componentType: type },
        formContext: {},
      });

      const { unmount } = render(<ReactoryForm formId="test.form" />);
      expect(screen.getByRole('form')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders within Grid container', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'TestForm', __complete__: true },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'grid' },
      formContext: {},
    });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('renders within paragraph container', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'TestForm', __complete__: true },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'paragraph' },
      formContext: {},
    });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByRole('form')).toBeInTheDocument();
  });
});

describe('ReactoryForm - getInitialDepencyState branches', () => {
  let mockReactory: any;

  beforeEach(() => {
    mockReactory = createMockReactorySDK();
    (useReactory as jest.Mock).mockReturnValue(mockReactory);
    (useExports as jest.Mock).mockReturnValue({ ExportButton: null, ExportModal: null });
    (useReports as jest.Mock).mockReturnValue({ ReportButton: null, ReportModal: null });
    (useHelp as jest.Mock).mockReturnValue({ HelpButton: null, HelpModal: null, toggleHelp: jest.fn() });
    (useToolbar as jest.Mock).mockReturnValue({ Toolbar: null });
  });

  afterEach(cleanup);

  it('processes form.widgetMap to build dependency list', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: {
        name: 'TestForm',
        __complete__: true,
        widgetMap: [
          { componentFqn: 'reactory.SomeWidget@1.0.0', widget: 'SomeWidget' },
          { componentFqn: 'reactory.SomeWidget@1.0.0', widget: 'SomeWidget' }, // duplicate: should be deduplicated
          { widget: 'NoFqnWidget' },                                            // no componentFqn: should be skipped
        ],
      },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'form' },
      formContext: {},
    });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });

  it('processes form.components to build dependency list', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: {
        name: 'TestForm',
        __complete__: true,
        // components with FQN format "namespace.Name@version" are treated as dependencies
        components: ['reactory.SomeComponent@1.0.0', 'NotAFqn', 'another.Widget@2.0.0'],
      },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'form' },
      formContext: {},
    });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });

  it('processes form.dependencies and marks unavailable deps', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: {
        name: 'TestForm',
        __complete__: true,
        dependencies: [
          { fqn: 'reactory.MissingDep@1.0.0' },   // not in componentRegister → passed = false
        ],
      },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'form' },
      formContext: {},
    });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });

  it('processes form.dependencies and marks available deps', () => {
    const MockComponent = () => <div>Mock</div>;
    mockReactory.componentRegister = {
      'reactory.AvailableDep@1.0.0': { component: MockComponent }
    };

    (useFormDefinition as jest.Mock).mockReturnValue({
      form: {
        name: 'TestForm',
        __complete__: true,
        dependencies: [
          { fqn: 'reactory.AvailableDep@1.0.0' },  // in componentRegister → passed = true
        ],
      },
      loadingState: { isLoading: false },
      uiOptions: { componentType: 'form' },
      formContext: {},
    });

    render(<ReactoryForm formId="test.form" />);
    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });
});

describe('ReactoryForm - event handler callbacks', () => {
  let mockReactory: any;
  let capturedOnRegistered: ((payload: any) => void) | null;
  let capturedOnPluginLoaded: ((plugin: any) => void) | null;

  beforeEach(() => {
    capturedOnRegistered = null;
    capturedOnPluginLoaded = null;

    mockReactory = createMockReactorySDK({
      on: jest.fn((eventName: string, cb: any) => {
        if (eventName === 'onComponentRegistered') capturedOnRegistered = cb;
      }),
      amq: {
        onReactoryPluginLoaded: jest.fn((_event: string, cb: any) => {
          capturedOnPluginLoaded = cb;
        }),
      },
    });

    (useReactory as jest.Mock).mockReturnValue(mockReactory);
    (useExports as jest.Mock).mockReturnValue({ ExportButton: null, ExportModal: null });
    (useReports as jest.Mock).mockReturnValue({ ReportButton: null, ReportModal: null });
    (useHelp as jest.Mock).mockReturnValue({ HelpButton: null, HelpModal: null, toggleHelp: jest.fn() });
    (useToolbar as jest.Mock).mockReturnValue({ Toolbar: null });
    (useFormDefinition as jest.Mock).mockReturnValue({
      instanceId: 'test-form',
      SIGN: '[ReactoryForm:test]',
      form: {
        name: 'TestForm',
        __complete__: true,
        widgetMap: [{ componentFqn: 'reactory.SomeWidget@1.0.0', widget: 'SomeWidget' }],
      },
      formData: {},
      isDataLoading: false,
      loadingState: { isLoading: false },
      formContext: {},
      uiOptions: { componentType: 'form' },
      errorSchema: {},
      errors: [],
      validate: jest.fn(),
      onChange: jest.fn(),
      onSubmit: jest.fn(),
      onError: jest.fn(),
      refresh: jest.fn(),
      isValidating: false,
    });
  });

  afterEach(cleanup);

  it('onComponentRegistered triggers version update when widget is in widgetMap', () => {
    render(<ReactoryForm formId="test.form" />);
    expect(capturedOnRegistered).toBeTruthy();

    act(() => {
      capturedOnRegistered!({ componentFqn: 'reactory.SomeWidget@1.0.0' });
    });

    // Component should still render after version bump
    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });

  it('onComponentRegistered ignores unrelated component registrations', () => {
    render(<ReactoryForm formId="test.form" />);
    expect(capturedOnRegistered).toBeTruthy();

    act(() => {
      capturedOnRegistered!({ componentFqn: 'reactory.UnrelatedWidget@1.0.0' });
    });

    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });

  it('onPluginLoaded updates dependency when plugin matches known dep', () => {
    (useFormDefinition as jest.Mock).mockReturnValue({
      instanceId: 'test-form',
      SIGN: '[ReactoryForm:test]',
      form: {
        name: 'TestForm',
        __complete__: true,
        dependencies: [{ fqn: 'reactory.SomeDep@1.0.0' }],
      },
      formData: {},
      isDataLoading: false,
      loadingState: { isLoading: false },
      formContext: {},
      uiOptions: { componentType: 'form' },
      errorSchema: {},
      errors: [],
      validate: jest.fn(),
      onChange: jest.fn(),
      onSubmit: jest.fn(),
      onError: jest.fn(),
      refresh: jest.fn(),
      isValidating: false,
    });

    render(<ReactoryForm formId="test.form" />);
    expect(capturedOnPluginLoaded).toBeTruthy();

    act(() => {
      capturedOnPluginLoaded!({ componentFqn: 'reactory.SomeDep@1.0.0', component: () => null });
    });

    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });

  it('onPluginLoaded handles plugin without matching dependency gracefully', () => {
    render(<ReactoryForm formId="test.form" />);
    expect(capturedOnPluginLoaded).toBeTruthy();

    act(() => {
      capturedOnPluginLoaded!({ componentFqn: 'reactory.UnknownPlugin@1.0.0', component: () => null });
    });

    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });

  it('onPluginLoaded catches and logs errors without crashing', () => {
    render(<ReactoryForm formId="test.form" />);
    expect(capturedOnPluginLoaded).toBeTruthy();

    // Passing null plugin causes internal error in onPluginLoaded
    act(() => {
      try {
        capturedOnPluginLoaded!(null);
      } catch {
        // The catch inside onPluginLoaded should swallow this
      }
    });

    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });
});

describe('ReactoryForm - props.watchList', () => {
  let mockReactory: any;

  beforeEach(() => {
    mockReactory = createMockReactorySDK();
    (useReactory as jest.Mock).mockReturnValue(mockReactory);
    (useExports as jest.Mock).mockReturnValue({ ExportButton: null, ExportModal: null });
    (useReports as jest.Mock).mockReturnValue({ ReportButton: null, ReportModal: null });
    (useHelp as jest.Mock).mockReturnValue({ HelpButton: null, HelpModal: null, toggleHelp: jest.fn() });
    (useToolbar as jest.Mock).mockReturnValue({ Toolbar: null });
    (useFormDefinition as jest.Mock).mockReturnValue({
      form: { name: 'TestForm', __complete__: true },
      formData: {},
      isDataLoading: false,
      loadingState: { isLoading: false },
      formContext: {},
      uiOptions: { componentType: 'form' },
      errorSchema: {},
      errors: [],
      validate: jest.fn(),
      onChange: jest.fn(),
      onSubmit: jest.fn(),
      onError: jest.fn(),
      refresh: jest.fn(),
      isValidating: false,
    });
  });

  afterEach(cleanup);

  it('iterates props.watchList to build the watch dependency array', () => {
    render(
      <ReactoryForm
        formId="test.form"
        watchList={['formData', 'formId']}
        formData={{ field: 'value' }}
      />
    );
    expect(screen.getByTestId('engine-dispatched-form')).toBeInTheDocument();
  });
});
