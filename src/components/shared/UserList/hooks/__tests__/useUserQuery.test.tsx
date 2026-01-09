/**
 * Tests for useUserQuery hook
 * @module UserList/hooks/__tests__/useUserQuery
 */

import { renderHook } from '@testing-library/react';
import { useUserQuery } from '../useUserQuery';

describe('useUserQuery', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() =>
      useUserQuery({
        query: null as any,
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
        query: null as any,
        initialPage: 1,
        initialPageSize: 25,
        initialSearchString: '',
      })
    );

    result.current.setPage(2);
    expect(result.current.page).toBe(2);
  });

  it('should update pageSize state', () => {
    const { result } = renderHook(() =>
      useUserQuery({
        query: null as any,
        initialPage: 1,
        initialPageSize: 25,
        initialSearchString: '',
      })
    );

    result.current.setPageSize(50);
    expect(result.current.pageSize).toBe(50);
  });

  it('should update searchString state', () => {
    const { result } = renderHook(() =>
      useUserQuery({
        query: null as any,
        initialPage: 1,
        initialPageSize: 25,
        initialSearchString: '',
      })
    );

    result.current.setSearchString('test');
    expect(result.current.searchString).toBe('test');
  });
});
