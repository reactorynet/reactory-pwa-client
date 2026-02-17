import { useState, useEffect, useCallback, useMemo } from 'react';
import Reactory from '@reactorynet/reactory-core';
import { ProfileUser, ProfileMode, UseProfileDataResult, PROFILE_DATA_FRAGMENT } from '../types';

const EMPTY_PROFILE = {
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  mobileNumber: '',
  avatar: '',
  socials: [],
  __isnew: true,
} as unknown as ProfileUser;

/**
 * Hook for managing profile data loading and state
 * Based on existing Connected/UserProfile.tsx and hooks/useProfile.tsx patterns
 * 
 * When mode is 'new', no fetch is performed and an empty profile is used.
 */
export const useProfileData = (
  userId?: string,
  initialProfile?: ProfileUser,
  reactory?: Reactory.Client.ReactorySDK,
  mode?: ProfileMode
): UseProfileDataResult => {
  const isNewMode = mode === 'new';
  const [profile, setProfile] = useState<ProfileUser | null>(
    isNewMode ? { ...EMPTY_PROFILE } : (initialProfile || null)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user for ownership checks
  const currentUser = reactory?.getUser();
  const targetUserId = isNewMode ? undefined : (userId || initialProfile?.id || currentUser?.id);

  // Computed properties
  const isOwner = useMemo(() => {
    return Boolean(currentUser && targetUserId && currentUser.id === targetUserId);
  }, [currentUser, targetUserId]);

  const isAdmin = useMemo(() => {
    return Boolean(reactory?.hasRole(['ADMIN']));
  }, [reactory]);

  const isNew = useMemo(() => {
    return isNewMode || !profile || !profile.id;
  }, [isNewMode, profile]);

  // GraphQL query for profile data
  const PROFILE_QUERY = `
    query GetUserProfile($userId: String!) {
      userWithId(id: $userId) {
        ...ProfileData
        peers {
          organization {
            id
            name
            avatar
          }
          user {
            id
            firstName
            lastName
          }
          peers {
            user {
              id
              firstName
              lastName
              email
              avatar
            }            
            relationship
          }          
        }
      }
    }
    ${PROFILE_DATA_FRAGMENT}
  `;

  // Fetch profile data
  const fetchProfile = useCallback(async (id?: string) => {
    if (isNewMode) return; // Don't fetch in new mode
    
    if (!id && !targetUserId) {
      setError('No user ID provided');
      return;
    }

    const profileId = id || targetUserId;
    if (!profileId || !reactory) return;

    try {
      setLoading(true);
      setError(null);

      const result = await reactory.graphqlQuery<
        { userWithId: ProfileUser },
        { userId: string }
      >(PROFILE_QUERY, { userId: profileId });

      if (result.data?.userWithId) {
        setProfile(result.data.userWithId);
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      setError(errorMessage);
      reactory.log('Error fetching profile', { error: err }, 'error');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, reactory, PROFILE_QUERY, isNewMode]);

  // Refetch profile data
  const refetch = useCallback(async (): Promise<void> => {
    if (profile?.id) {
      await fetchProfile(profile.id);
    }
  }, [profile?.id, fetchProfile]);

  // Update profile in local state (optimistic updates)
  const updateProfile = useCallback((updates: Partial<ProfileUser>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Reset profile state
  const reset = useCallback(() => {
    setProfile(isNewMode ? { ...EMPTY_PROFILE } : (initialProfile || null));
    setError(null);
    setLoading(false);
  }, [initialProfile, isNewMode]);

  // Load profile on mount or when userId changes
  useEffect(() => {
    if (isNewMode) return; // Skip fetch in new mode
    if (!profile && (targetUserId || initialProfile)) {
      fetchProfile();
    }
  }, [targetUserId, profile, fetchProfile, initialProfile, isNewMode]);

  // Update profile when initialProfile changes
  useEffect(() => {
    if (initialProfile && initialProfile !== profile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  return {
    profile,
    loading,
    error,
    isOwner,
    isAdmin,
    isNew,
    refetch,
    updateProfile,
    reset
  };
};
