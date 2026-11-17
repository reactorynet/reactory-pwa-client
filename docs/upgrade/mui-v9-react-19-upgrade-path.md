# Upgrade path: MUI 6.5 to MUI 9, React 17 to 19, Node 20 to 24

Status: accepted, Phase 0 in progress (2026-11-17). Scope: `reactory-pwa-client` plus everything that renders inside it at runtime: the runtime plugins in `reactory-data/plugins`, the form widgets in `reactory-express-server/src/modules/*/forms`, and the `@reactorynet/reactory-core` types. Free (MIT) MUI packages only. The Froala editor is no longer used and is removed as part of this work (section 4, Phases 0 and 1).

## 0. Branching and upstream flow

The whole migration lives on one long-running feature branch per affected repository. Nothing reaches `master` until every phase is done and the full migration has been signed off.

```
reactorynet/master ──┬──────────────(merge master in regularly)──────────────┬──> PR: feature -> master
                     │                                                        │
                     └─ feature/mui-v9-react-19 ─┬─ phase-0 ─┬─ phase-1 ─ ... ─┘
                                                 PR (into feature branch)
                                                                   then, once master is green:
                                                                   reactory-repos sync --to <enterprise> --pr  (merge commit)
```

1. **Start level with upstream.** Before cutting the branch, and again before every phase, bring each repository level with `reactorynet` using reactory-workspace:
   - `bin/reactory-repos status --fetch --repo <r> ...`
   - `bin/reactory-repos pull -n --repo <r> ...`, then `pull` without `-n`

   This only fast-forwards; it never merges or rebases.
2. **One feature branch per repository**, all with the same name: `feature/mui-v9-react-19`. Cut each one from `reactorynet/master`. Repositories join when a phase first touches them:
   - `reactory-pwa-client`, `reactory-core` and `reactory-data` from Phase 0
   - `reactory-express-server` and the module repos under `src/modules/*` from Phase 1
3. **Each phase gets its own branch off the feature branch:** `feature/mui-v9-react-19-phase-<n>`. Each one is reviewed as a PR **into the feature branch**, not into `master`. When a phase spans several repositories, all of its PRs merge together.
4. **Keep the feature branch current.** At the start of each phase, merge `reactorynet/master` into the feature branch. Use a merge, not a rebase, because the branch is shared and pushed.
5. **Finish on upstream first.** After the last phase:
   - Run the full gate on the feature branch: tests, the tsc ratchet, the plugin smoke harness and the visual baselines.
   - Pin the tested combination of all repository SHAs with `bin/reactory-repos lock`.
   - Open the feature → `master` PR on `reactorynet` in every repository.
   - Merge them together. The workspace default for feature PRs is squash. A merge commit keeps the per-phase history; decide which before merging.
6. **Then the enterprise mirrors.** Only after `reactorynet/master` is green, with everything working, bring each enterprise mirror level:
   - `bin/reactory-repos sync --to <enterprise> -n`, then `--pr`
   - Sync PRs must land as a **merge commit**, never squash or rebase, so the two organisations keep a common ancestor.
   - Enterprise-owned paths (`org_specific_paths` in the enterprise profile) do not cross.

This file lives in the public upstream repository, so it names no enterprise organisation. That follows the reactory-workspace rule.

## 1. Facts that shape the plan

