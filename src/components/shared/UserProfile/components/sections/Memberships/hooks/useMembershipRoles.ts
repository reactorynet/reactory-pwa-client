import { useState, useCallback } from 'react';
import Reactory from '@reactory/reactory-core';

/**
 * Hook for managing membership roles
 */
export const useMembershipRoles = (
  userId: string | undefined,
  membership: Reactory.Models.IMembership | null,
  reactory: Reactory.Client.ReactorySDK | Reactory.Client.IReactoryApi
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update roles for a membership
  const updateRoles = useCallback(async (
    membershipId: string,
    roles: string[]
  ): Promise<boolean> => {
    if (!userId || !reactory) {
      setError('User ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const mutation = `
        mutation SetMembershipRoles($userId: String!, $membershipId: String!, $roles: [String]!){
          ReactoryCoreSetRolesForMembership(user_id: $userId, id: $membershipId, roles: $roles) {
            success
            message
            payload
          }
        }
      `;

      const result = await reactory.graphqlMutation<
        {
          ReactoryCoreSetRolesForMembership: {
            success: boolean;
            message: string;
            payload: any;
          }
        },
        { userId: string; membershipId: string; roles: string[] }
      >(mutation, { userId, membershipId, roles });

      if (result.data?.ReactoryCoreSetRolesForMembership?.success) {
        reactory.createNotification(
          result.data.ReactoryCoreSetRolesForMembership.message,
          { type: 'success' }
        );
        return true;
      } else {
        throw new Error('Failed to update roles');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update membership roles';
      setError(errorMessage);
      reactory?.createNotification('Failed to update membership roles', { type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, reactory]);

  // Toggle a specific role
  const toggleRole = useCallback(async (
    role: string,
    enabled: boolean
  ): Promise<boolean> => {
    if (!membership) {
      setError('No membership selected');
      return false;
    }

    const currentRoles = membership.roles || [];
    let newRoles: string[];

    if (enabled) {
      newRoles = [...currentRoles, role];
    } else {
      newRoles = currentRoles.filter(r => r !== role);
    }

    return updateRoles(membership.id as string, newRoles);
  }, [membership, updateRoles]);

  // Get available application roles
  const getAvailableRoles = useCallback(() => {
    return reactory.getApplicationRoles()?.filter(role => role !== 'ANON') || [];
  }, [reactory]);

  // Check if a role is enabled
  const hasRole = useCallback((role: string) => {
    return membership?.roles?.includes(role) || false;
  }, [membership]);

  return {
    updateRoles,
    toggleRole,
    getAvailableRoles,
    hasRole,
    loading,
    error
  };
};
