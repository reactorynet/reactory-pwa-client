# Storybook Organization Strategy

## 📁 **File Organization**

### **Co-located Stories (Recommended)**
Component stories are placed next to their components for better developer experience:

```
src/components/shared/
├── Loading/
│   ├── Loading.tsx
│   └── Loading.stories.tsx
├── MaterialInput/
│   ├── MaterialInput.tsx
│   └── MaterialInput.stories.tsx
└── Label/
    ├── Label.tsx
    └── Label.stories.tsx
```

### **Centralized Stories**
Design system and utility stories are centralized:

```
src/stories/
├── Typography.stories.tsx
├── IconTest.stories.tsx
├── ThemeComparison.stories.tsx
└── index.ts
```

## 🎯 **Organization Principles**

### **Co-located Stories For:**
- ✅ **Component-specific stories**
- ✅ **Component variations and states**
- ✅ **Component documentation**
- ✅ **Component testing scenarios**

### **Centralized Stories For:**
- ✅ **Design system components**
- ✅ **Theme and typography examples**
- ✅ **Icon libraries**
- ✅ **Cross-component comparisons**
- ✅ **Utility components**

## 📚 **Story Categories**

### **Components/** (Co-located)
- `Loading/` - Loading component with animations
- `MaterialInput/` - Input components with icons
- `Label/` - Label components with formatting

### **Design System/** (Centralized)
- `Typography` - Font examples and weights
- `IconTest` - Material Icons testing
- `ThemeComparison` - Light vs Dark themes

## 🛠 **Best Practices**

### **1. Story Naming**
```typescript
// Component stories
title: 'Components/Loading'
title: 'Components/MaterialInput'

// Design system stories
title: 'Design System/Typography'
title: 'Design System/IconTest'
```

### **2. Import Paths**
```typescript
// Co-located stories
import Component from './Component';
import { ThemeWrapper } from '../../../../.storybook/ThemeWrapper';

// Centralized stories
import { ThemeWrapper } from '../../.storybook/ThemeWrapper';
```

### **3. Story Structure**
```typescript
const meta = {
  title: 'Components/ComponentName',
  component: Component,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Component description',
      },
    },
  },
  argTypes: {
    // Component props
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    ),
  ],
} satisfies Meta<typeof Component>;
```

## 🚀 **Adding New Stories**

### **For Component Stories:**
1. Create component folder: `src/components/shared/NewComponent/`
2. Move component: `NewComponent.tsx` → `NewComponent/NewComponent.tsx`
3. Create story: `NewComponent/NewComponent.stories.tsx`
4. Update imports in other files

### **For Design System Stories:**
1. Create story: `src/stories/NewStory.stories.tsx`
2. Add to index: `src/stories/index.ts`
3. Use `Design System/` prefix in title

## 📖 **Story Guidelines**

### **Component Stories Should Include:**
- ✅ **Default state**
- ✅ **Variations (props, states)**
- ✅ **Interactive controls**
- ✅ **Theme integration**
- ✅ **Accessibility examples**

### **Design System Stories Should Include:**
- ✅ **All variants**
- ✅ **Color palettes**
- ✅ **Typography scales**
- ✅ **Theme comparisons**
- ✅ **Usage examples**

## 🔄 **Migration Strategy**

### **Phase 1: ✅ Complete**
- [x] Move existing stories to co-located structure
- [x] Create centralized stories directory
- [x] Update import paths
- [x] Fix component imports

### **Phase 2: Future**
- [ ] Add stories for all shared components
- [ ] Create component documentation
- [ ] Add accessibility stories
- [ ] Add visual regression tests

## 📝 **Maintenance**

### **When Adding New Components:**
1. Create component folder structure
2. Add component story with variations
3. Include theme integration
4. Add to component documentation

### **When Updating Components:**
1. Update component story to reflect changes
2. Test all story variations
3. Update documentation
4. Verify theme compatibility

This organization provides a scalable structure that grows with your component library while maintaining excellent developer experience. 