| Fact | Source | Consequence |
|---|---|---|
| There is no Material UI v8. Core went from 7 to 9 (9.0.0 on 2026-04-07) so it shares a major version with MUI X v9. Latest stable is **9.5.0** (2026-10-09). | npm registry, mui.com/blog/introducing-mui-v9 | The path is 6 → 7 → 9. |
| `@mui/material` 7.x and 9.x both allow **React `^17 \|\| ^18 \|\| ^19`**, @emotion 11 and TypeScript 4.9 or later. | npm peerDependencies | **The MUI upgrade does not require the React upgrade.** They can be run and released as separate tracks. |
| MUI 7 and later depend on `react-is@19`. On React 17 or 18 you must pin `react-is` to the React version with a yarn `resolutions` entry. | MUI v7 migration guide | Add this pin when moving to MUI 7. Remove it when React reaches 19. |
| MUI X v9 (`@mui/x-data-grid` / `@mui/x-date-pickers` 9.18.0) peers on `@mui/material ^7.3 \|\| ^9`. X v8 stops at material ^7. | npm | Move the X packages straight to v9 once core is on 7.3. Do not stop at X v8. |
| `@mui/styles` (makeStyles/withStyles, JSS) ended at 6.4.8 and is deprecated. | npm | Any `makeStyles` path is dead. This client does not install `@mui/styles`, so the existing calls are already no-ops behind guards. |
| MUI 9 browser floor: Chrome 117, Edge 121, Firefox 121, Safari 17. | MUI `.browserslistrc` | Our browserslist is `>0.2%, not dead`. This is a product decision, see section 8. |
| MUI 9 replaced the `./*` export wildcard with explicit subpaths. Each one ships CJS (`require`) and ESM (`import`). | npm `exports` | Jest 29 still gets CJS. No deep imports (`@mui/material/X/Y`) were found in any repo. |
| Node 20 reached end of life on 2026-04-30. Node 24 is Active LTS. The server is already pinned to **24.22.3**. | nodejs.org, server `.nvmrc` | The Node upgrade is a prerequisite, not a phase. React itself has no Node requirement. |
| The React path is 17 → 18.3 → 19. 18.3 adds warnings for everything 19 removes. Latest is 19.3.1. | react.dev upgrade guide | Two React phases. |

## 2. What we found in the code

### 2.1 MUI and React reach plugins through the registry

`src/components/index.tsx` registers the following, and plugins receive them by dependency injection (`reactory.getComponents([...])`):

- `react.React`
- `material-ui.MaterialCore` (the whole `@mui/material` namespace)
- `material-ui.MaterialIcons`, `MaterialLab`, `MaterialDates` and `MaterialGrid`
- `material-ui.Material`, a bundle of all of the above. It also aliases **`MaterialTable` to `@mui/x-data-grid`**.
- `react-beautiful-dnd`'s `DragDropContext`

Plugins are built in other repos and type against `Reactory.Client.Web.IMaterialModule` from `reactory-core`. Nothing typechecks them against the MUI version the client actually ships. **A breaking MUI change shows up as a runtime failure inside a plugin, not as a build error.** That makes plugin migration and a plugin smoke harness first-class work in every phase.

| Codebase | Source files | Notes |
|---|---|---|
| `reactory-pwa-client/src` | 1,578 | |
| `reactory-data/plugins/__runtime__/src` | 116 (106 plugins) | Built with rollup. Receives `React` and `Material` by DI. |
| `reactory-data/plugins/reactory-client-core/src` | 71 | Legacy. Imports the npm `material-table` package and an unregistered `material-ui.MaterialTable` FQN. Probably partly dead, see section 8. |
| `reactory-express-server/src/modules/*/forms` | about 90 widget files using MUI | 78 form files configure `MaterialTableWidget`. |

### 2.2 Impact scan

These are grep heuristics. Treat them as upper bounds for sizing, not exact work lists. Each cell is files / occurrences. The script is reproducible: the `scan.sh` patterns are listed in Appendix A.

