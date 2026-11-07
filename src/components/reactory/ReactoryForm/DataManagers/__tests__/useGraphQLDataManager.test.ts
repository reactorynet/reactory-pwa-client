/**
 * Tests for the server-error mapping in useGraphQLDataManager.
 *
 * Regression: a mutation that resolves with `errors` (Apollo `errorPolicy:
 * 'all'`) previously produced no rjsf error information at all, so a server
 * validation message (e.g. a duplicate class code) could only be shown as a
 * notification - never inline on the offending field.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useGraphQLDataManager } from '../useGraphQLDataManager';
import { createMockReactorySDK, createMockFormDefinition } from '../../__tests__/mockReactory';

const mockReactory = createMockReactorySDK();
const mockNavigate = jest.fn();

jest.mock('@reactory/client-core/api', () => ({
  useReactory: () => mockReactory,
}));

jest.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const MUTATION_TEXT = 'mutation UpdateClass($input: ReactoryClassroomClassInput) { updateClass(input: $input) { id } }';

const createForm = () => createMockFormDefinition({
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      code: { type: 'string', title: 'Class Code' },
    },
  },
  graphql: {
    mutation: {
      edit: {
        name: 'updateClass',
        text: MUTATION_TEXT,
        onError: {
          onErrorMethod: 'none',
          fieldMap: { classCode: 'code' },
        },
      },
    },
  },
});

const createProps = () => ({
  form: createForm(),
  formData: { name: 'Class 10A', code: '10A' },
  formContext: {} as any,
  mode: 'edit',
  props: {},
  graphDefinition: createForm().graphql,
});

describe('useGraphQLDataManager - server validation errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReactory.graphqlMutation.mockReset();
  });

  it('maps extensions + onError.fieldMap onto an rjsf errorSchema', async () => {
    mockReactory.graphqlMutation.mockResolvedValue({
      errors: [
        {
          message: "Class with code '10A' already exists",
          extensions: { field: 'classCode', code: 'BAD_USER_INPUT' },
        },
      ],
      data: null,
    });

    const { result } = renderHook(() => useGraphQLDataManager(createProps()));

    await act(async () => {
      await result.current.onSubmit({ name: 'Class 10A', code: '10A' });
    });

    expect(result.current.errorSchema).toEqual({
      code: { __errors: ["Class with code '10A' already exists"] },
    });
    expect(result.current.errors).toEqual([
      {
        property: '.code',
        message: "Class with code '10A' already exists",
        stack: ".code Class with code '10A' already exists",
      },
    ]);
  });

  it('highlights the mapped field for a message-only server error', async () => {
    // The classroom duplicate-code check throws a plain Error, so there is no
    // extensions.field - only the message. A declared fieldMap is the opt-in
    // that lets the form attribute it.
    mockReactory.graphqlMutation.mockResolvedValue({
      errors: [{ message: "Class with code '10A' already exists", extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
      data: null,
    });

    const { result } = renderHook(() => useGraphQLDataManager(createProps()));

    await act(async () => {
      await result.current.onSubmit({ name: 'Class 10A', code: '10A' });
    });

    expect(result.current.errorSchema).toEqual({
      code: { __errors: ["Class with code '10A' already exists"] },
    });
  });

  it('falls back to a form-level _error when no field can be resolved', async () => {
    mockReactory.graphqlMutation.mockResolvedValue({
      errors: [{ message: 'Unable to save the class group' }],
      data: null,
    });

    const { result } = renderHook(() => useGraphQLDataManager(createProps()));

    await act(async () => {
      await result.current.onSubmit({ name: 'Class 10A', code: '10A' });
    });

    expect(result.current.errorSchema).toEqual({
      _error: { __errors: ['Unable to save the class group'] },
    });
    expect(result.current.errors).toHaveLength(1);
  });

  it('clears the server errorSchema once a later submit succeeds', async () => {
    mockReactory.graphqlMutation.mockResolvedValueOnce({
      errors: [{ message: "Class with code '10A' already exists", extensions: { field: 'code' } }],
      data: null,
    });

    const { result } = renderHook(() => useGraphQLDataManager(createProps()));

    await act(async () => {
      await result.current.onSubmit({ name: 'Class 10A', code: '10A' });
    });
    expect(result.current.errorSchema.code.__errors).toHaveLength(1);

    mockReactory.graphqlMutation.mockResolvedValueOnce({ data: { updateClass: { id: '1' } } });

    await act(async () => {
      await result.current.onSubmit({ name: 'Class 10A', code: '10B' });
    });

    expect(result.current.errorSchema).toEqual({});
    expect(result.current.errors).toEqual([]);
  });

  it('leaves the errorSchema empty for a successful mutation', async () => {
    mockReactory.graphqlMutation.mockResolvedValue({ data: { updateClass: { id: '1' } } });

    const { result } = renderHook(() => useGraphQLDataManager(createProps()));

    let returned: any;
    await act(async () => {
      returned = await result.current.onSubmit({ name: 'Class 10A', code: '10A' });
    });

    expect(returned).toEqual({ name: 'Class 10A', code: '10A' });
    expect(result.current.errorSchema).toEqual({});
    expect(result.current.errors).toEqual([]);
  });

  it('still hands the mapped errorSchema to a registered onError component', async () => {
    const onError = jest.fn();
    const errorComponent: any = () => null;
    errorComponent.onError = onError;
    mockReactory.getComponent.mockReturnValue(errorComponent);

    const props = createProps();
    props.graphDefinition.mutation.edit.onError = {
      onErrorMethod: 'function',
      method: 'function',
      componentRef: 'classroom.ClassFormErrorHandler@1.0.0',
    } as any;

    mockReactory.graphqlMutation.mockResolvedValue({
      errors: [{ message: "'10A' is already taken", extensions: { field: 'code' } }],
      data: null,
    });

    const { result } = renderHook(() => useGraphQLDataManager(props));

    await act(async () => {
      await result.current.onSubmit({ name: 'Class 10A', code: '10A' });
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].errorSchema).toEqual({
      code: { __errors: ["'10A' is already taken"] },
    });
  });
});
