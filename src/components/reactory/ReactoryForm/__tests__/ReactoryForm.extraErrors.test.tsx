import React from 'react';
import { render, cleanup } from '@testing-library/react';
// @ts-ignore
import { ReactoryForm } from '../ReactoryForm';
import { createMockReactorySDK } from './mockReactory';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

/**
 * REACTORY-302016408 — the ReactoryForm wrapper must hand the server-derived
 * errorSchema to the form engine as `extraErrors`, otherwise the field-level
 * message produced by useGraphQLDataManager never reaches rjsf.
 */

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

const mockEngineProps: any[] = [];
jest.mock('@reactory/client-core/components/reactory/form-engine/integration/EngineDispatchedForm', () => ({
  EngineDispatchedForm: (props: any) => {
    // Capture for assertions; the component itself only needs to render.
    (globalThis as any).__lastEngineProps = props;
    mockEngineProps.push(props);
    return <div data-testid="engine-dispatched-form">Mock Engine Form</div>;
  },
}));

jest.mock('@reactory/client-core/components/utility/IntersectionVisible', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@reactory/client-core/api', () => ({
  ReactoryApiEventNames: { onComponentRegistered: 'onComponentRegistered' },
}));

jest.mock('../components', () => ({
  FormLoadingIndicator: () => <div role="status">Loading...</div>,
  FormSkeleton: () => <div role="status">Skeleton</div>,
}));

jest.mock('@reactory/client-core/components/reactory/form/components/SchemaForm', () => ({}));
jest.mock('@reactory/client-core/components/reactory/form/components/ErrorList', () => ({
  __esModule: true,
  default: () => null,
}));

const { useFormDefinition, useExports, useReports, useHelp, useToolbar } = require('../hooks');

const SERVER_ERROR_SCHEMA = {
  code: { __errors: ["Class with code '10A' already exists"] },
};

describe('ReactoryForm — server validation errors', () => {
  let mockReactory: any;

  beforeEach(() => {
    mockEngineProps.length = 0;
    (globalThis as any).__lastEngineProps = undefined;
    mockReactory = createMockReactorySDK();
    (useReactory as jest.Mock).mockReturnValue(mockReactory);

    (useFormDefinition as jest.Mock).mockReturnValue({
      instanceId: 'test-form',
      SIGN: '[ReactoryForm:test-form]',
      form: {
        name: 'ReactoryClassroomClassForm',
        nameSpace: 'classroom',
        version: '1.0.0',
        __complete__: true,
        title: 'Class Details',
      },
      formData: { code: '10A' },
      isDataLoading: false,
      loadingState: {
        isLoading: false,
        stages: [],
        progress: 0,
        activeStageLabel: '',
        hasError: false,
      },
      setForm: jest.fn(),
      formContext: { reactory: mockReactory },
      schema: { type: 'object', properties: { code: { type: 'string' } } },
      uiSchema: {},
      uiOptions: { componentType: 'form' },
      errorSchema: SERVER_ERROR_SCHEMA,
      errors: [
        {
          property: '.code',
          message: "Class with code '10A' already exists",
          stack: ".code Class with code '10A' already exists",
        },
      ],
      validate: jest.fn(),
      onChange: jest.fn(),
      onSubmit: jest.fn(),
      onError: jest.fn(),
      refresh: jest.fn(),
      RefreshButton: () => null,
      SubmitButton: () => null,
      isValidating: false,
    });

    (useExports as jest.Mock).mockReturnValue({ ExportButton: null, ExportModal: null });
    (useReports as jest.Mock).mockReturnValue({ ReportButton: null, ReportModal: null });
    (useHelp as jest.Mock).mockReturnValue({ HelpButton: null, HelpModal: null, toggleHelp: jest.fn() });
    (useToolbar as jest.Mock).mockReturnValue({ Toolbar: () => null });
  });

  afterEach(cleanup);

  it('passes the data-manager errorSchema to the engine as extraErrors', () => {
    render(<ReactoryForm formId="classroom.ReactoryClassroomClassForm@1.0.0" mode="edit" />);

    expect(mockEngineProps.length).toBeGreaterThan(0);
    expect(mockEngineProps[0].extraErrors).toEqual(SERVER_ERROR_SCHEMA);
  });

  it('keeps the legacy errorSchema prop for the fork engine', () => {
    render(<ReactoryForm formId="classroom.ReactoryClassroomClassForm@1.0.0" mode="edit" />);

    expect(mockEngineProps[0].errorSchema).toEqual(SERVER_ERROR_SCHEMA);
  });
});