| Pattern | Breaks at | Client | Runtime plugins | client-core plugin | Server forms |
|---|---|---|---|---|---|
| Legacy `Grid` with `item` / `xs=` | v7 (semantics), v9 (removed) | 25 / 113 | 21 / 76 | 5 / 25 | 18 / 90 |
| `Grid2` import | v7 (renamed to `Grid`) | 13 / 31 | 1 / 1 | 1 / 2 | 1 / 1 |
| TextField-style `InputProps`, `inputProps`, `InputLabelProps`, `SelectProps`, `FormHelperTextProps` | v9 | 68 / 140 | 25 / 33 | 6 / 15 | 24 / 35 |
| `PaperProps`, `PopperProps`, `BackdropProps`, `MenuListProps` | v9 | 27 / 32 | 3 / 3 | 0 | 3 / 3 |
| `primaryTypographyProps` / `secondaryTypographyProps` | v9 | 11 / 35 | 6 / 8 | 0 | 4 / 4 |
| `components=` / `componentsProps=` | v9 | 1 / 4 | 1 / 2 | 2 / 2 | 0 |
| System props on Box, Stack, Typography or Link (for example `mt=`) | v9 | 184 / 534 | 79 / 299 | 9 / 28 | 70 / 282 |
| `disableEscapeKeyDown`, `renderTags`, Typography `paragraph`, Divider `light` | v9 | 8 / 13 | 4 / 5 | 0 | 4 / 4 |
| `*Outline` icon names (23 removed in v9; check against the list) | v9 | 15 / 24 | 0 | 0 | 0 |
| `makeStyles` / `withStyles` (dead today) | already broken | 4 / 4 | 0 | 6 / 10 | 0 |
| `ReactDOM.render` / `unmountComponentAtNode` | React 19 (deprecated in 18) | 3 / 6 (incl. plugin-facing `reactory.mountComponent`) | 0 | 0 | 0 |
| `@testing-library/react-hooks` | React 18 | 45 / 45 | | | |
| `.defaultProps =` / `.propTypes =` | React 19 | 15 / 16 and 14 / 15 | 0 | 3 / 3 and 3 / 5 | 0 |
| `UNSAFE_*` lifecycles | React 19 | 2 / 4 (`form/components/FormClass.tsx`, tracked as WP-B6) | 0 | 2 / 3 | 0 |
| Global `JSX.*` namespace | React 19 types | 3 / 10 | 0 | 4 / 17 | 0, but `reactory-core` types use it |
| `react-beautiful-dnd` | React 19 | 9 / 12 (and registry export) | | | |
| `react-quill` (calls `findDOMNode`) | React 19 | 10 / 16 | | | |
| `framer-motion` 10 | already peers on React 18 | 15 / 21 | | | |
| `react-measure` / `react-draggable` | React 19 (draggable needs `nodeRef`) | 6 / 8 and 1 / 1 | | | |

No string refs, legacy context, `findDOMNode`, or deep `@mui/*/*/*` imports were found in any repo.

### 2.3 Peer violations that already exist today

These show that the dependency tree is already out of policy. Fix them as part of the phases below; do not treat them as new risk.

- `@mui/x-data-grid` 5.17 peers on `@mui/material ^5` and React 18 or lower. It is installed against material 6.
- `framer-motion` 10.18 and `react-window` 2.2.7 peer on React 18 or higher. They are installed against React 17.
- `reactory-core` dev-depends on `@types/react` 18.3.3. The client uses 17.0.2.
- The client repo has both `package-lock.json` and `yarn.lock`, while `packageManager` says yarn 4. Delete `package-lock.json` in Phase 0.

## 3. MaterialTableWidget

`src/components/reactory/ux/mui/widgets/MaterialTableWidget/` is **a custom table built on MUI primitives**: `Table*`, `TablePagination`, `Grid2`, `Toolbar`, `Checkbox` and so on. It does not use the `material-table` npm package or `@mui/x-data-grid`.

- Size: 2,497 lines in the main file plus hooks and sub-components.
- Consumers: 78 server form files configure it through `uiSchema`.
- Tests: 8 suites, 215 tests. All passed on 2026-11-17 on MUI 6.5 / React 17. This is the baseline.

**Recommendation: keep it on MUI primitives and keep its `uiSchema` contract frozen. Do not rebase it onto the free DataGrid.**

- Table primitives barely change from v7 to v9. The widget is already on `Grid2` with `size`, uses `onPageChange` / `onRowsPerPageChange`, and passes `component="div"` to `TablePagination`. MUI work is small.
- The free (MIT) DataGrid lacks features the widget relies on or exposes:
  - detail panels (master/detail is Pro)
  - multi-column sort, column pinning and tree data (Pro)
  - row grouping and Excel export (Premium)
  - pages larger than 100 rows (the MIT grid is capped at 100)
