/**
 * GraphQL fragments for UserList component
 * @module UserList/graphql/fragments
 */

import { gql } from '@apollo/client';

/**
 * Core user fields fragment
 * Includes essential user information needed for display
 */
export const USER_FRAGMENT = gql`
  fragment UserFragment on User {
    id
    firstName
    lastName
    fullName
    fullNameWithEmail
    email
    mobileNumber
    avatar
    deleted
    lastLogin
    roles
    createdAt
    updatedAt
  }
`;

/**
 * User with organization fragment
 * Includes organization and business unit information
 */
export const USER_WITH_ORG_FRAGMENT = gql`
  ${USER_FRAGMENT}
  fragment UserWithOrgFragment on User {
    ...UserFragment
    organization {
      id
      name
    }
    businessUnit {
      id
      name
    }
  }
`;

/**
 * User with membership fragment
 * Includes active membership information
 */
export const USER_WITH_MEMBERSHIP_FRAGMENT = gql`
  ${USER_WITH_ORG_FRAGMENT}
  fragment UserWithMembershipFragment on User {
    ...UserWithOrgFragment
    activeMembership {
      id
      roles
      enabled
      lastLogin
    }
  }
`;

/**
 * Pagination result fragment
 */
export const PAGING_RESULT_FRAGMENT = gql`
  fragment PagingResultFragment on PagingResult {
    page
    pageSize
    total
    hasNext
  }
`;

