/**
 * useUserQuery Hook
 *
 * Manages GraphQL query execution and data fetching for the UserList component.
 * Implements proper GraphQL integration with debouncing, error handling, and filtering.
 *
 * @module UserList/hooks/useUserQuery
 */

import { useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import type Reactory from '@reactorynet/reactory-core';
import type {
  UseUserQueryOptions,
  UseUserQueryResult,
  UserFilterInput,
} from '../types';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

/**
 * Content key for a hook option: stable across renders and independent of key
 * order. It lets the memos/effects below depend on the *content* of an option
 * object instead of its (unstable) identity.
 *
 * IMPORTANT: `JSON.stringify` alone cannot see `Set`/`Map`/`Date` (they
 * serialise to `{}`), which would make an in-place content change invisible to
 * the memo and send the previous value. Those types are handled explicitly. If
 * another non-JSON-safe value is added to `filters`/`advancedFilters`, extend
 * this helper or the change will be silently ignored.
 */
const contentKey = (value: unknown): string =>
  JSON.stringify(value, (_key, val) => {
    if (val instanceof Date) return `__date:${val.toISOString()}`;
    if (val instanceof Set) return `__set:${JSON.stringify(Array.from(val).sort())}`;
    if (val instanceof Map) {
      return `__map:${JSON.stringify(Array.from(val.entries()).sort())}`;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce((acc: Record<string, unknown>, k) => {
          acc[k] = (val as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return val;
  });

/**
 * Hook for querying users with filtering, pagination, and search
 *
 * @param options - Configuration options
 * @returns Query result with users, loading state, and pagination controls
 *
 * @example
 * ```tsx
 * const {
 *   users,
 *   loading,
 *   page,
 *   setPage,
 *   searchString,
 *   setSearchString
 * } = useUserQuery({
 *   query: MY_QUERY,
 *   initialPage: 1,
 *   initialPageSize: 25,
 *   organizationId: 'org-123',
 *   filters: { roles: ['USER'] }
 * });
 * ```
 */
export const useUserQuery = ({
  graphqlQuery,
  organizationId,
  businessUnitId,
  filters,
  initialPage = 1,
  initialPageSize = 25,
  initialSearchString = '',
  quickFilters,
  advancedFilters,
  pollInterval,
  skip = false,
  context,
}: UseUserQueryOptions): UseUserQueryResult => {
  // Internal state
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchString, setSearchString] = useState(initialSearchString);
  const [users, setUsers] = useState<Reactory.Models.IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const reactory = useReactory();

  // Callers routinely pass object/array/Set literals inline (for example
  // `filters={{ roles: ['USER'] }}` or `graphqlQuery={{ name, text }}`). Those
  // get a brand-new identity on every render. Using the raw identities directly as
  // hook dependencies makes the fetch effect re-run on *every* render, which
  // re-enters `setState` and renders again — an unbounded render loop that grows
  // the heap until the process dies. We therefore key the memos below on the
  // serialised *content* of those options, so the derived values keep a stable
  // identity until the content genuinely changes.
  const quickFiltersKey = quickFilters
    ? JSON.stringify(Array.from(quickFilters).sort())
    : '';
  const advancedFiltersKey = advancedFilters
    ? contentKey(advancedFilters)
    : '';
  const filtersKey = filters ? contentKey(filters) : '';
  const graphqlQueryKey = graphqlQuery
    ? `${graphqlQuery.name ?? ''}::${graphqlQuery.text ?? ''}`
    : '';

  // Build filter object combining all filters.
  // NOTE: the content-keyed dependencies below intentionally replace the object
  // identities (`filters`, `quickFilters`, `advancedFilters`). The values are read
  // from this render's closure; the memo only recomputes when their content changes,
  // so the returned object is referentially stable across renders with equal content.
  const combinedFilters = useMemo((): UserFilterInput => {
    const filterInput: UserFilterInput = {};

    // Add organization and business unit filters
    if (organizationId) filterInput.organizationId = organizationId;
    if (businessUnitId) filterInput.businessUnitId = businessUnitId;

    // Add search string
    if (searchString.trim()) filterInput.searchString = searchString.trim();

    // Add quick filters
    if (quickFilters && quickFilters.size > 0) {
      // Apply quick filters to the combined filter input
      quickFilters.forEach(filterId => {
        // This would need to be mapped from filter definitions
        // For now, we'll assume quick filters are predefined
        if (filterId === 'active') {
          filterInput.includeDeleted = false;
        }
        // Add more quick filter mappings as needed
      });
    }

    // Add advanced filters
    if (advancedFilters && advancedFilters.length > 0) {
      // Apply advanced filters
      advancedFilters.forEach(advFilter => {
        switch (advFilter.field) {
          case 'roles':
            if (advFilter.operator === 'in' || advFilter.operator === 'contains') {
              filterInput.roles = Array.isArray(advFilter.value) ? advFilter.value : [advFilter.value];
            }
            break;
          case 'firstName':
            if (advFilter.operator === 'contains') {
              filterInput.firstName = advFilter.value;
            }
            break;
          case 'lastName':
            if (advFilter.operator === 'contains') {
              filterInput.lastName = advFilter.value;
            }
            break;
          case 'email':
            if (advFilter.operator === 'contains') {
              filterInput.email = advFilter.value;
            }
            break;
          // Add more advanced filter mappings as needed
        }
      });
    }

    // Merge with provided filters
    return { ...filterInput, ...filters };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    organizationId,
    businessUnitId,
    searchString,
    quickFiltersKey,
    advancedFiltersKey,
    filtersKey,
  ]);

  // Debounced fetch function to prevent multiple API calls.
  // Created once per *content* change (see graphqlQueryKey above) rather than once
  // per render, so its identity — and therefore the fetch effect's dependency — is
  // stable across renders.
  const fetchUsers = useMemo(
    () =>
      debounce(async (currentPage: number, currentPageSize: number, currentFilters: UserFilterInput) => {
        if (skip) {
          setUsers([]);
          setTotalCount(0);
          setLoading(false);
          setError(null);
          return;
        }

        if (!graphqlQuery?.text || !graphqlQuery.text.trim()) {
          // No query configured (or blank query text). This is a normal "nothing to
          // fetch" state, not an error. Clear any previously-loaded results too, so
          // that removing/changing the query never leaves the last user's list on
          // screen (consistent with the `skip` branch above).
          reactory?.log(
            '[useUserQuery] No GraphQL query text provided; skipping fetch',
            { graphqlQuery },
            'debug'
          );
          setUsers([]);
          setTotalCount(0);
          setLoading(false);
          setError(null);
          return;
        }

        try {
          setLoading(true);
          setError(null);

          const variables = {
            paging: {
              page: currentPage,
              pageSize: currentPageSize,
            },
            filter: currentFilters,
          };

          reactory?.log(
            `[useUserQuery] Fetching users: page=${currentPage}, pageSize=${currentPageSize}`,
            { variables },
            'debug'
          );

          const result: any = await reactory.graphqlQuery(graphqlQuery.text, variables);

          if (result.errors && result.errors.length > 0) {
            throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
          }

          // Handle the expected response structure for ReactoryUsers query
          let usersData: Reactory.Models.IUser[] = [];
          let totalCountData = 0;

          // Expected structure: { ReactoryUsers: { users: [...], paging: {...} } }
          const queryResult = result.data?.[graphqlQuery.name];

          if (queryResult) {
            usersData = queryResult.users || [];
            totalCountData = queryResult.paging?.total || 0;
          } else {
            // Fallback: try to find any field containing users
            const dataKeys = Object.keys(result.data || {});
            const usersKey = dataKeys.find(key => key.toLowerCase().includes('users'));

            if (usersKey && result.data[usersKey]) {
              const usersResult = result.data[usersKey];
              if (Array.isArray(usersResult)) {
                usersData = usersResult;
              } else if (usersResult.users) {
                usersData = usersResult.users;
                totalCountData = usersResult.paging?.total || 0;
              }
            }
          }

          setUsers(usersData);
          setTotalCount(totalCountData);
          setError(null);

          reactory?.log(`[useUserQuery] Fetched ${usersData.length} users (total: ${totalCountData})`, {}, 'debug');

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setError(new Error(errorMessage));
          setUsers([]);
          setTotalCount(0);

          reactory?.log(`[useUserQuery] Error fetching users: ${errorMessage}`, { error: err }, 'error');
        } finally {
          setLoading(false);
        }
      }, 300), // 300ms debounce delay
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graphqlQueryKey, skip, reactory]
  );

  // Effect to trigger fetch when dependencies change
  useEffect(() => {
    reactory?.log('[useUserQuery] useEffect triggered', {
      page,
      pageSize,
      hasFilters: Object.keys(combinedFilters).length > 0,
      graphqlQueryName: graphqlQuery?.name,
      graphqlQueryTextLength: graphqlQuery?.text?.length
    }, 'debug');
    fetchUsers(page, pageSize, combinedFilters);
    return () => {
      fetchUsers.cancel?.();
    };
  }, [fetchUsers, page, pageSize, combinedFilters]);

  // Manual refetch function
  const refetch = useMemo(() => {
    return () => {
      fetchUsers.cancel?.(); // Cancel any pending request
      return fetchUsers(page, pageSize, combinedFilters);
    };
  }, [fetchUsers, page, pageSize, combinedFilters]);

  // Reset to first page when search changes
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [searchString]);

  return {
    users,
    loading,
    error,
    totalCount,
    page,
    pageSize,
    searchString,
    setPage,
    setPageSize,
    setSearchString,
    refetch,
  };
};

export default useUserQuery;