- Rebasing would mean re-implementing those features on top of DataGrid, or dropping them for 78 forms.

Work inside the widget, by phase:

| Phase | Change |
|---|---|
| MUI 7 | `Grid2 as Grid` becomes `Grid`. Check `ReactoryMaterialTablePagination`, which spreads caller `{...props}` into `TablePagination`. Make sure no caller sends `SelectProps` or `backIconButtonProps` (both move to `slotProps` in v9). |
| MUI 9 | Run `deprecations/all` over the folder. Visual diff of the toolbar, pagination and footer totals. |
| React 18 | `App.tsx` wraps the tree in `<React.StrictMode>`, so React 18 will mount, unmount and remount every effect in development. The widget has 12 `useEffect`s: event bind/unbind for refresh and fetch-on-query. Make sure cleanup is correct so dev does not double-fetch or leak listeners. Automatic batching can also merge the `setQuery` / `setData` / `setRowState` sequences. Re-run the 215 tests and add tests for refresh events. |
| React 19 | `PureComponent` import (unused). Toolbar, detail-panel and action components resolved from the registry are plugins, so they follow the plugin rules in section 5. |

**Separately: the `material-ui.Material.MaterialTable` alias that points at `@mui/x-data-grid` is misleading.** No code in the client, the runtime plugins or the server forms renders `DataGrid`. The graphql-editor `ResultDataGrid` is also built on `Table` primitives. Deprecate the alias (log a warning on access) and remove it after one release.

## 4. Recommended sequence

The two tracks are independent because MUI 9 supports React 17. **Do the MUI track first**, because it is the stated goal and most of its work is mechanical. Then do React. Each phase merges into the feature branch (section 0), never into `master`. Where a phase below says "Exit", that means the phase PR merges into `feature/mui-v9-react-19`.

```
Phase 0  Foundations         Node 24, lockfile, baselines, plugin smoke harness
Phase 1  MUI 6 cleanup       Clear v9 removals while still on v6 (ships on 6.5)
Phase 2  MUI 7 + X v9        Grid rename, react-is pin, data-grid/pickers to 9
Phase 3  MUI 9               Version bump + leftovers, lab 9, browser floor   <- MUI goal reached
Phase 4  React 18.3          Test stack, createRoot, types, deps
Phase 5  React 19            dnd/quill replacements, nodeRef, FormClass, types
```

Phase 4 can start in parallel with Phases 2 and 3 on a branch, if staffing allows. It touches different files: tests, entry point and third-party libs.

### Phase 0: Foundations

- Set `.nvmrc` to `24.22.3` to match the server. CI already reads `.nvmrc` (`ci.yml`, `build-smoke-test.yml`). The `Dockerfile` is nginx-only and needs no change. Do the same in `reactory-core` and `reactory-data/plugins/__runtime__`.
- Yarn 4 is the only package manager: `yarn.lock` is tracked and `package-lock.json` is gitignored. Delete any local `package-lock.json`. Add `engines.node >=24` to `package.json`, as the server has.
- **Remove Froala (client).** Drop the `froala-editor` and `react-froala-wysiwyg` dependencies, the webpack vendor-chunk entries and the `WIDGET_INDEX.yaml` dependency.
  - The `FroalaWidget` widget *name* stays for now. It is already an alias of `RichEditorWidget` and does not load Froala.
  - Five server `uiSchema`s still reference that name. Phase 1 moves them over, then removes the alias.
- Baselines:
  - full `jest` run
  - `npx tsc --noEmit` error count, to use as a ratchet
  - Playwright screenshots of key screens (a MaterialTableWidget list, a form with grid layout, dialogs, date picker)
