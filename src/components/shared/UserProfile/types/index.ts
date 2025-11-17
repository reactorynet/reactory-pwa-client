import Reactory from '@reactory/reactory-core';

// Core profile types based on existing plugin components
export interface ProfileUser extends Reactory.Models.IUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber?: string;
  avatar?: string;
  deleted?: boolean;
  authProvider?: string;
  providerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  memberships?: Reactory.Models.IMembership[];
  peers?: UserPeers;
  __isnew?: boolean;
}

export interface UserPeers {
  user: Reactory.Models.IUser;
  organization: {
    id: string;
    name: string;
    avatar?: string;
  };
  peers: PeerUser[];
  allowEdit: boolean;
  confirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PeerUser {
  user: Reactory.Models.IUser;
  isInternal: boolean;
  inviteSent: boolean;
  confirmed: boolean;
  confirmedAt?: string;
  relationship: 'manager' | 'peer' | 'report';
}

// Configuration types
export interface ProfileSection {
  id: string;
  title: string;
  component: string; // Component FQN or local component name
  icon?: string;
  props?: Record<string, any>;
  roles?: string[]; // Required roles to view this section
  permissions?: string[]; // Required permissions
  enabled: boolean;
  order: number;
  validation?: ValidationRules;
}

export interface ValidationRules {
  required?: boolean;
  customValidators?: Array<(value: any) => string | null>;
}

export interface ProfileConfiguration {
  sections: ProfileSection[];
  navigation: {
    type: 'tabs' | 'sidebar' | 'accordion';
    position?: 'top' | 'left' | 'right';
  };
  features: {
    withAvatar: boolean;
    withPeers: boolean;
    withMembership: boolean;
    withDemographics: boolean;
    allowRoleEditing: boolean;
  };
  permissions: {
    canEditOwnProfile: boolean;
    canEditOtherProfiles: boolean;
    canDeleteProfiles: boolean;
    canManageMemberships: boolean;
  };
}

// Component props interfaces
export interface UserProfileProps {
  userId?: string;
  profile?: ProfileUser;
  configuration?: Partial<ProfileConfiguration>;
  mode?: 'view' | 'edit' | 'admin';
  onProfileSave?: (profile: ProfileUser) => void;
  onProfileCancel?: () => void;
  onPeersConfirmed?: () => void;
  onSectionChange?: (sectionId: string) => void;
  reactory: Reactory.Client.ReactorySDK;
  className?: string;
  style?: React.CSSProperties;
}

export interface ProfileSectionProps {
  profile: ProfileUser;
  mode: 'view' | 'edit' | 'admin';
  loading?: boolean;
  onProfileUpdate: (updates: Partial<ProfileUser>) => void;
  onSave?: (profile: ProfileUser) => Promise<boolean | void>;
  reactory: Reactory.Client.ReactorySDK | Reactory.Client.IReactoryApi; // TODO: Fix proper Reactory typing
  // Section-specific props can be added by extending this interface
  [key: string]: any;
}

// Section-specific props interfaces
export interface GeneralSectionProps extends ProfileSectionProps {
  withAvatar?: boolean;
  firstNameHelperText?: string;
  surnameHelperText?: string;
  emailHelperText?: string;
}

export interface MembershipSectionProps extends ProfileSectionProps {
  selectedMembership?: Reactory.Models.IMembership;
  onMembershipSelect?: (membership: Reactory.Models.IMembership) => void;
}

export interface DemographicsSectionProps extends ProfileSectionProps {
  selectedMembership?: Reactory.Models.IMembership;
  organizationId?: string;
}

export interface OrgangramSectionProps extends ProfileSectionProps {
  selectedMembership?: Reactory.Models.IMembership;
  onPeersConfirmed?: () => void;
}

export interface ProfileNavigationProps {
  sections: ProfileSection[];
  currentSection: string;
  onSectionChange: (sectionId: string) => void;
  type: 'tabs' | 'sidebar' | 'accordion';
  position?: 'top' | 'left' | 'right';
  className?: string;
}

export interface ProfileHeaderProps {
  profile: ProfileUser;
  mode: 'view' | 'edit' | 'admin';
  isOwner: boolean;
  isAdmin: boolean;
  onEdit?: () => void;
  onSave?: (profile?: ProfileUser) => void | Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void;
  loading?: boolean;
  reactory: Reactory.Client.ReactorySDK;
  className?: string;
}

// Hook return types
export interface UseProfileDataResult {
  profile: ProfileUser | null;
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isNew: boolean;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileUser>) => void;
  reset: () => void;
}

