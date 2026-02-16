# Header System Specification

## Goals
- Support multiple header/navigation patterns beyond DefaultHeader.
- Enable mobile-first layouts (bottom navigation + top actions/search).
- Preserve customization capabilities of DefaultHeader (menus, roles, search, theming).
- Allow per-client and per-route header selection.
- Keep accessibility and responsive behavior first-class.

## Non-Goals (Phase 1)
- Full redesign of existing DefaultHeader UI.
- Breaking changes to current API consumers.
- Replacing Reactory menu model or authorization rules.

## Current Header Summary
- `DefaultHeader` renders:
  - Left nav Drawer with menu entries.
  - Top AppBar with title, search, theme toggle, login/logout actions.
  - API status indicator + cache controls.
  - Role-based menu filtering.

## Proposed Architecture
### 1) Header Registry
A registry that maps a header `type` to a React component.

- Example types:
  - `default` (existing DefaultHeader)
  - `mobile-bottom` (BottomNavigation + top AppBar actions)
  - `minimal` (no drawer, compact top bar)
  - `shop` (brand + cart + quick categories)
  - `social` (tabs + create action)

### 2) Header Definition
A `HeaderDefinition` object describes header structure and behavior, separate from rendering logic.

```ts
interface HeaderDefinition {
  id: string;
  label: string;
  type: string; // registry key
  layout: {
    topBar?: boolean;
    bottomNav?: boolean;
    leftDrawer?: boolean;
    rightDrawer?: boolean;
  };
  actions?: HeaderAction[];
  search?: HeaderSearchConfig;
  menus?: HeaderMenuConfig;
  theming?: HeaderThemeOverrides;
  responsive?: HeaderResponsiveConfig;
}
```

### 3) Header Resolver
Resolution determines which header to render based on:
- Client config (default header type).
- Route metadata (override per route).
- Breakpoint (switch to mobile header on small screens).

Resolution order:
1. Route override
2. Client config
3. System default

### 4) Compatibility Layer
`DefaultHeader` remains intact and is registered as `default`.

## Feature Requirements (Phase 1)
- Header registry and resolver.
- Configurable header selection at client + route level.
- Mobile-first header variant with bottom navigation.
- Shared utilities for:
  - Menu generation & role filtering.
  - Search handling.
  - Theme toggle.
  - Status indicators.

## Data Model Notes
- Continue using `reactory.$user.menus` and existing menu schema.
- Add optional metadata for header placement:
  - `target: 'left-nav' | 'top-right' | 'bottom-nav' | 'top-left' | 'top-center'`.

## UI Variants (Initial)
### A) Default Header (existing)
- Drawer left, top actions right, search optional.

### B) Mobile Bottom Navigation
- Top AppBar: title + search + actions.
- BottomNavigation: 3–5 primary items.
- Overflow menu for secondary items.

### C) Minimal Header
- Single AppBar, no drawer.

## Accessibility & UX
- All buttons must have `aria-label`.
- Keyboard navigation for menus and drawer.
- Maintain focus management when opening drawers and menus.

## Testing
- Unit tests for header resolver logic.
- Storybook stories for each header type.

## Migration Plan
- Register `DefaultHeader` as `default`.
- Implement `HeaderResolver` and wire to layout.
- Add `MobileBottomHeader` as first new type.

## Open Questions
- Where to store client header settings (config/env or server-driven)?
- Should header types be overridable per user role?
- Should menu targets be refactored for better layout control?