- **Plugin smoke harness**, run with `yarn test:plugins`. Code is in `test/plugin-smoke/` and the config is `jest.plugins.config.ts`. It catches runtime breakage in plugins that nothing else sees, and it gates every later phase.
  - **Discovery:** it reads each `rollup.<fqn>.js` config in `reactory-data/plugins/__runtime__` (override the location with `REACTORY_PLUGINS_DIR`) and loads that plugin's entry the way the browser does.
  - **Host:** each plugin gets a `window.reactory.api` whose `getComponent(s)` resolves against the client's **real** `componentRegistery`, using the client's own FQN resolution. It renders every component the plugin registers with two generic prop sets.
  - **Baseline:** outcomes are recorded in `test/plugin-smoke/baseline.json` as a ratchet. A plugin that loaded or rendered before must still do so. Plugins that fail on generic props are recorded but do not fail the run.
  - **Refresh:** after an intended change, run `UPDATE_PLUGIN_BASELINE=1 yarn test:plugins`.
- Exit: Node 24 green in CI, baselines recorded, harness green on the feature branch.

#### Phase 0 record (2026-11-17, Node 24.22.1 locally, MUI 6.5 / React 17.0.2)

| Baseline | Result |
|---|---|
| `jest -c jest.ci.config.ts` | 255 / 255 suites, 3,581 / 3,581 tests passing. The quarantine list is empty. |
| `tsc --noEmit -p tsconfig.json` | 0 errors |
| MaterialTableWidget suites | 8 suites, 215 tests passing |
| Plugin smoke harness | 106 / 106 plugins load. 64 / 106 components render; 38 fail on generic props; 4 are non-components and are skipped. A deliberately broken `Typography` in the registry made 29 of them fail, which confirms the ratchet catches regressions. |

Open Phase 0 items:

- **Visual baselines (Playwright).** These need the full stack running: the API plus Postgres and Mongo. `playwright.config.ts` deliberately has no `webServer`.
- **Harness in CI.** The client CI job needs a checkout of `reactorynet/reactory-data` next to the client.
- **Server form widgets.** Widgets under `reactory-express-server/src/modules/*/forms/**/Widgets` are not covered yet, except where they are also built as runtime plugins.
- **Plugin fixtures.** Adding per-plugin fixture props would raise the 64 / 106 coverage.

Pre-existing plugin bug found by the harness, and left out of scope here: 9 plugins return JSX in an early "no data" guard **before** they destructure `React` from the registry. Those plugins are the `core.SupportTicket*` panels and the `socialeyes.*DetailPanel`s. That path throws in production too.

### Phase 1: Clear the v9 removals while still on MUI 6.5

Every v9 removal has a replacement that already works in v6. Doing this on 6.5 means it ships behind no version change, the diffs can be reviewed per area, and Phases 2 and 3 become version bumps.

- `npx @mui/codemod@latest deprecations/all <path>`. Covers the `slots` / `slotProps` migrations for TextField, Dialog, Popover, Autocomplete, ListItemText and TablePagination.
- `npx @mui/codemod@latest v9.0.0/system-props <path>` (system props to `sx`). Check that the codemod runs against a v6 tree. If it does not, convert by hand per area.
- Legacy `Grid` (`item` / `xs`) to `Grid2` with `size={{ xs, md }}`. Use `v7.0.0/grid-props` as a guide; most hits are mechanical. Migrating to `Grid2` now, while v6 still has both, avoids `GridLegacy` entirely.
- Remove the dead `makeStyles` paths: `ContentRenderer`, `ConditionalIconWidget`, `ReactoryColorPicker`, the `D3` renderer, and the `MaterialStyles.makeStyles` callers in the client-core plugin.
- Replace removed `*Outline` icon names with `*Outlined`.
- **Finish removing Froala:**
  - Change `ui:widget: 'FroalaWidget'` to `RichEditorWidget` in the server forms: `TemplateEditor`, `ReactoryAdmin/dashboard`, `HelpEditor`, `SupportTicket.view.model` and `BasicFormTemplate`. Update the classroom contract test.
  - Then remove the `FroalaWidget` alias from both widget maps and their tests.
  - Remove the `froala_key` / `REACT_APP_FROALA_KEY` prompts from the reactor config CLI.
  - Remove `components/Froala/*` and its use in `EmailTemplateEditor` from the `reactory-client-core` plugin, or retire that plugin (section 8).
