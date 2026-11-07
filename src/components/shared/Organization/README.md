
# shared/Organization

This folder is **not** the organization *management* UI. The canonical
organization management surface, state and CRUD operations live in the
`reactory-core` plugin:

```
src/components/plugins/reactory-core/organization-management/
```

What lives here:

| Path | Purpose |
|---|---|
| `theme/` | **Live.** Runtime organization theme resolution (`OrganizationThemeService`, `resolveOrganizationTheme`). Consumed by `src/App.tsx`. Introduced by ORG-014. |
| `graph/queries.ts` | Only the `OrganizationTheme` query used by `theme/`. |
| `components/OrganizationSelector.tsx` | **Live.** The *session* organization switcher: it lists the organizations the signed-in user is a member of and delegates the switch to `reactory.switchOrganization`. Mounted in the application header (`src/components/shared/header/DefaultHeader.tsx`). |

## Why the switcher lives here and not in the plugin

ORG-041a removed a second, *unreachable* organization management UI from this
tree — that removal stands, and management UI (list, create, edit, branding,
people, structure, demographics) still belongs to the plugin.

`OrganizationSelector` is a different thing: it does not administer an
organization, it changes **which** organization the session is in. That is shell
state, not plugin state — the switch has to persist through
`setActiveOrganization`, re-resolve branding through `OrganizationThemeService`
and apply it inside `App`'s `isBrandingPending` gate, all of which are shell
concerns that a plugin cannot reach. It also has no plugin equivalent to extend:
the plugin's organization surfaces are admin CRUD over *other* organizations.

It is the counterpart of `src/components/shared/LanguageSelector`: a compact
toolbar control that reads the session and delegates, returning `null` when
there is no choice to make.

## History

ORG-041a (REACTORY-302016408/20261023/3461146876) deleted the duplicated
implementation that used to live here — `components/OrganizationSelector.tsx`,
`hooks/useOrganization.ts`, `hooks/useOrganizationList.ts`, `models/`, the
organization CRUD queries in `graph/` and the empty barrel files. None of it was
reachable: only `App.tsx` imported from this tree, and only the `theme/`
barrel.

The deleted selector had never been mounted and could only write
`localStorage['CoreDefaultOrganization']` — there was no server mutation to call.
It was reintroduced (ORG-014 follow-up, REACTORY-302016408/20261107/1899253698)
only after `setActiveOrganization` landed on the server, and it is wired to the
canonical mutation rather than to browser storage.

## Shell entry points

| Callable | Contract |
|---|---|
| `reactory.switchOrganization(organization)` | The live switch: persists through `setActiveOrganization`, re-resolves branding under the `isBrandingPending` gate, refreshes the session and applies the theme. **Rejects** (`OrganizationSwitchError`) when the server refuses, leaving the current organisation and theme untouched. |
| `reactory.setActiveOrganization(organization)` | **Alias of the above.** It used to persist to `localStorage` and return a resolution with no server write; it is now the full switch and rejects on refusal. Kept so earlier host surfaces keep working. |
| `reactory.refreshOrganizationTheme()` | Forces a re-fetch of the active organisation's branding and re-applies it. |

## Rules

- Do not add organization **management** UI, hooks or models here. Extend the
  plugin instead.
- Do not add organization CRUD GraphQL operations here. `graph/` carries only
  what `theme/` and the switcher need.
- If you need to change theme resolution, `theme/` is the right place.
