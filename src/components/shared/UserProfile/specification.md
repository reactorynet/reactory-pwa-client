# User Profile Management System Specification

## Overview

This specification outlines the design and implementation of a modern, modular User Profile management system for the Reactory PWA client. The system will replace the existing monolithic `Profile.tsx` component with a clean, maintainable architecture that follows modern React patterns and leverages existing plugin components.

## Analysis of Existing Components

### Current Plugin Components (`reactory-client-core`)

#### Core Components
- **`Profile.tsx`** (1602 lines) - Monolithic component with all functionality
  - Props: `IProfileProps` with extensive configuration options
  - Features: Avatar upload, memberships, peers/organigram, demographics
  - Issues: Large, hard to maintain, mixed concerns

- **`Connected/UserProfile.tsx`** - GraphQL-wrapped component
  - Uses Apollo Query for data fetching
  - Passes data to `EditProfile` component

- **`Connected/EditProfile.tsx`** - Mutation wrapper
  - Handles profile updates via GraphQL mutations
  - Wraps the main `Profile` component

#### Hook-Based Approach
- **`hooks/useProfile.tsx`** - Newer composition-based hook
  - Returns `{ load, profile, isNew, isOwner, isAdmin, loading, children }`
  - Uses component registry for dynamic section loading
  - More modular than monolithic Profile.tsx

#### Specialized Components
- **`ReactoryUserProfleGeneral.tsx`** - Form-based general section
- **`Widgets/Demographics.tsx`** - Demographics management with ReactoryForm
- **`CreateUserMembership.tsx`** - Membership creation
- **`UserListWithSearch.tsx`** - User selection functionality

#### Data Structures
```typescript
// Existing interfaces
interface IProfileProps {
  profile: Reactory.Models.IUser;
  profileTitle: string;
  loading: boolean;
  organizationId: string;
  onPeersConfirmed: () => void;
  mode: "admin" | "user" | "self";
  isNew: boolean;
  withPeers?: boolean;
  withAvatar?: boolean;
  withMembership?: boolean;
  // ... many more props
}
```

## System Architecture

### Core Principles

1. **Modularity** - Break down into focused, reusable components
2. **Configuration-Driven** - Easy to customize sections and behavior
3. **Hook-Based** - Modern React patterns with custom hooks
4. **Type Safety** - Full TypeScript coverage
5. **Accessibility** - WCAG compliant
6. **Performance** - Optimized rendering and data fetching

### Component Hierarchy

```
UserProfile/
├── UserProfile.tsx                 # Main container component
├── specification.md                # This specification
├── types/
│   ├── index.ts                    # TypeScript definitions
│   └── profileConfig.ts            # Configuration types
├── hooks/
│   ├── useProfileData.ts           # Data management hook
│   ├── useProfileSections.ts       # Section navigation hook
│   ├── useProfileMutations.ts      # Update operations hook
│   └── index.ts                    # Hook exports
├── components/
│   ├── ProfileNavigation.tsx       # Navigation component (tabs/sidebar/accordion)
│   ├── ProfileHeader.tsx           # Profile header with avatar/actions
│   ├── sections/
│   │   ├── GeneralSection.tsx      # Personal info section
│   │   ├── MembershipsSection.tsx  # Organization memberships
│   │   ├── DemographicsSection.tsx # Demographics management
│   │   ├── OrganigramSection.tsx   # Peer relationships
│   │   └── index.ts                # Section exports
│   └── shared/
│       ├── ProfileAvatar.tsx       # Avatar upload component
│       ├── ProfileField.tsx        # Reusable form field
│       ├── ConfirmationDialog.tsx  # Generic confirmation dialog
│       └── index.ts                # Shared component exports
├── utils/
│   ├── profileValidation.ts        # Form validation utilities
│   ├── profilePermissions.ts       # Permission checking
│   └── index.ts                    # Utility exports
├── constants/
│   ├── queries.graphql             # GraphQL queries/mutations
│   └── defaultConfig.ts            # Default configuration
├── styles/
│   ├── profileTheme.ts             # Material-UI theme overrides
│   └── index.ts                    # Style exports
└── index.ts                        # Main exports
```

## Key Features

### 1. Configuration-Driven Sections