- Run all of the above over the client, `__runtime__` plugins, the client-core plugin and the server form widgets. Rebuild the plugins.
- Exit: scan rows marked v7/v9 in 2.2 at zero, except `Grid2`. Tests, tsc ratchet and plugin harness green. Visual diffs reviewed.

### Phase 2: MUI 7.3 and MUI X v9

- `@mui/material`, `system`, `icons-material` and `utils` to `^7.3`. `@mui/lab` to its 7 beta, or drop it (see section 8).
- Add `resolutions: { "react-is": "17.0.2" }`. Change it to 18.x in Phase 4 and remove it in Phase 5.
- `npx @mui/codemod@latest v7.0.0/all src`. Covers the Grid rename (`Grid2` to `Grid`), the `InputLabel` `size="normal"` to `"medium"` change, lab-removed components and theme colour functions.
- **Registry compat for plugins.** Export `Grid2` as an alias of the new `Grid` in `material-ui.MaterialCore` and `material-ui.Material` for one release, so a plugin that destructures `Grid2` keeps working. Log a deprecation warning.
- Theme: if the theme uses `cssVariables` / `colorSchemes`, `theme.palette.mode` no longer re-renders on mode change. 28 client files read `palette.mode`. Use `theme.applyStyles('dark', …)` or `forceThemeRerender`.
- MUI X, taken straight to 9.x:
  - `@mui/x-date-pickers` 6 to 9. Run the `v7.0.0/pickers/preset-safe`, `v8.0.0/pickers/preset-safe` and `v9.0.0/preset-safe` codemods in order.
    - Consumers: `DateSelector`, `App.tsx` (`LocalizationProvider` with `AdapterMoment`, which is still supported) and the `MaterialDates` registry export.
    - The v8 section-based field DOM breaks tests that query `<input>`.
  - `@mui/x-data-grid` 5 to 9, or remove it (see section 8). It has no direct consumers, so the codemod chain only matters for plugins outside these repos.
  - X v8+ imports CSS. Add a `moduleNameMapper` entry for `@mui/x-*` CSS in `jest.config.ts` if needed.
- Update `reactory-core` (`IMaterialModule` types, `@mui/*` devDeps), publish it, and bump it in the client and plugins.
- Exit: tests, harness and visual diffs green, then release.

### Phase 3: MUI 9 (the MUI goal)

- `@mui/material` and friends to `^9.5`, `@mui/lab` to `9.0.0-beta.x` or dropped.
- Run `deprecations/all` and `v9.0.0/system-props` again to catch anything added since Phase 1.
- Changes the codemods do not cover:
  - `disableEscapeKeyDown` on Dialog and Modal is removed. Handle `onClose(reason === 'escapeKeyDown')` instead. 7 files across the repos.
  - `MenuItem` / `Tab` rendered outside `Menu` / `Tabs` now throws. Check `DropDownMenu` and any custom menus. The plugin harness will catch these.
  - `ButtonBase` `nativeButton` and its event semantics.
  - `Stepper` renders `ol` / `li`.
  - `ListItemIcon` min-width is now 36px. Check visual diffs.
  - Autocomplete `renderTags` becomes `renderValue`.
  - MUI's `NODE_ENV === 'test'` branches are replaced by feature detection, which can change jsdom snapshots and transitions.
- Remove the `Grid2` registry alias.
- Browserslist: align with MUI's floor or accept the risk (section 8).
- Exit: the same gates, then release. **MUI v9 is done at this point, still on React 17.**

### Phase 4: React 18.3

- `react` and `react-dom` 18.3.x. `@types/react` and `@types/react-dom` 18. Change the `react-is` pin to 18.
- Types: `npx types-react-codemod@latest preset-18 ./src`. The main issue is that `React.FC` no longer has implicit `children`; 346 files use `FC`. `strict: false` limits the fallout, but the tsc ratchet will still move.
- Entry and mounting:
  - `src/index.tsx` moves to `createRoot`.
  - `reactory.mountComponent` / `unmountComponent` (`api/ReactoryApi.tsx` around line 2160) and `attachComponent` (`components/util.tsx`) are part of the **plugin-facing API**. Re-implement them on `createRoot` with a `Map<Element, Root>` registry so `unmountComponent(node)` keeps its signature.
