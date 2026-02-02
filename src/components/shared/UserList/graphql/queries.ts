/**
 * GraphQL queries for UserList component
 * @module UserList/graphql/queries
 */

import { gql } from '@apollo/client';
import {
  USER_WITH_MEMBERSHIP_FRAGMENT,
  USER_FRAGMENT,
  PAGING_RESULT_FRAGMENT,
} from './fragments';

/**
 * Search users query (existing query for backward compatibility)
 * 
 * @deprecated Use REACTORY_USERS_QUERY when available
 */
export const SEARCH_USER_QUERY = gql`
  ${USER_FRAGMENT}
  query SearchUser($searchString: String!, $sort: String) {
    searchUser(searchString: $searchString, sort: $sort) {
      ...UserFragment
    }
  }
`;

/**
 * Get all users query (existing query for backward compatibility)
 * 
 * @deprecated Use REACTORY_USERS_QUERY when available
 */
export const ALL_USERS_QUERY = gql`
  ${USER_FRAGMENT}
  query AllUsers {
    allUsers {
      ...UserFragment
    }
  }
`;

/**
 * Main query for fetching paged user list with filters (alias)
 */
export const REACTORY_USER_LIST_QUERY = gql`
  ${USER_FRAGMENT}
  ${PAGING_RESULT_FRAGMENT}
  query ReactoryUserListQuery(
    $paging: PagingRequest
    $filter: ReactoryUserFilterInput
  ) {
    ReactoryUsers(
      paging: $paging
      filter: $filter
    ) {
      users {
        ...UserFragment
      }
      paging {
        ...PagingResultFragment
      }
    }
  }
`;

/**
 * New comprehensive users query with filtering and pagination
 * This is the preferred query but may not be available in all backends yet
 */
export const REACTORY_USERS_QUERY = gql`
  ${USER_WITH_MEMBERSHIP_FRAGMENT}
  ${PAGING_RESULT_FRAGMENT}
  
  query ReactoryUsers(
    $filter: ReactoryUserFilterInput
    $paging: PagingRequest
  ) {
    ReactoryUsers(filter: $filter, paging: $paging) {
      users {
        ...UserWithMembershipFragment
      }
      paging {
        ...PagingResultFragment
      }
    }
  }
`;

/**
 * Get user by ID query
 */
export const GET_USER_QUERY = gql`
  ${USER_WITH_MEMBERSHIP_FRAGMENT}
  query GetUser($id: String!) {
    userWithId(id: $id) {
      ...UserWithMembershipFragment
    }
  }
`;

/**
 * Query variables type for ReactoryUsers query
 */
export interface ReactoryUsersQueryVariables {
  filter?: {
    organizationId?: string;
    businessUnitId?: string;
    teamId?: string;
    roles?: string[];
    includeDeleted?: boolean;
    searchString?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    lastLoginAfter?: Date;
    lastLoginBefore?: Date;
    firstName?: string;
    lastName?: string;
    email?: string;
    customFilters?: Record<string, any>;
  };
  paging?: {
    page?: number;
    pageSize?: number;
  };
}

/**
 * Query result type for ReactoryUsers query
 */
export interface ReactoryUsersQueryResult {
  ReactoryUsers: {
    users: any[]; // Will be typed as Reactory.Models.IUser[] in consuming code
    paging: {
      page: number;
      pageSize: number;
      total: number;
      hasNext: boolean;
    };
  };
}

/**
 * Query result type for SearchUser query (fallback)
 */
export interface SearchUserQueryResult {
  searchUser: any[]; // Will be typed as Reactory.Models.IUser[] in consuming code
}

/**
 * Query result type for AllUsers query (fallback)
 */
export interface AllUsersQueryResult {
  allUsers: any[]; // Will be typed as Reactory.Models.IUser[] in consuming code
}