export interface UseProfileSectionsResult {
  sections: ProfileSection[];
  visibleSections: ProfileSection[];
  currentSection: string;
  setCurrentSection: (sectionId: string) => void;
  isSectionVisible: (sectionId: string) => boolean;
  getSectionById: (sectionId: string) => ProfileSection | undefined;
  navigateToSection: (sectionId: string) => boolean;
}

export interface UseProfileMutationsResult {
  saveProfile: (profile: ProfileUser) => Promise<boolean>;
  deleteProfile: () => Promise<boolean>;
  updateAvatar: (avatarData: string) => Promise<boolean>;
  createMembership: (membership: Partial<Reactory.Models.IMembership>) => Promise<boolean>;
  updateMembership: (id: string, updates: Partial<Reactory.Models.IMembership>) => Promise<boolean>;
  deleteMembership: (id: string) => Promise<boolean>;
  setPeerRelationship: (peerId: string, relationship: PeerUser['relationship']) => Promise<boolean>;
  removePeer: (peerId: string) => Promise<boolean>;
  confirmPeers: () => Promise<boolean>;
  addPeer: (user: Reactory.Models.IUser, relationship: PeerUser['relationship']) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

// Navigation types
export type ProfileNavigationType = 'tabs' | 'sidebar' | 'accordion';
export type ProfileMode = 'view' | 'edit' | 'admin';
export type PeerRelationship = 'manager' | 'peer' | 'report';

// Form data types
export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber?: string;
  avatar?: string;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// GraphQL fragment for profile data
export const PROFILE_DATA_FRAGMENT = `
  fragment ProfileData on User {
    id
    firstName
    lastName
    email
    mobileNumber
    avatar
    deleted
    authProvider
    providerId
    createdAt
    updatedAt
    memberships {
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
`;

// Default configuration - matches existing Profile.tsx behavior
export const DEFAULT_PROFILE_CONFIG: ProfileConfiguration = {
  sections: [
    {
      id: 'general',
      title: 'General Information',
      icon: 'person',
      component: 'UserProfile.GeneralSection',
      enabled: true,
      order: 1,
      roles: ['USER', 'ADMIN']
    },
    {
      id: 'memberships',
      title: 'Memberships',
      icon: 'business',
      component: 'UserProfile.MembershipsSection',
      enabled: true,
      order: 2,
      roles: ['USER', 'ADMIN']
    },
    {
      id: 'demographics',
      title: 'Demographics',
      icon: 'bar_chart',
      component: 'UserProfile.DemographicsSection',
      enabled: true,
      order: 3,
      roles: ['USER', 'ADMIN']
    },
    {
      id: 'organigram',
      title: 'Organigram',
      icon: 'account_tree',
      component: 'UserProfile.OrganigramSection',
      enabled: true,
      order: 4,
      roles: ['USER', 'ADMIN']
    }
  ],
  navigation: {
    type: 'tabs',
    position: 'top'
  },
  features: {
    withAvatar: true,
    withPeers: true,
    withMembership: true,
    withDemographics: true,
    allowRoleEditing: false
  },
  permissions: {
    canEditOwnProfile: true,
    canEditOtherProfiles: false,
    canDeleteProfiles: false,
    canManageMemberships: false
  }
};
