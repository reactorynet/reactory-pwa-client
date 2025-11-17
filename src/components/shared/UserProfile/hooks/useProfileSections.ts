import { useState, useCallback, useMemo } from 'react';
import Reactory from '@reactory/reactory-core';
import { ProfileSection, ProfileConfiguration, UseProfileSectionsResult, DEFAULT_PROFILE_CONFIG } from '../types';

/**
 * Hook for managing profile sections and navigation
 * Handles section filtering based on roles and permissions
 */
export const useProfileSections = (
  configuration: Partial<ProfileConfiguration> = {},
  userRoles: string[] = [],
  userPermissions: string[] = [],
  reactory?: Reactory.Client.ReactorySDK
): UseProfileSectionsResult => {
  // Merge configuration with defaults
  // Only use default sections if configuration doesn't provide any
  const config = useMemo(() => ({
    ...DEFAULT_PROFILE_CONFIG,
    ...configuration,
    sections: configuration.sections && configuration.sections.length > 0
      ? configuration.sections
      : DEFAULT_PROFILE_CONFIG.sections
  }), [configuration]);

  // Get user roles from reactory if not provided
  const actualUserRoles: string[] = userRoles.length > 0 ? userRoles :
    reactory?.getUser()?.loggedIn.roles as string[] || [];  

  // Filter sections based on roles
  const visibleSections = useMemo(() => {
    return config.sections
      .filter(section => {
        // Check if section is enabled
        if (!section.enabled) return false;

        // Check if user has required roles
        if (section.roles && section.roles.length > 0) {
          const hasRequiredRole = section.roles.some(role =>
            actualUserRoles.includes(role)
          );
          if (!hasRequiredRole) return false;
        }
        
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [config.sections, actualUserRoles]);

  // Current section state
  const [currentSection, setCurrentSection] = useState<string>(
    visibleSections.length > 0 ? visibleSections[0].id : 'general'
  );

  // Check if a section is visible to the user
  const isSectionVisible = useCallback((sectionId: string): boolean => {
    return visibleSections.some(section => section.id === sectionId);
  }, [visibleSections]);

  // Get a section by ID
  const getSectionById = useCallback((sectionId: string): ProfileSection | undefined => {
    return visibleSections.find(section => section.id === sectionId);
  }, [visibleSections]);

  // Navigate to a section (with validation)
  const navigateToSection = useCallback((sectionId: string): boolean => {
    if (isSectionVisible(sectionId)) {
      setCurrentSection(sectionId);
      return true;
    }
    return false;
  }, [isSectionVisible]);

  // Update current section when visible sections change
  // (e.g., when user roles change)
  useMemo(() => {
    if (currentSection && !isSectionVisible(currentSection)) {
      // Current section is no longer visible, switch to first available
      const firstVisible = visibleSections[0];
      if (firstVisible) {
        setCurrentSection(firstVisible.id);
      }
    }
  }, [currentSection, isSectionVisible, visibleSections]);

  return {
    sections: config.sections,
    visibleSections,
    currentSection,
    setCurrentSection,
    isSectionVisible,
    getSectionById,
    navigateToSection
  };
};
