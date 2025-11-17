# Modern User Profile Component

This directory contains a modern, modular User Profile management system for the Reactory PWA client. The system is designed to replace the existing monolithic `Profile.tsx` component with a clean, maintainable architecture that follows modern React patterns.

## 📋 Current Status

✅ **COMPLETED**
- Comprehensive specification document
- TypeScript type definitions
- Core custom hooks (useProfileData, useProfileSections, useProfileMutations)
- Main UserProfile component with basic structure
- Navigation components (ProfileNavigation, ProfileHeader)
- Placeholder section components (GeneralSection, MembershipsSection, DemographicsSection, OrganigramSection)
- Configuration system with default settings

🚧 **IN PROGRESS / TODO**
- Full implementation of section components (currently placeholders)
- Integration with existing plugin components
- Testing and validation
- Documentation updates

## 🏗️ Architecture Overview

### Core Structure
```
UserProfile/
├── specification.md           # Detailed specification document
├── README.md                 # This file
├── types/
│   └── index.ts              # TypeScript definitions
├── hooks/
│   ├── useProfileData.ts     # Data fetching and state management
│   ├── useProfileSections.ts # Section navigation and filtering
│   ├── useProfileMutations.ts # CRUD operations
│   └── index.ts              # Hook exports
├── components/
│   ├── ProfileNavigation.tsx # Navigation component (tabs/sidebar/accordion)
│   ├── ProfileHeader.tsx     # Profile header with avatar/actions
│   ├── sections/
│   │   ├── GeneralSection.tsx      # Personal info (✅ implemented)
│   │   ├── MembershipsSection.tsx  # Organization memberships (🚧 placeholder)
│   │   ├── DemographicsSection.tsx # Demographics (🚧 placeholder)
│   │   └── OrganigramSection.tsx   # Peer relationships (🚧 placeholder)
│   └── index.ts               # Component exports
├── UserProfile.tsx           # Main container component
├── index.ts                  # Main exports
└── constants/                # GraphQL queries, default config (TODO)
```

### Key Features Implemented

#### 🔧 **Configuration-Driven Sections**
```typescript
const config: ProfileConfiguration = {
  sections: [
    {
      id: 'general',
      title: 'General Information',
      component: 'UserProfile.GeneralSection',
      enabled: true,
      order: 1
    }
  ],
  navigation: { type: 'tabs' },
  features: { withAvatar: true, withPeers: true }
};
```

#### 🎣 **Custom Hooks**
- `useProfileData` - Manages profile data fetching and local state
- `useProfileSections` - Handles section navigation and role-based filtering
- `useProfileMutations` - Provides CRUD operations for profile updates

#### 🧩 **Modular Components**
- `UserProfile` - Main container with layout and state management
- `ProfileNavigation` - Flexible navigation (tabs/sidebar/accordion)
- `ProfileHeader` - Header with profile info and action buttons
- Section components for each profile area

## 🚀 Quick Start

### Basic Usage
```tsx
import { UserProfile } from '../shared/UserProfile';

function ProfilePage() {
  return (
    <UserProfile
      userId="user-123"
      mode="view"
      reactory={reactory}
    />
  );
}
```

### Advanced Configuration
```tsx
import { UserProfile, DEFAULT_PROFILE_CONFIG } from '../shared/UserProfile';

const customConfig = {
  ...DEFAULT_PROFILE_CONFIG,
  navigation: { type: 'sidebar' },
  features: { withAvatar: true, withPeers: false }
};

function AdminProfilePage() {
  return (
    <UserProfile
      userId="user-123"
      mode="admin"
      configuration={customConfig}
      onProfileSave={(profile) => console.log('Saved:', profile)}
      reactory={reactory}
    />
  );
}
```

## 🔍 Analysis of Existing Components

Based on the analysis of the plugin components in `reactory-client-core/src/components/User/`:

### **Current Strengths:**
- ✅ Comprehensive functionality in Profile.tsx (1600+ lines)
- ✅ GraphQL integration via Connected components
- ✅ Form-based sections (ReactoryUserProfleGeneral.tsx)
- ✅ Specialized components (Demographics, Memberships, etc.)
- ✅ Role-based access control

### **Current Issues:**
- ❌ Monolithic architecture (Profile.tsx is huge)
- ❌ Mixed concerns (UI, business logic, data fetching)
- ❌ Hard to customize and extend
- ❌ Difficult to test individual features
- ❌ Tight coupling between components

### **Migration Strategy:**
1. **Phase 1**: Core infrastructure (✅ COMPLETED)
2. **Phase 2**: Section-by-section migration (🚧 IN PROGRESS)
3. **Phase 3**: Integration testing and optimization
4. **Phase 4**: Deprecation of old components

## 🎯 Next Steps

### **Immediate Tasks:**
1. **Complete GeneralSection** - Add missing functionality (avatar upload, validation)
2. **Implement MembershipsSection** - Integrate existing membership management
3. **Implement DemographicsSection** - Connect to existing Demographics component
4. **Implement OrganigramSection** - Port peer relationship management

### **Integration Tasks:**
1. **GraphQL Integration** - Ensure all mutations work with existing backend
2. **Plugin Compatibility** - Maintain compatibility with existing components
3. **Error Handling** - Add comprehensive error boundaries and user feedback
4. **Performance** - Optimize rendering and data fetching

### **Testing & Quality:**
1. **Unit Tests** - Test hooks and components in isolation
2. **Integration Tests** - Test full user flows
3. **E2E Tests** - Ensure compatibility with existing features
4. **Accessibility** - WCAG compliance audit

## 📚 API Reference

### UserProfile Props
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
```

### Custom Hooks
```typescript
// Data management
const { profile, loading, error, refetch } = useProfileData(userId, initialProfile);

// Section management
const { sections, currentSection, setCurrentSection } = useProfileSections(config);

// CRUD operations
const { saveProfile, updateAvatar, deleteProfile } = useProfileMutations(profileId);
```

## 🔗 Related Documentation

- [Specification Document](./specification.md) - Detailed technical specification
- [Plugin Components Analysis](../reactory-client-core/src/components/User/) - Existing implementation
- [UserHomeFolder](../UserHomeFolder/) - Similar modern component pattern

## 🤝 Contributing

When extending this component:

1. **Follow the established patterns** - Use hooks for data, components for UI
2. **Add TypeScript types** - Update types/index.ts for new interfaces
3. **Write tests** - Add unit tests for new functionality
4. **Update documentation** - Keep README and specification in sync
5. **Maintain compatibility** - Don't break existing usage patterns

## 📝 Notes

- This is a foundational implementation that provides the architecture
- Section components are currently placeholders that need full implementation
- The system is designed to be backward compatible with existing usage
- Configuration allows for easy customization per client/organization
- All components use Material-UI for consistent styling
