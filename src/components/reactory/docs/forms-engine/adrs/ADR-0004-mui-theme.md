# ADR-0004 — Build our own MUI theme rather than depend on `@rjsf/mui`

**Status:** Proposed
**Date:** 2026-04-25

## Context

The PWA targets **Material-UI v6**. `@rjsf/mui` historically tracks **MUI v5**. Mismatch options:

1. **Use `@rjsf/mui` and pin MUI v5 just for forms.** Ships two MUI versions in the bundle. Painful to maintain.
2. **Use `@rjsf/mui` and downgrade the PWA to MUI v5.** Reverses an existing platform decision, blocked.
3. **Build our own MUI v6 templates** under `form-engine/templates/`, drawing inspiration from `@rjsf/mui` but adapted for MUI v6 (this ADR).

Reactory already has 47+ MUI widgets in `components/reactory/ux/mui/widgets/`. The widgets stay; only the *templates* (the structural components like `FieldTemplate`, `ObjectFieldTemplate`) are new.

## Decision

We build the templates ourselves on top of MUI v6 primitives. Reference `@rjsf/mui` for design choices but do not depend on it.

The template set is small — about 15 components:

- `FieldTemplate`, `ObjectFieldTemplate`, `ArrayFieldTemplate`, `ArrayFieldItemTemplate`
- `BaseInputTemplate`
- `ButtonTemplates` (`SubmitButton`, `AddButton`, `MoveDownButton`, `MoveUpButton`, `RemoveButton`, `CopyButton`)
- `DescriptionFieldTemplate`, `ErrorListTemplate`, `FieldErrorTemplate`, `FieldHelpTemplate`
- `TitleFieldTemplate`, `UnsupportedFieldTemplate`, `WrapIfAdditionalTemplate`

Each is ~50–200 LOC. Total estimate: ~1 500 LOC. Co-located unit tests; Storybook stories per template; axe-core passing on all stories.

## Consequences

**Positive**

- No double-MUI in the bundle.
- Templates honour the Reactory MUI theme (colors, typography, density) — we control them directly.
- Object-form `ui:title` / `ui:description` / `ui:error` extensions live cleanly inside our own templates; no need to wrap or patch a third-party theme.
- Bundle stays smaller than depending on `@rjsf/mui` (which pulls in its own widget set we don't need).

**Negative**

- We carry ~1 500 LOC of templates ourselves. This is the largest single chunk of new code in the migration.
- We don't get free updates from `@rjsf/mui`. Mitigated by: their template surface is stable; mostly we'd be adopting layout fixes which we can do reactively.

## Open question (deferred)

If `@rjsf/mui` ships a MUI v6 version during Phase 2, we re-evaluate. The decision can be flipped without rewriting any consumer code — only the contents of `form-engine/templates/` change.

## See also

- [`03-target-architecture.md#folder-structure-target`](../03-target-architecture.md#folder-structure-target)
- [`08-enterprise-capabilities.md#11-storybook--visual-regression-must`](../08-enterprise-capabilities.md#11-storybook--visual-regression-must)