- Test stack:
  - `@testing-library/react` 12 to **16.3.x**, which supports both 18 and 19, so there is only one migration.
  - Migrate 45 files off `@testing-library/react-hooks` to `renderHook` from `@testing-library/react`.
  - Fix `act` warnings.
- StrictMode: `App.tsx` already uses it, so the effect double-invoke applies in development. Fix cleanup bugs as they show up. MaterialTableWidget is the priority (section 3).
- Dependencies, moved to versions that accept 18 and 19 so Phase 5 does not touch them again:

  | Package | Target | Note |
  |---|---|---|
  | `@apollo/client` | 3.14 | 4.x is a separate project |
  | `react-redux` | 9.x | |
  | `framer-motion` | `motion` 11+ | Already needs 18 |
  | `recharts` | 3.x | Check charts in visual diff |
  | `react-router` / `react-router-dom` | 6.30 | 7 later; 8 needs React 19.2 and Node 22 |
  | `react-dropzone` | 19.x | 20 needs Node 22, which is fine on 24 |
  | `react-markdown` | 10 | ESM only, so add it to `transformIgnorePatterns` |
  | `react-i18next` | stays | |
  | `react-window` | stays | Already 18 or higher |

- rjsf: `@rjsf/core` 5.24.13 accepts React 17 or later. We do not use `@rjsf/mui` (ADR-0004), so no rjsf change is forced. Revisit ADR-0008 (the rjsf 6 move) as its own decision, not as part of this phase.
- Run on 18.3 and fix every React 19 deprecation warning in the console and in tests. That list is the Phase 5 worklist.
- Exit: the same gates, with zero React 19 deprecation warnings in the test run. Then release.

### Phase 5: React 19

- `react` and `react-dom` 19.x. `@types/react` 19. Remove the `react-is` pin.
- Codemods: `npx codemod@latest react/19/migration-recipe` and `npx types-react-codemod@latest preset-19 ./src`. These cover `useRef()` needing an argument, `JSX` becoming `React.JSX`, and ref-callback implicit returns.
- Library replacements:
  - `react-beautiful-dnd` (9 files) to `@hello-pangea/dnd` 18. Its API is the same. **The registry exports `DragDropContext`, `Droppable` and `Draggable` to plugins**, so swap the implementation behind the same registry names.
  - `react-quill` (10 files) to `react-quill-new` 3.x. It is ESM-only, so add it to the jest transform list.
  - `react-draggable`: pass `nodeRef`. Every direct `react-transition-group` `Transition` / `CSSTransition`: pass `nodeRef`.
  - `react-measure` is unmaintained. It uses a callback ref and is probably fine. Verify it in the visual diff, and if it breaks, replace it with a `ResizeObserver` hook.
- Code:
  - `.defaultProps` on function components moves to default parameters: 15 client files and 3 client-core plugin files.
  - `propTypes` are silently ignored. Delete them or convert them to TS types.
  - `FormClass.tsx` `UNSAFE_componentWillReceiveProps` is forms-engine WP-B6. Convert it to `componentDidUpdate` if the fork has not been retired by then.
  - `reactory-core` types move from global `JSX.Element` to `React.JSX.Element`. Republish and bump.
- Exit: the same gates, then release.

## 5. Plugin rules for every phase

1. The plugin source in `reactory-data/plugins` and the server `forms/**/Widgets` is migrated in the **same phase** as the client, on the same-named feature branch in each repository. The codemods run over those trees too.
2. Every phase bumps and publishes `reactory-core` types before the client consumes them.
3. The registry is where compatibility shims live: aliases with deprecation warnings that last one release. Prop renames (`slotProps`) cannot be shimmed, which is why Phase 1 migrates plugins up front.
4. The plugin smoke harness gates merge.
5. Any third-party or tenant plugin outside these repos gets the codemod commands and a release note one release ahead of each breaking phase.