```typescript
interface ProfileConfiguration {
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

interface ProfileSection {
  id: string;
  title: string;
  component: string; // Component FQN
  icon?: string;
  props?: Record<string, any>;
  roles?: string[]; // Required roles to view
  permissions?: string[]; // Required permissions
  enabled: boolean;
  order: number;
  validation?: ValidationRules;
}
```

### 2. Hook-Based Data Management

#### `useProfileData`
```typescript
interface UseProfileDataResult {
  profile: ProfileUser | null;
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isNew: boolean;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileUser>) => void;
}

const useProfileData = (
  userId?: string,
  initialProfile?: ProfileUser
): UseProfileDataResult => { ... }
```

#### `useProfileSections`
```typescript
interface UseProfileSectionsResult {
  sections: ProfileSection[];
  currentSection: string;
  setCurrentSection: (sectionId: string) => void;
  isSectionVisible: (sectionId: string) => boolean;
  getVisibleSections: () => ProfileSection[];
}

const useProfileSections = (
  config: ProfileConfiguration,
  userRoles: string[]
): UseProfileSectionsResult => { ... }
```

#### `useProfileMutations`
```typescript
interface UseProfileMutationsResult {
  saveProfile: (profile: ProfileUser) => Promise<boolean>;
  deleteProfile: () => Promise<boolean>;
  updateAvatar: (avatarData: string) => Promise<boolean>;
  createMembership: (membership: Partial<IMembership>) => Promise<boolean>;
  updateMembership: (id: string, updates: Partial<IMembership>) => Promise<boolean>;
  deleteMembership: (id: string) => Promise<boolean>;
  setPeerRelationship: (peerId: string, relationship: PeerRelationship) => Promise<boolean>;
  confirmPeers: () => Promise<boolean>;
}

const useProfileMutations = (
  profileId: string,
  reactory: Reactory.IReactory
): UseProfileMutationsResult => { ... }
```

### 3. Component Architecture

#### Main Container Component
```typescript
interface UserProfileProps {
  userId?: string;
  profile?: ProfileUser;
  configuration?: Partial<ProfileConfiguration>;
  mode?: 'view' | 'edit' | 'admin';
  onProfileSave?: (profile: ProfileUser) => void;
  onProfileCancel?: () => void;
  onPeersConfirmed?: () => void;
  reactory: Reactory.IReactory;
}

const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  profile: initialProfile,
  configuration = DEFAULT_CONFIG,
  mode = 'view',
  onProfileSave,
  onProfileCancel,
  onPeersConfirmed,
  reactory
}) => {
  // Hook composition
  const profileData = useProfileData(userId, initialProfile);
  const sections = useProfileSections(configuration, profileData.profile);
  const mutations = useProfileMutations(profileData.profile?.id, reactory);

  // Render logic
  return (
    <ProfileContainer>
      <ProfileHeader {...headerProps} />
      <ProfileNavigation {...navigationProps} />
      <ProfileContent>
        {renderCurrentSection()}
      </ProfileContent>
    </ProfileContainer>
  );
};
```

#### Section Components
Each section follows a consistent interface:

```typescript
interface ProfileSectionProps {
  profile: ProfileUser;
  mode: 'view' | 'edit' | 'admin';
  loading?: boolean;
  onProfileUpdate: (updates: Partial<ProfileUser>) => void;
  onSave?: (profile: ProfileUser) => Promise<boolean>;
  reactory: Reactory.IReactory;
  // Section-specific props
  [key: string]: any;
}

const GeneralSection: React.FC<ProfileSectionProps> = ({
  profile,
  mode,
  loading,
  onProfileUpdate,
  onSave,
  reactory
}) => {
  // Section-specific logic
  return (
    <SectionContainer>
      <AvatarUpload {...avatarProps} />
      <PersonalInfoForm {...formProps} />
      <ActionButtons {...buttonProps} />
    </SectionContainer>
  );
};
```

### 4. Navigation Patterns

#### Tab Navigation (Default)
- Horizontal tabs at top
- Good for 3-5 sections
- Mobile-responsive with scroll

#### Sidebar Navigation
- Vertical navigation on left
- Good for many sections
- Shows current section highlighted
- Collapsible on mobile

#### Accordion Navigation
- All sections in expandable panels
- Good for mobile-first design
- Progressive disclosure

### 5. Data Flow

