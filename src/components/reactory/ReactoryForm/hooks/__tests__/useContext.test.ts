/**
 * Tests for the useFormContext hook.
 * Verifies that the hook builds a complete IReactoryFormContext object.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useFormContext } from '../useContext';
import { createMockReactorySDK, createMockFormDefinition } from '../../__tests__/mockReactory';

// Mock dependencies
const mockReactory = createMockReactorySDK();

jest.mock('@reactory/client-core/api', () => ({
  useReactory: () => mockReactory,
}));

jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useTheme: () => ({
    breakpoints: {
      up: (bp: string) => `(min-width: ${bp})`,
    },
  }),
}));

jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: (query: string) => {
    // Simulate 'md' breakpoint
    if (query.includes('xl')) return false;
    if (query.includes('lg')) return false;
    if (query.includes('md')) return true;
    if (query.includes('sm')) return true;
    return true;
  },
}));

describe('useFormContext', () => {
  const mockForm = createMockFormDefinition();
  const mockRefresh = jest.fn();
  const mockReset = jest.fn();
  const mockSetFormData = jest.fn();
  const mockGetData = jest.fn();

  const defaultProps = {
    formData: { name: 'Test', email: 'test@example.com' },
    form: mockForm,
    instanceId: 'test-instance-123',
    SIGN: 'test.TestForm@1.0.0:test-instance-123',
    refresh: mockRefresh,
    reset: mockReset,
    setFormData: mockSetFormData,
    getData: mockGetData,
    props: { formId: 'test.TestForm@1.0.0', mode: 'edit' },
  };

  it('should return a context object with all required fields', () => {
    const { result } = renderHook(() => useFormContext(defaultProps));
    const context = result.current;

    expect(context).toBeDefined();
    expect(context.signature).toBe(defaultProps.SIGN);
    expect(context.version).toBe(0);
    expect(context.formDef).toBe(mockForm);
    expect(context.formData).toEqual(defaultProps.formData);
    expect(context.formInstanceId).toBe(defaultProps.instanceId);
    expect(context.refresh).toBe(mockRefresh);
    expect(context.reset).toBe(mockReset);
    expect(context.setFormData).toBe(mockSetFormData);
    expect(context.getData).toBe(mockGetData);
    expect(context.graphql).toBe(mockForm.graphql);
    expect(context.query).toBeNull();
    expect(context.$ref).toBeDefined();
  });

  it('should detect screen breakpoint', () => {
    const { result } = renderHook(() => useFormContext(defaultProps));
    // Our mock returns true for md and below
    expect(result.current.screenBreakPoint).toBe('md');
  });

  it('should include reactory SDK on the context', () => {
    const { result } = renderHook(() => useFormContext(defaultProps));
    expect(result.current.reactory).toBe(mockReactory);
  });

  it('should include i18n from reactory', () => {
    const { result } = renderHook(() => useFormContext(defaultProps));
    expect((result.current as any).i18n).toBe(mockReactory.i18n);
  });

  it('should provide default getData when none supplied', () => {
    const { result } = renderHook(() =>
      useFormContext({ ...defaultProps, getData: undefined })
    );
    expect(result.current.getData).toBeDefined();
    expect(typeof result.current.getData).toBe('function');
  });

  it('should provide default setFormData when none supplied', () => {
    const { result } = renderHook(() =>
      useFormContext({ ...defaultProps, setFormData: undefined })
    );
    expect(result.current.setFormData).toBeDefined();
    expect(typeof result.current.setFormData).toBe('function');
  });

  it('should update when formData changes', () => {
    const { result, rerender } = renderHook(
      (props) => useFormContext(props),
      { initialProps: defaultProps }
    );

    const newData = { name: 'Updated', email: 'updated@test.com' };
    rerender({ ...defaultProps, formData: newData });

    expect(result.current.formData).toEqual(newData);
  });

  it('should include $ref with props', () => {
    const { result } = renderHook(() => useFormContext(defaultProps));
    expect(result.current.$ref).toEqual({ props: defaultProps.props });
  });
});