## 6. Effort (rough, to be refined after Phase 0)

| Phase | Size | Driver |
|---|---|---|
| 0 Foundations | M | Building the plugin harness and visual baselines |
| 1 MUI 6 cleanup | L | Volume: about 1,000 system-prop and `slotProps` sites across 4 trees. Mostly codemod plus review. |
| 2 MUI 7 + X v9 | M | Grid rename, pickers codemod chain, theme `palette.mode` |
| 3 MUI 9 | S–M | Throws inside Menu/Tabs, ButtonBase, visual review |
| 4 React 18.3 | L | 45 hook tests, RTL 16, types, mount API, StrictMode effect bugs, dependency bumps |
| 5 React 19 | M | dnd/quill swaps, `defaultProps`, `reactory-core` JSX types |

## 7. Risks

| Risk | Mitigation |
|---|---|
| Plugin breakage is runtime-only and invisible to tsc | Plugin smoke harness, lockstep releases, registry shims |
| Legacy `Grid` props ignored silently by the new `Grid`: layouts collapse without errors | Phase 1 converts every legacy `Grid` while v6 still has both. Grep gate: zero `<Grid item` |
| Visual regressions (`ListItemIcon` width, Stepper markup, picker field DOM) | Playwright screenshot baselines from Phase 0 |
| StrictMode double effects expose latent cleanup bugs | Fix in Phase 4. They are real bugs that StrictMode only makes visible. |
| MUI 9 running on React 17 is supported but less common | Short phases. Phase 4 can start right after Phase 3 |
| `@mui/lab` is still beta at v9 | Keep lab usage to the registry export only, or drop it |
| The long-running feature branch drifts from `master` and the final merge is painful | Merge `reactorynet/master` into the feature branch at the start of every phase (section 0) |
| The client, plugins and server go out of step across repositories | Use the same branch name everywhere, merge each phase's PRs together, and pin the tested combination with `reactory-repos lock` before the final merge |

## 8. Decisions needed

1. **Order.** MUI first (recommended above) or React 18 first. Both work, because MUI 9 supports 17.
2. **`@mui/x-data-grid`.** Upgrade to 9 and keep it only as a registry export, or remove it. Nothing in these repos renders it. Keeping it costs bundle size and a codemod chain for unknown external plugins.
3. **Browser floor.** MUI 9 targets Safari 17, Chrome 117 and Firefox 121. Accept that and update browserslist, or keep `>0.2%, not dead` and test the older browsers ourselves.
4. **`@mui/lab`.** Keep it (Timeline, Masonry, TabContext) on the beta, or drop it from the registry. Nothing in the client imports it directly.
5. **Legacy `reactory-client-core` plugin.** It imports the npm `material-table` package and an unregistered `material-ui.MaterialTable` FQN. Either retire it or migrate it as part of Phase 1.

## Appendix A: scan patterns

These are extended regex over `*.ts`, `*.tsx`, `*.js` and `*.jsx`. They exclude `node_modules`, `build`, `dist`, `lib`, `coverage` and `.d.ts` files.

- Legacy Grid: `<Grid[^>]*\b(item|xs=|sm=|md=|lg=)`
- TextField props: `\b(InputProps|inputProps|InputLabelProps|SelectProps|FormHelperTextProps)=\{`
- System props: `<(Box|Stack|Typography|Link)\b[^>]*\s(m|mt|mb|ml|mr|mx|my|p|pt|pb|pl|pr|px|py|color|bgcolor|display|fontWeight|textAlign|width|height)=`. This over-counts, because `color` on Typography is a real prop.
- React: `ReactDOM\.(render|hydrate|unmountComponentAtNode)`, `\.defaultProps *=`, `\.propTypes *=`, `UNSAFE_|componentWill(Mount|ReceiveProps|Update)\b`, `\bJSX\.[A-Z]`
