# ReactoryForm — Remaining Work (TODO)

> Last updated: 2026-04-07  
> Prioritised list of remaining tasks to complete the ReactoryForm upgrade.

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| P0 | Critical — blocks other work or fixes a real production issue |
| P1 | High — significant improvement to form functionality |
| P2 | Medium — valuable enhancement |
| P3 | Low — nice-to-have or future consideration |

---

## 1. Integration of Written-but-Unused Code

The biggest gap is that substantial code has been written during the upgrade but never
connected to the production component. This is the most impactful area to address.

### 1.1 Integrate State Management Hooks — P1

**Files**: `stateManagement/useStateStore.ts`, `stateManagement/useStateDebugger.ts`  
**What**: Replace ad-hoc state in `useFormDefinition` and `useDataManager` with the
centralized state store. Wire the state debugger into the dev tools panel.  
**Risk**: Medium — touches the core data flow. Needs careful testing.  
**Approach**: Use feature flags to gate the new state management behind
`REACTORY_FORM_STATE_V2`.

### 1.2 Integrate Performance Optimization Hooks — P1

**Files**: `performanceOptimization/usePerformanceMonitor.ts`,
`performanceOptimization/useVirtualScrolling.ts`,
`performanceOptimization/useIntelligentCache.ts`,
`performanceOptimization/useMemoryManager.ts`  
**What**: Wire performance monitoring into `useFormDefinition`. Add virtual scrolling
for large field sets. Use intelligent caching in data managers.  
**Risk**: Low-medium — these are additive, non-breaking hooks.  
**Approach**: Feature-flagged incremental rollout.

### 1.3 Integrate Phase 2 Rendering Optimizations — P2

**Files**: `phase2/useVirtualFormList.ts`, `phase2/useMemoizedFormField.ts`,
`phase2/useLazyFormComponent.ts`  
**What**: Add virtual list rendering for forms with 100+ fields. Memoize field
components to reduce re-renders. Lazy-load heavy field widgets.  
**Risk**: Low — these wrap existing rendering without modifying it.  
**Overlap**: Overlaps with `performanceOptimization/useVirtualScrolling.ts`. Deduplicate
before integrating.

### 1.4 Integrate Phase 2 Data Optimizations — P2

**Files**: `phase2/useIntelligentCache.ts`, `phase2/useDataPrefetching.ts`,
`phase2/useGraphQLOptimization.ts`, `phase2/useOfflineSupport.ts`  
**What**: Add query caching/batching to GraphQL data manager. Implement offline
support with sync queue. Add data prefetching for known navigation patterns.  
**Risk**: Medium — modifies the data pipeline. GraphQL optimization could conflict
with Apollo Client's own caching.  
**Note**: Evaluate whether Apollo Client's built-in cache makes
`useGraphQLOptimization.ts` redundant.

### 1.5 Integrate types-v2.ts Fully — P2

**Files**: `types-v2.ts`, `typeValidation.ts`  
**What**: Replace `types.ts` imports with `types-v2.ts` across all hooks. Add runtime
validation at form boundaries (formDef loading, data manager returns).  
**Risk**: Low — type-only changes with additive runtime checks.

### 1.6 Wire Feature Flags — P2

**What**: Import and check the feature flag constants defined in `FEATURE_FLAGS.md`
within the main component. Use them to gate new features.  
**Risk**: Low — adds conditional checks, doesn't change existing behaviour.

---

## 2. Incomplete Implementations

### 2.1 Implement useContext Hook — P1

**File**: `hooks/useContext.ts`  
**What**: Currently returns an empty stub object. Contains ~100 lines of commented-out
legacy implementation. Needs to be rebuilt to provide form context (formData, graphql,
routing, screen size, etc.) to child components.  
**Impact**: Many widgets and child components may expect a populated form context.

### 2.2 Implement REST Data Manager — P1

**File**: `DataManagers/useRESTDataManager.ts`  
**What**: Currently a stub returning `available: false`. Needs full HTTP client
integration (GET/POST/PUT/DELETE), response transformation, error handling.  
**Impact**: Enables forms that pull data from REST APIs without GraphQL.

### 2.3 Implement gRPC Data Manager — P3

**File**: `DataManagers/useGRPCDataManager.ts`  
**What**: Stub. Needs gRPC-Web client integration.  
**Impact**: Low priority — few current use cases for gRPC in the PWA.

### 2.4 Implement Socket Data Manager — P2

**File**: `DataManagers/useSocketDataManager.ts`  
**What**: Stub. Needs WebSocket client for real-time data push/pull.  
**Impact**: Required for real-time form updates and collaborative editing.

### 2.5 Memory Management (Phase 2.3) — P2

**What**: Not started. Clean up subscriptions, observers, and cached data when forms
unmount. Monitor memory usage.  
**Impact**: Important for long-running SPA sessions with many form navigations.

---

## 3. Phase 3: Visual & UX Improvements

### 3.1 Evaluate Phase 3 Code Before Integration — P2

**Files**: All `phase3/` files  
**What**: The Phase 3 `EnhancedReactoryForm.tsx` adds Framer Motion animations,
modern form fields, and loading skeletons. Before integrating:
1. Verify Framer Motion is an acceptable dependency (bundle size impact)
2. Decide if animations should be opt-in via prop/feature flag
3. Resolve naming conflict with `ReactoryFormEnhanced.tsx` (production) vs
   `phase3/components/EnhancedReactoryForm.tsx` (prototype)

### 3.2 Accessibility Audit — P1

