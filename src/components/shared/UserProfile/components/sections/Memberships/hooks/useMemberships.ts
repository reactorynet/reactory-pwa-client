import { useState, useCallback } from 'react';
import Reactory from '@reactory/reactory-core';
import { ProfileUser } from '../../../../types';

/**
 * Hook for managing user memberships
 */
export const useMemberships = (
  userId: string | undefined,
  reactory: Reactory.Client.ReactorySDK | Reactory.Client.IReactoryApi
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add a new membership
  const addMembership = useCallback(async (
    membershipData: Partial<Reactory.Models.IMembership>
  ): Promise<boolean> => {
    if (!userId || !reactory) {
      setError('User ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const mutation = `
        mutation CreateUserMembership($userId: String!, $membership: MembershipInput!) {
          ReactoryCoreCreateUserMembership(user_id: $userId, membership: $membership) {
            success
            message
            membership {
              id
              roles
              businessUnit {
                id
                name
              }
              organization {
                id
                name
                avatar
              }
              client {
                id
                name
                avatar
              }
            }
          }
        }
      `;

      const result = await reactory.graphqlMutation<
        {
          ReactoryCoreCreateUserMembership: {
            success: boolean;
            message: string;
            membership: Reactory.Models.IMembership;
          }
        },
        { userId: string; membership: Partial<Reactory.Models.IMembership> }
      >(mutation, { userId, membership: membershipData });

      if (result.data?.ReactoryCoreCreateUserMembership?.success) {
        reactory.createNotification(
          result.data.ReactoryCoreCreateUserMembership.message,
          { type: 'success' }
        );
        return true;
      } else {
        throw new Error('Failed to create membership');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add membership';
      setError(errorMessage);
      reactory?.createNotification('Failed to add membership', { type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, reactory]);

  // Remove a membership
  const removeMembership = useCallback(async (
    membershipId: string
  ): Promise<boolean> => {
    if (!userId || !reactory) {
      setError('User ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const mutation = `
        mutation RemoveUserMembership($userId: String!, $membershipId: String!) {
          ReactoryCoreRemoveUserMembership(user_id: $userId, id: $membershipId) {
            success
            message
          }
        }
      `;

      const result = await reactory.graphqlMutation<
        {
          ReactoryCoreRemoveUserMembership: {
            success: boolean;
            message: string;
          }
        },
        { userId: string; membershipId: string }
      >(mutation, { userId, membershipId });

      if (result.data?.ReactoryCoreRemoveUserMembership?.success) {
        reactory.createNotification(
          result.data.ReactoryCoreRemoveUserMembership.message,
          { type: 'success' }
        );
        return true;
      } else {
        throw new Error('Failed to remove membership');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove membership';
      setError(errorMessage);
      reactory?.createNotification('Failed to remove membership', { type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, reactory]);

  return {
    addMembership,
    removeMembership,
    loading,
    error
  };
};
