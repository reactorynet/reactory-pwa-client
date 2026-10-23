# shared/Organization

This folder is **not** the organization UI. The canonical organization UI, state
and GraphQL operations live in the `reactory-core` plugin:

```
src/components/plugins/reactory-core/organization-management/
```

What remains here:

| Path | Purpose |
|---|---|
| `theme/` | **Live.** Runtime organization theme resolution (`OrganizationThemeService`, `resolveOrganizationTheme`). Consumed by `src/App.tsx`. Introduced by ORG-014. |
| `graph/queries.ts` | Only the `OrganizationTheme` query used by `theme/`. |

## History

ORG-041a (REACTORY-302016408/20261023/3461146876) deleted the duplicated
implementation that used to live here — `components/OrganizationSelector.tsx`,
`hooks/useOrganization.ts`, `hooks/useOrganizationList.ts`, `models/`, the
organization CRUD queries in `graph/` and the empty barrel files. None of it was
reachable: only `App.tsx` imported from this tree, and only the `theme/`
barrel.

Do not reintroduce organization UI, hooks or models here. Extend the plugin
instead. If you need to change theme resolution, `theme/` is the right place.