**What**: No ARIA, keyboard navigation, or screen reader improvements have been
implemented. This affects regulatory compliance and usability.  
**Tasks**:
- [ ] Add ARIA labels to all form fields
- [ ] Implement keyboard navigation and focus management
- [ ] Add skip links for long forms
- [ ] Test with screen readers (VoiceOver, NVDA)

### 3.3 Mobile / Responsive Improvements — P2

**What**: Basic responsive design exists via MUI Grid. Needs:
- Touch-friendly input targets
- Mobile-optimised toolbar
- Responsive typography scaling
- Better small-screen form layouts

---

## 4. Phase 4: Advanced Features

### 4.1 Fix Failing Tests — P2

**What**: The Phase 4 code has test suites with partial failures:
- Collaboration: 11/24 passing
- Validation: 18/29 passing
- Fix before any integration attempt.

### 4.2 Evaluate Collaboration Architecture — P3

**What**: `phase4/collaboration/` implements WebSocket-based collaboration with
presence indicators and conflict resolution. Before integrating:
1. Determine server-side WebSocket support requirements
2. Evaluate fit with existing Reactory event/message system
3. Decide on real-time sync protocol (WebSocket, SSE, polling)

### 4.3 Evaluate Advanced Validation — P2

**What**: `phase4/validation/` adds async, cross-field, and custom validation.
Evaluate overlap with RJSF's built-in validation and custom `validate` functions
already supported by the form. Avoid duplicating validation logic.

### 4.4 Evaluate Form Builder — P3

**What**: `phase4/builder/` implements drag-and-drop form building. This is a
separate tool, not a modification to the form renderer. Decide:
- Should it be a separate component (recommended)?
- How does it relate to the Form Editor spec?

### 4.5 Implement Form Editor — P3

**What**: Spec exists in `FORM_EDITOR_SPEC.md`. No code. This is a major feature
(visual form definition editing) that would be a separate project.

---

## 5. Phase 5: Developer Experience

### 5.1 Comprehensive Test Suite — P1

**What**: The production form component (ReactoryForm, ReactoryFormEnhanced,
hooks, data managers) has very limited test coverage. The existing tests are
mostly for upgrade-phase hooks that aren't integrated.  
**Tasks**:
- [ ] Unit tests for each hook
- [ ] Integration tests for form lifecycle (load → render → submit)
- [ ] Tests for each container type
- [ ] Tests for toolbar configuration
- [ ] Tests for data manager orchestration
- [ ] Tests for error boundary behaviour
- [ ] Tests for plugin dependency resolution

### 5.2 Storybook Stories — P2

**What**: Create Storybook stories for:
- Basic form rendering
- Each container type
- Toolbar variants
- Loading states
- Error states
- Multi-schema forms

### 5.3 Developer Tools — P3

**What**: Form inspection panel, state debugger, performance monitor integrated
into browser dev tools or an in-app overlay.

---

## 6. Phase 6: Architecture Improvements

### 6.1 Hook Simplification — P2

**What**: `useFormDefinition` (~495 lines) and `useUISchema` (~520 lines) are
large and complex. Break into smaller, focused hooks. Reduce coupling.

### 6.2 Plugin System Enhancement — P3

**What**: Improve plugin versioning, dependency resolution, and hot reloading.

### 6.3 Internationalization — P2

**What**: Add RTL support, locale-specific formatting, and improved translation
management for form labels, errors, and help text.

---

## 7. Technical Debt

### 7.1 Clean Up Duplicate Code — P2

**What**: Several overlapping implementations exist:
- `performanceOptimization/useVirtualScrolling.ts` vs `phase2/useVirtualFormList.ts`
- `performanceOptimization/useIntelligentCache.ts` vs `phase2/useIntelligentCache.ts`
- Choose one, delete the other.

### 7.2 Resolve Naming Confusion — P1

**What**: Two different "enhanced" forms exist:
- `ReactoryFormEnhanced.tsx` (production — error boundary wrapper)
- `phase3/components/EnhancedReactoryForm.tsx` (unused — animation wrapper)

Rename to avoid confusion. Suggestion:
- Keep `ReactoryFormEnhanced.tsx` as-is (it's the production export)
- Rename Phase 3 version to `AnimatedReactoryForm.tsx` or `ReactoryFormWithAnimations.tsx`

### 7.3 Remove or Archive Dead Code — P3

**What**: If integration of Phase 1.3, 1.4, 2.x, 3.x, 4.x code is not planned in
the near term, consider:
- Moving to a `_drafts/` or `_experimental/` directory
- Documenting clearly that these are prototypes
- Removing test runners (`.js` files) that are not part of the Jest suite

### 7.4 Resurrect useContext — P1

**What**: `hooks/useContext.ts` returns an empty object. The commented-out code
suggests it previously provided a rich form context. Determine why it was
gutted and restore essential functionality.

---

## Recommended Execution Order

Based on impact and risk:

1. **P0/P1 Quick Wins**
   - 7.2 Resolve naming confusion
   - 7.4 Resurrect useContext
   - 2.1 Implement useContext hook properly

2. **P1 Core Improvements**
   - 1.1 Integrate state management
   - 1.2 Integrate performance monitoring
   - 2.2 Implement REST data manager
   - 5.1 Write production test suite
   - 3.2 Accessibility audit

3. **P2 Enhancements**
   - 1.5 Full types-v2 integration
   - 1.6 Wire feature flags
   - 1.3 Rendering optimizations
   - 1.4 Data optimizations
   - 7.1 Clean up duplicates

4. **P3 Future Work**
   - Phase 4 evaluations and fixes
   - Phase 5 developer tools
   - Phase 6 architecture improvements
   - Form Editor implementation
