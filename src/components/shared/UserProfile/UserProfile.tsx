import React, { useCallback } from 'react';
import { Box, Container, Paper, Typography, Alert, useTheme } from '@mui/material';
import Reactory from '@reactory/reactory-core';
import {
  UserProfileProps,
  ProfileConfiguration,
  DEFAULT_PROFILE_CONFIG
} from './types';
import { useProfileData } from './hooks/useProfileData';
import { useProfileSections } from './hooks/useProfileSections';
import { useProfileMutations } from './hooks/useProfileMutations';
import { ProfileNavigation } from './components/ProfileNavigation';
import { ProfileHeader } from './components/ProfileHeader';
import { GeneralSection } from './components/sections/Account';
import { MembershipsSection } from './components/sections/Memberships';
import { DemographicsSection } from './components/sections/Demographics';
import { OrganigramSection } from './components/sections/Organigram';

/**
 * Main UserProfile component - Modern profile management system
 * Replaces the monolithic Profile.tsx with a modular, configurable architecture
 */
const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  profile: initialProfile,
  configuration = {},
  mode = 'view',
  onProfileSave,
  onProfileCancel,
  onPeersConfirmed,
  onSectionChange,
  reactory,
  className,
  style
}) => {
  // Merge configuration with defaults
  const config: ProfileConfiguration = {
    ...DEFAULT_PROFILE_CONFIG,
    ...configuration,
    sections: configuration.sections ?
      [...DEFAULT_PROFILE_CONFIG.sections, ...configuration.sections] :
      DEFAULT_PROFILE_CONFIG.sections
  };  
  const loggedInUser = reactory.getUser().loggedIn;
  const profileData = useProfileData(userId || loggedInUser.id, initialProfile, reactory);
  const sections = useProfileSections(config, [], [], reactory);
  const mutations = useProfileMutations(profileData.profile?.id, reactory);
  const theme = useTheme();

  // Event handlers
  const handleProfileUpdate = useCallback((updates: Partial<import('./types').ProfileUser>) => {
    profileData.updateProfile(updates);
  }, [profileData]);

  const handleProfileSave = useCallback(async (profile: import('./types').ProfileUser) => {
    const success = await mutations.saveProfile(profile);
    if (success && onProfileSave) {
      onProfileSave(profile);
    }
  }, [mutations, onProfileSave]);

  const handleSectionChange = useCallback((sectionId: string) => {
    sections.navigateToSection(sectionId);
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
  }, [sections, onSectionChange]);

  const handleMembershipSelect = useCallback((membership: Reactory.Models.IMembership) => {
    // Update local profile state with selected membership
    if (profileData.profile) {
      const updatedMemberships = profileData.profile.memberships?.map(m =>
        m.id === membership.id ? { ...m, ...membership } : m
      ) || [];
      profileData.updateProfile({ memberships: updatedMemberships });
    }
  }, [profileData]);

  // Render section content based on current section
  const renderSectionContent = () => {
    if (!profileData.profile) return null;

    const commonProps = {
      profile: profileData.profile,
      mode,
      loading: profileData.loading || mutations.loading,
      onProfileUpdate: handleProfileUpdate,
      onSave: handleProfileSave,
      reactory
    };

    switch (sections.currentSection) {
      case 'general':
        return (
          <GeneralSection
            {...commonProps}
            withAvatar={config.features.withAvatar}
          />
        );

      case 'memberships':
        return (
          <MembershipsSection
            {...commonProps}
            selectedMembership={profileData.profile.memberships?.[0]} // TODO: Add proper selection state
            onMembershipSelect={handleMembershipSelect}
          />
        );

      case 'demographics':
        return (
          <DemographicsSection
            {...commonProps}
            selectedMembership={profileData.profile.memberships?.[0]}
            organizationId={profileData.profile.memberships?.[0]?.organization?.id as string}
          />
        );

      case 'organigram':
        return (
          <OrganigramSection
            {...commonProps}
            selectedMembership={profileData.profile.memberships?.[0]}
            onPeersConfirmed={onPeersConfirmed}
          />
        );

      default:
        // Try to render custom section
        const customSection = sections.getSectionById(sections.currentSection);
        if (customSection) {
          // For custom sections, try to get the component from reactory
          const CustomComponent = reactory.getComponent<React.ComponentType<any>>(customSection.component);
          if (CustomComponent) {
            return (
              <CustomComponent
                {...commonProps}
                {...(customSection.props || {})}
                selectedMembership={profileData.profile.memberships?.[0]}
              />
            );
          }
        }

        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="error" gutterBottom>
              Section Not Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The section "{sections.currentSection}" could not be loaded.
            </Typography>
          </Paper>
        );
    }
  };

  // Error state
  if (profileData.error && !profileData.loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Error Loading Profile
          </Typography>
          <Typography variant="body2">
            {profileData.error}
          </Typography>
        </Alert>
      </Container>
    );
  }

  // Loading state
  if (profileData.loading && !profileData.profile) {
    return (
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            Loading profile...
          </Typography>
        </Paper>
      </Container>
    );
  }

  // No profile state
  if (!profileData.profile) {
    return (
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Profile Not Found
          </Typography>
          <Typography variant="body2">
            The requested profile could not be found or you don't have permission to view it.
          </Typography>
        </Alert>
      </Container>
    );
  }

  // Main render
  return (
    <Container
      maxWidth="lg"
      className={className}
      style={style}
      sx={{
        py: 2,
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default
      }}
    >
      {/* Profile Header */}
      <ProfileHeader
        profile={profileData.profile}
        mode={mode}
        isOwner={profileData.isOwner}
        isAdmin={profileData.isAdmin}
        loading={profileData.loading || mutations.loading}
        onEdit={() => {/* TODO: Implement edit mode toggle */}}
        onSave={handleProfileSave}
        onCancel={onProfileCancel}
        onDelete={mutations.deleteProfile}
        reactory={reactory}
      />

      {/* Navigation and Content Layout */}
      <Box sx={{
        display: 'flex',
        flexDirection: {
          xs: 'column',
          md: config.navigation.type === 'sidebar' ? 'row' : 'column'
        },
        gap: 2,
        mt: 2
      }}>
        {/* Navigation */}
        {sections.visibleSections.length > 1 && (
          <ProfileNavigation
            sections={sections.visibleSections}
            currentSection={sections.currentSection}
            onSectionChange={handleSectionChange}
            type={config.navigation.type}
            position={config.navigation.position}
          />
        )}

        {/* Section Content */}
        <Box sx={{ flex: 1 }}>
          {renderSectionContent()}
        </Box>
      </Box>

      {/* Error Display */}
      {(profileData.error || mutations.error) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {profileData.error || mutations.error}
          </Typography>
        </Alert>
      )}
    </Container>
  );
};

export default UserProfile;