```
UserProfile (Container)
├── useProfileData (Data Hook)
│   ├── GraphQL Query for profile data
│   ├── State management
│   └── Optimistic updates
├── useProfileSections (Navigation Hook)
│   ├── Configuration processing
│   ├── Role-based filtering
│   └── Section state management
├── useProfileMutations (Operations Hook)
│   ├── GraphQL mutations
│   ├── Error handling
│   └── Success callbacks
└── Section Components
    ├── GeneralSection
    ├── MembershipsSection
    ├── DemographicsSection
    └── OrganigramSection
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create TypeScript definitions (`types/`)
2. Implement data management hooks (`hooks/`)
3. Create shared components (`components/shared/`)
4. Set up configuration system (`utils/`)
5. Build main container component

### Phase 2: Section Components
1. Implement GeneralSection (personal info, avatar)
2. Implement MembershipsSection (organizations, roles)
3. Implement DemographicsSection (forms integration)
4. Implement OrganigramSection (peers, relationships)

### Phase 3: Advanced Features
1. Add navigation patterns (tabs, sidebar, accordion)
2. Implement permission system
3. Add validation and error handling
4. Create configuration builder API

### Phase 4: Integration & Testing
1. Integrate with existing plugin components
2. Add comprehensive tests
3. Create migration guide
4. Update documentation

## Migration Strategy

### Backward Compatibility
The new system will maintain compatibility with existing usage patterns:

```typescript
// Old usage (still works)
<Profile
  profile={user}
  mode="self"
  withPeers={true}
  withAvatar={true}
  onSave={handleSave}
  reactory={reactory}
/>

// New usage (recommended)
<UserProfile
  userId={user.id}
  mode="edit"
  configuration={{
    features: { withPeers: true, withAvatar: true }
  }}
  onProfileSave={handleSave}
  reactory={reactory}
/>
```

### Gradual Migration
1. **Phase 1**: New system alongside existing Profile.tsx
2. **Phase 2**: Feature parity and testing
3. **Phase 3**: Gradual component replacement
4. **Phase 4**: Deprecation of old components

## Configuration Examples

### Minimal Profile (View Only)
```typescript
const MINIMAL_CONFIG: ProfileConfiguration = {
  sections: [{
    id: 'general',
    title: 'Profile',
    component: 'UserProfile.GeneralSection',
    enabled: true,
    order: 1
  }],
  navigation: { type: 'tabs' },
  features: {
    withAvatar: true,
    withPeers: false,
    withMembership: false,
    withDemographics: false,
    allowRoleEditing: false
  },
  permissions: {
    canEditOwnProfile: false,
    canEditOtherProfiles: false,
    canDeleteProfiles: false,
    canManageMemberships: false
  }
};
```

### Admin Profile (Full Access)
```typescript
const ADMIN_CONFIG: ProfileConfiguration = {
  sections: [
    { id: 'general', ... },
    { id: 'memberships', ... },
    { id: 'demographics', ... },
    { id: 'organigram', ... },
    {
      id: 'admin',
      title: 'Administration',
      component: 'UserProfile.AdminSection',
      roles: ['ADMIN'],
      enabled: true,
      order: 99
    }
  ],
  navigation: { type: 'sidebar', position: 'left' },
  features: {
    withAvatar: true,
    withPeers: true,
    withMembership: true,
    withDemographics: true,
    allowRoleEditing: true
  },
  permissions: {
    canEditOwnProfile: true,
    canEditOtherProfiles: true,
    canDeleteProfiles: true,
    canManageMemberships: true
  }
};
```

## Benefits

1. **Maintainability**: Modular architecture, easier to modify individual sections
2. **Extensibility**: Easy to add new sections without touching core code
3. **Type Safety**: Full TypeScript coverage prevents runtime errors
4. **Performance**: Optimized rendering with React.memo and selective re-renders
5. **User Experience**: Flexible navigation patterns, responsive design
6. **Developer Experience**: Clear separation of concerns, comprehensive documentation
7. **Testing**: Easier to unit test individual components and hooks

## Success Metrics

- **Code Coverage**: >90% test coverage
- **Performance**: <100ms initial render time
- **Maintainability**: <5 files changed for new section addition
- **Accessibility**: WCAG AA compliance
- **Compatibility**: Zero breaking changes for existing usage

## Conclusion

This specification provides a comprehensive plan for modernizing the User Profile management system. By leveraging existing plugin components and following modern React patterns, we can create a maintainable, extensible, and user-friendly profile management experience.

The modular architecture will make it easy to customize profiles for different use cases while maintaining backward compatibility with existing code.
