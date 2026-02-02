/**
 * Tests for useUserQuery hook
 * @module UserList/hooks/__tests__/useUserQuery
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { useUserQuery } from '../useUserQuery';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

// Mock the useReactory hook
jest.mock('@reactory/client-core/api/ApiProvider', () => ({
  useReactory: jest.fn(),
}));

const mockReactory = {
  graphqlQuery: jest.fn(),
  log: jest.fn(),
};

(useReactory as jest.Mock).mockReturnValue(mockReactory);

// Mock lodash debounce
jest.mock('lodash', () => ({
  debounce: (fn: Function) => {
    const debouncedFn = (...args: any[]) => fn.apply(this, args);
    debouncedFn.cancel = jest.fn();
    return debouncedFn;
  },
}));

describe('useUserQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() =>
      useUserQuery({
        graphqlQuery: undefined,
        initialPage: 1,
        initialPageSize: 25,
        initialSearchString: '',
      })
    );

    expect(result.current.users).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(25);
    expect(result.current.searchString).toBe('');
  });

  it('should update page state', () => {
    const { result } = renderHook(() =>
      useUserQuery({
        graphqlQuery: undefined,
        initialPage: 1,
        initialPageSize: 25,
        initialSearchString: '',
      })
    );

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
  });

  it('should update pageSize state', () => {
    const { result } = renderHook(() =>
      useUserQuery({
        graphqlQuery: undefined,
        initialPage: 1,
        initialPageSize: 25,
        initialSearchString: '',
      })
    );

    act(() => {
      result.current.setPageSize(50);
    });

    expect(result.current.pageSize).toBe(50);
  });

  it('should update searchString state', () => {
    const { result } = renderHook(() =>
      useUserQuery({
        graphqlQuery: undefined,
        initialPage: 1,
        initialPageSize: 25,
        initialSearchString: '',
      })
    );

    act(() => {
      result.current.setSearchString('test');
    });

    expect(result.current.searchString).toBe('test');
  });

  it('should fetch users when graphqlQuery is provided', async () => {
    const mockGraphqlQuery = {
      name: 'ReactoryUsers',
      text: 'query ReactoryUsers { users { id email } }',
    };
    const mockUsers = [{ id: '1', email: 'test@example.com' }];
    const mockResponse = {
      data: {
        ReactoryUsers: {
          users: mockUsers,
          paging: { total: 1 },
        },
      },
    };

    mockReactory.graphqlQuery.mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useUserQuery({
        graphqlQuery: mockGraphqlQuery,
        organizationId: 'org-123',
        initialPage: 1,
        initialPageSize: 25,
      })
    );

    // Wait for the debounced call
    await waitFor(() => {
      expect(mockReactory.graphqlQuery).toHaveBeenCalledWith(
        mockGraphqlQuery.text,
        {
          paging: { page: 1, pageSize: 25 },
          filter: { organizationId: 'org-123' },
        }
      );
    });

    await waitFor(() => {
      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle GraphQL errors', async () => {
    const mockGraphqlQuery = {
      name: 'ReactoryUsers',
      text: 'query ReactoryUsers { users { id email } }',
    };
    const mockError = new Error('GraphQL error');

    mockReactory.graphqlQuery.mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useUserQuery({
        graphqlQuery: mockGraphqlQuery,
        organizationId: 'org-123',
      })
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
      expect(result.current.users).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle GraphQL response errors', async () => {
    const mockGraphqlQuery = {
      name: 'ReactoryUsers',
      text: 'query ReactoryUsers { users { id email } }',
    };
    const mockResponse = {
      errors: [{ message: 'Invalid query' }],
    };

    mockReactory.graphqlQuery.mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useUserQuery({
        graphqlQuery: mockGraphqlQuery,
        organizationId: 'org-123',
      })
    );

    await waitFor(() => {
      expect(result.current.error?.message).toContain('GraphQL errors');
      expect(result.current.users).toEqual([]);
    });
  });

  it('should apply filters correctly', async () => {
    const mockGraphqlQuery = {
      name: 'ReactoryUsers',
      text: 'query ReactoryUsers { users { id email } }',
    };
    const mockUsers = [{ id: '1', email: 'test@example.com' }];
    const mockResponse = {
      data: {
        ReactoryUsers: {
          users: mockUsers,
          paging: { total: 1 },
        },
      },
    };

    mockReactory.graphqlQuery.mockResolvedValue(mockResponse);

    renderHook(() =>
      useUserQuery({
        graphqlQuery: mockGraphqlQuery,
        organizationId: 'org-123',
        businessUnitId: 'bu-456',
        filters: { roles: ['USER'] },
        initialSearchString: 'john',
      })
    );

    await waitFor(() => {
      expect(mockReactory.graphqlQuery).toHaveBeenCalledWith(
        mockGraphqlQuery.text,
        expect.objectContaining({
          filter: expect.objectContaining({
            organizationId: 'org-123',
            businessUnitId: 'bu-456',
            roles: ['USER'],
            searchString: 'john',
          }),
        })
      );
    });
  });

  it('should skip query when skip is true', () => {
    const { result } = renderHook(() =>
      useUserQuery({
        graphqlQuery: { name: 'ReactoryUsers', text: 'query ReactoryUsers { users { id } }' },
        skip: true,
      })
    );

    expect(result.current.users).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockReactory.graphqlQuery).not.toHaveBeenCalled();
  });

  it('should call refetch', async () => {
    const mockGraphqlQuery = {
      name: 'ReactoryUsers',
      text: 'query ReactoryUsers { users { id email } }',
    };
    const mockUsers = [{ id: '1', email: 'test@example.com' }];
    const mockResponse = {
      data: {
        ReactoryUsers: {
          users: mockUsers,
          paging: { total: 1 },
        },
      },
    };

    mockReactory.graphqlQuery.mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useUserQuery({
        graphqlQuery: mockGraphqlQuery,
        organizationId: 'org-123',
      })
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.users).toEqual(mockUsers);
    });

    // Call refetch
    act(() => {
      result.current.refetch();
    });

    // Should call graphqlQuery again
    await waitFor(() => {
      expect(mockReactory.graphqlQuery).toHaveBeenCalledTimes(2);
    });
  });
});
