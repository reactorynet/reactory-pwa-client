import { useState, useCallback } from 'react';
import Reactory from '@reactorynet/reactory-core';
import { ProfileUser, SocialReference, UseProfileMutationsResult, PeerUser, PROFILE_DATA_FRAGMENT } from '../types';

/**
 * Hook for managing profile mutations (save, delete, update operations)
 * Based on existing Connected/EditProfile.tsx patterns
 */
export const useProfileMutations = (
  profileId: string | undefined,
  reactory?: Reactory.Client.ReactorySDK,
  applicationId?: string
): UseProfileMutationsResult => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Save profile changes
  const saveProfile = useCallback(async (profile: ProfileUser): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      // Clean up profile data for save (remove computed fields)
      const profileData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        mobileNumber: profile.mobileNumber,
        avatar: profile.avatar,
        // Include other savable fields as needed
      };

      const mutation = `
        mutation UpdateUserProfile($userId: String!, $profileData: UpdateUserInput!) {
          updateUser(id: $userId, profileData: $profileData) {
            id
            firstName
            lastName
            email
            mobileNumber
            avatar
          }
        }
      `;

      const result = await reactory.graphqlMutation<
        { updateUser: ProfileUser },
        { userId: string; profileData: Partial<ProfileUser> }
      >(mutation, { userId: profileId, profileData });

      if (result.data?.updateUser) {
        reactory.createNotification('Profile updated successfully', { type: 'success' });
        return true;
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile';
      setError(errorMessage);
      reactory?.createNotification('Failed to save profile', { type: 'error' });
      reactory?.log('Error saving profile', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  // Delete profile
  const deleteProfile = useCallback(async (): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      const mutation = `
        mutation DeleteUserProfile($userId: String!) {
          deleteUser(id: $userId)
        }
      `;

      const result = await reactory.graphqlMutation<
        { deleteUser: boolean },
        { userId: string }
      >(mutation, { userId: profileId });

      if (result.data?.deleteUser) {
        reactory.createNotification('Profile deleted successfully', { type: 'success' });
        return true;
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete profile';
      setError(errorMessage);
      reactory?.createNotification('Failed to delete profile', { type: 'error' });
      reactory?.log('Error deleting profile', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  // Update avatar
  const updateAvatar = useCallback(async (avatarData: string): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      const mutation = `
        mutation UpdateUserAvatar($userId: String!, $avatar: String!) {
          updateUser(id: $userId, profileData: { avatar: $avatar }) {
            id
            avatar
          }
        }
      `;

      const result = await reactory.graphqlMutation<
        { updateUser: { id: string; avatar: string } },
        { userId: string; avatar: string }
      >(mutation, { userId: profileId, avatar: avatarData });

      if (result.data?.updateUser) {
        reactory.createNotification('Avatar updated successfully', { type: 'success' });
        return true;
      } else {
        throw new Error('Avatar update failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update avatar';
      setError(errorMessage);
      reactory?.createNotification('Failed to update avatar', { type: 'error' });
      reactory?.log('Error updating avatar', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  // Membership operations
  const createMembership = useCallback(async (
    membership: Partial<Reactory.Models.IMembership>
  ): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      const mutation = `
        mutation CreateUserMembership($userId: String!, $membership: MembershipInput!) {
          ReactoryCoreCreateUserMembership(user_id: $userId, membership: $membership) {
            success
            message
            membership {
              id
              roles
              confirmed
              confirmedAt
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
      >(mutation, { userId: profileId, membership });

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
      const errorMessage = err instanceof Error ? err.message : 'Failed to create membership';
      setError(errorMessage);
      reactory?.createNotification('Failed to create membership', { type: 'error' });
      reactory?.log('Error creating membership', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  const updateMembership = useCallback(async (
    membershipId: string,
    updates: Partial<Reactory.Models.IMembership>
  ): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      const mutation = `
        mutation UpdateMembershipRoles($userId: String!, $membershipId: String!, $roles: [String]!) {
          ReactoryCoreSetRolesForMembership(user_id: $userId, id: $membershipId, roles: $roles) {
            success
            message
          }
        }
      `;

      const result = await reactory.graphqlMutation<
        {
          ReactoryCoreSetRolesForMembership: {
            success: boolean;
            message: string;
          }
        },
        { userId: string; membershipId: string; roles: string[] }
      >(mutation, {
        userId: profileId,
        membershipId,
        roles: updates.roles || []
      });

      if (result.data?.ReactoryCoreSetRolesForMembership?.success) {
        reactory.createNotification(
          result.data.ReactoryCoreSetRolesForMembership.message,
          { type: 'success' }
        );
        return true;
      } else {
        throw new Error('Failed to update membership');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update membership';
      setError(errorMessage);
      reactory?.createNotification('Failed to update membership', { type: 'error' });
      reactory?.log('Error updating membership', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  const deleteMembership = useCallback(async (membershipId: string): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

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
      >(mutation, { userId: profileId, membershipId });

      if (result.data?.ReactoryCoreRemoveUserMembership?.success) {
        reactory.createNotification(
          result.data.ReactoryCoreRemoveUserMembership.message,
          { type: 'success' }
        );
        return true;
      } else {
        throw new Error('Failed to delete membership');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete membership';
      setError(errorMessage);
      reactory?.createNotification('Failed to delete membership', { type: 'error' });
      reactory?.log('Error deleting membership', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  // Peer operations (organigram)
  const setPeerRelationship = useCallback(async (
    peerId: string,
    relationship: PeerUser['relationship']
  ): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      const mutation = `
        mutation SetPeerRelationship($id: String!, $peer: String!, $relationship: PeerType) {
          setPeerRelationShip(id: $id, peer: $peer, organization: "*", relationship: $relationship) {
            user {
              id
              firstName
              lastName
            }
            organization {
              id
              name
              avatar
            }
            peers {
              user {
                id
                firstName
                lastName
                email
                avatar
              }
              isInternal
              inviteSent
              confirmed
              confirmedAt
              relationship
            }
            allowEdit
            confirmedAt
            createdAt
            updatedAt
          }
        }
      `;

      const result = await reactory.graphqlMutation<
        { setPeerRelationShip: any },
        { id: string; peer: string; relationship: string }
      >(mutation, { id: profileId, peer: peerId, relationship });

      if (result.data?.setPeerRelationShip) {
        reactory.createNotification(
          `Peer relationship updated to ${relationship}`,
          { type: 'success' }
        );
        return true;
      } else {
        throw new Error('Failed to set peer relationship');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update peer relationship';
      setError(errorMessage);
      reactory?.createNotification('Failed to update peer relationship', { type: 'error' });
      reactory?.log('Error setting peer relationship', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  const removePeer = useCallback(async (peerId: string): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      const mutation = `
        mutation RemovePeer($id: String!, $peer: String!) {
          removePeer(id: $id, peer: $peer, organization: "*") {
            user {
              id
              firstName
              lastName
            }
            organization {
              id
              name
              avatar
            }
            peers {
              user {
                id
                firstName
                lastName
                email
                avatar
              }
              isInternal
              inviteSent
              confirmed
              confirmedAt
              relationship
            }
            allowEdit
            confirmedAt
            createdAt
            updatedAt
          }
        }
      `;

      const result = await reactory.graphqlMutation<
        { removePeer: any },
        { id: string; peer: string }
      >(mutation, { id: profileId, peer: peerId });

      if (result.data?.removePeer) {
        reactory.createNotification('Peer removed successfully', { type: 'success' });
        return true;
      } else {
        throw new Error('Failed to remove peer');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove peer';
      setError(errorMessage);
      reactory?.createNotification('Failed to remove peer', { type: 'error' });
      reactory?.log('Error removing peer', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  const addPeer = useCallback(async (
    user: Reactory.Models.IUser,
    relationship: PeerUser['relationship']
  ): Promise<boolean> => {
    return setPeerRelationship(user.id, relationship);
  }, [setPeerRelationship]);

  // Create a new user for an application
  const createUser = useCallback(async (
    profile: ProfileUser,
    appId?: string
  ): Promise<ProfileUser | null> => {
    if (!reactory) {
      setError('Reactory instance not available');
      return null;
    }

    const targetClientId = appId || applicationId;
    if (!targetClientId) {
      setError('Application ID is required to create a user');
      return null;
    }

    try {
      setLoading(true);
      clearError();

      const mutation = `
        mutation CreateUserForApplication($input: CreateUserInput!, $clientId: String!, $password: String, $roles: [String]) {
          ReactoryCoreCreateUserForApplication(input: $input, clientId: $clientId, password: $password, roles: $roles) {
            ...ProfileData
          }
        }
        ${PROFILE_DATA_FRAGMENT}
      `;

      const result = await reactory.graphqlMutation<
        { ReactoryCoreCreateUserForApplication: ProfileUser },
        { input: { firstName: string; lastName: string; email: string; mobileNumber?: string; avatar?: string }; clientId: string; password?: string; roles?: string[] }
      >(mutation, {
        input: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          mobileNumber: profile.mobileNumber,
          avatar: profile.avatar,
        },
        clientId: targetClientId,
        roles: ['USER']
      });

      if (result.data?.ReactoryCoreCreateUserForApplication) {
        reactory.createNotification('User created successfully', { type: 'success' });
        return result.data.ReactoryCoreCreateUserForApplication;
      } else {
        throw new Error('Create user failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      reactory?.createNotification('Failed to create user', { type: 'error' });
      reactory?.log('Error creating user', { error: err }, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [reactory, applicationId, clearError]);

  // Update social media profiles for a user
  const updateSocials = useCallback(async (
    socials: SocialReference[]
  ): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      const mutation = `
        mutation UpdateUserSocials($userId: String!, $socials: [SocialReferenceInput]!) {
          ReactoryCoreUpdateUserSocials(userId: $userId, socials: $socials) {
            id
            socials {
              id
              provider
              url
              authenticated
              valid
            }
          }
        }
      `;

      const socialsInput = socials.map(({ provider, url }) => ({ provider, url }));

      const result = await reactory.graphqlMutation<
        { ReactoryCoreUpdateUserSocials: { id: string; socials: SocialReference[] } },
        { userId: string; socials: { provider: string; url: string }[] }
      >(mutation, { userId: profileId, socials: socialsInput });

      if (result.data?.ReactoryCoreUpdateUserSocials) {
        reactory.createNotification('Social profiles updated successfully', { type: 'success' });
        return true;
      } else {
        throw new Error('Update socials failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update social profiles';
      setError(errorMessage);
      reactory?.createNotification('Failed to update social profiles', { type: 'error' });
      reactory?.log('Error updating socials', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  const confirmPeers = useCallback(async (): Promise<boolean> => {
    if (!profileId || !reactory) {
      setError('Profile ID or reactory instance not available');
      return false;
    }

    try {
      setLoading(true);
      clearError();

      const surveyId = localStorage.getItem('surveyId');

      const mutation = `
        mutation ConfirmPeers($id: String!, $surveyId: String) {
          confirmPeers(id: $id, organization: "*", surveyId: $surveyId) {
            user {
              id
              firstName
              lastName
            }
            organization {
              id
              name
              avatar
            }
            peers {
              user {
                id
                firstName
                lastName
                email
                avatar
              }
              isInternal
              inviteSent
              confirmed
              confirmedAt
              relationship
            }
            allowEdit
            confirmedAt
            createdAt
            updatedAt
          }
        }
      `;

      const result = await reactory.graphqlMutation<
        { confirmPeers: any },
        { id: string; surveyId: string | null }
      >(mutation, { id: profileId, surveyId });

      if (result.data?.confirmPeers) {
        reactory.createNotification('Peers confirmed successfully', { type: 'success' });
        reactory.emit('mores_onDelegateAction_confirm-delegate', {
          profile: result.data.confirmPeers,
          surveyId
        });
        return true;
      } else {
        throw new Error('Failed to confirm peers');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm peers';
      setError(errorMessage);
      reactory?.createNotification('Failed to confirm peers', { type: 'error' });
      reactory?.log('Error confirming peers', { error: err }, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [profileId, reactory, clearError]);

  return {
    saveProfile,
    createUser,
    deleteProfile,
    updateAvatar,
    updateSocials,
    createMembership,
    updateMembership,
    deleteMembership,
    setPeerRelationship,
    removePeer,
    confirmPeers,
    addPeer,
    loading,
    error
  };
};
