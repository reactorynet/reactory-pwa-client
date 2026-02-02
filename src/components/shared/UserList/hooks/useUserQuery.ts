/**
 * useUserQuery Hook
 *
 * Manages GraphQL query execution and data fetching for the UserList component.
 * Implements proper GraphQL integration with debouncing, error handling, and filtering.
 *
 * @module UserList/hooks/useUserQuery
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { debounce } from 'lodash';
import type Reactory from '@reactory/reactory-core';
import type {
  UseUserQueryOptions,
  UseUserQueryResult,
  UserFilterInput,
} from '../types';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

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
  console.log('[useUserQuery] Hook called with:', {
    hasQuery: !!graphqlQuery,
    queryName: graphqlQuery?.name,
    organizationId,
    businessUnitId,
    filters,
    initialPage,
    initialPageSize,
    initialSearchString,
    quickFilters: quickFilters?.size || 0,
    advancedFilters: advancedFilters?.length || 0,
    skip,
    callTime: Date.now()
  });

  // Internal state
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchString, setSearchString] = useState(initialSearchString);
  const [users, setUsers] = useState<Reactory.Models.IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const reactory = useReactory();

  // Build filter object combining all filters
  const combinedFilters = useMemo((): UserFilterInput => {
    console.log('[useUserQuery] Computing combinedFilters:', {
      organizationId,
      businessUnitId,
      searchString,
      quickFiltersSize: quickFilters?.size,
      advancedFiltersLength: advancedFilters?.length,
      filtersKeys: Object.keys(filters || {})
    });

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
  }, [organizationId, businessUnitId, searchString, quickFilters, advancedFilters, filters]);

  // Debounced fetch function to prevent multiple API calls
  const fetchUsers = useCallback(
    debounce(async (currentPage: number, currentPageSize: number, currentFilters: UserFilterInput) => {
      console.log('[useUserQuery] fetchUsers called:', {
        currentPage,
        currentPageSize,
        currentFilters,
        skip,
        queryTextLength: graphqlQuery?.text?.length,
        queryName: graphqlQuery?.name
      });

      if (skip) {
        console.log('[useUserQuery] Skipping fetch due to skip=true');
        setUsers([]);
        setTotalCount(0);
        setLoading(false);
        setError(null);
        return;
      }

      if (!graphqlQuery?.text) {
        console.log('[useUserQuery] ERROR: No GraphQL query text provided');
        setError(new Error('No GraphQL query text provided'));
        setUsers([]);
        setTotalCount(0);
        setLoading(false);
        reactory?.log('[useUserQuery] ERROR: No GraphQL query text provided', { graphqlQuery }, 'error');
        return;
      }

      if (!graphqlQuery?.text.trim()) {
        console.log('[useUserQuery] ERROR: GraphQL query text is empty');
        setError(new Error('GraphQL query text is empty'));
        setUsers([]);
        setTotalCount(0);
        setLoading(false);
        reactory?.log('[useUserQuery] ERROR: GraphQL query text is empty', { graphqlQuery }, 'error');
        return;
      }

      try {
        console.log('[useUserQuery] Starting GraphQL call');
        setLoading(true);
        setError(null);

        const variables = {
          paging: {
            page: currentPage,
            pageSize: currentPageSize,
          },
          filter: currentFilters,
        };

        console.log('[useUserQuery] GraphQL variables:', variables);
        reactory?.log(`[useUserQuery] Fetching users: page=${currentPage}, pageSize=${currentPageSize}`, { variables }, 'debug');

        const result: any = await reactory.graphqlQuery(graphqlQuery.text, variables);
        console.log('[useUserQuery] GraphQL response received:', {
          hasData: !!result.data,
          hasErrors: !!(result.errors && result.errors.length > 0),
          dataKeys: result.data ? Object.keys(result.data) : []
        });

        if (result.errors && result.errors.length > 0) {
          console.log('[useUserQuery] GraphQL errors:', result.errors);
          throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
        }

        // Handle the expected response structure for ReactoryUsers query
        console.log('[useUserQuery] Processing response data');
        let usersData: Reactory.Models.IUser[] = [];
        let totalCountData = 0;

        // Expected structure: { ReactoryUsers: { users: [...], paging: {...} } }
        const queryResult = result.data?.[graphqlQuery.name];
        console.log('[useUserQuery] Query result:', {
          queryName: graphqlQuery.name,
          hasQueryResult: !!queryResult,
          queryResultKeys: queryResult ? Object.keys(queryResult) : []
        });

        if (queryResult) {
          usersData = queryResult.users || [];
          totalCountData = queryResult.paging?.total || 0;
          console.log('[useUserQuery] Extracted data from query result:', {
            usersCount: usersData.length,
            totalCount: totalCountData
          });
        } else {
          // Fallback: try to find any field containing users
          const dataKeys = Object.keys(result.data || {});
          const usersKey = dataKeys.find(key => key.toLowerCase().includes('users'));
          console.log('[useUserQuery] Using fallback extraction:', {
            dataKeys,
            usersKey,
            hasUsersKey: !!(usersKey && result.data[usersKey])
          });

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

        console.log('[useUserQuery] Final data:', {
          usersCount: usersData.length,
          totalCount: totalCountData,
          hasError: false
        });

        setUsers(usersData);
        setTotalCount(totalCountData);
        setError(null);

        reactory?.log(`[useUserQuery] Fetched ${usersData.length} users (total: ${totalCountData})`, {}, 'debug');

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.log('[useUserQuery] Error occurred:', {
          errorMessage,
          errorType: err?.constructor?.name,
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(new Error(errorMessage));
        setUsers([]);
        setTotalCount(0);

        reactory?.log(`[useUserQuery] Error fetching users: ${errorMessage}`, { error: err }, 'error');
      } finally {
        console.log('[useUserQuery] Setting loading to false');
        setLoading(false);
      }
    }, 300), // 300ms debounce delay
    [graphqlQuery, skip, reactory]
  );

  // Effect to trigger fetch when dependencies change
  useEffect(() => {
    console.log('[useUserQuery] useEffect triggered', {
      page,
      pageSize,
      combinedFiltersKeys: Object.keys(combinedFilters),
      graphqlQueryName: graphqlQuery?.name,
      graphqlQueryTextLength: graphqlQuery?.text?.length,
      fetchUsersRef: fetchUsers.toString().slice(0, 50) + '...',
      effectTime: Date.now()
    });
    reactory?.log('[useUserQuery] useEffect triggered', {
      page,
      pageSize,
      hasFilters: Object.keys(combinedFilters).length > 0,
      graphqlQueryName: graphqlQuery?.name,
      graphqlQueryTextLength: graphqlQuery?.text?.length
    }, 'debug');
    fetchUsers(page, pageSize, combinedFilters);
    return () => {
      console.log('[useUserQuery] Cleaning up useEffect');
      fetchUsers.cancel?.();
    };
  }, [fetchUsers, page, pageSize, combinedFilters]);

  // Manual refetch function
  const refetch = useCallback(() => {
    fetchUsers.cancel?.(); // Cancel any pending request
    return fetchUsers(page, pageSize, combinedFilters);
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