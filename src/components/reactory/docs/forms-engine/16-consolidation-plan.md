# 16 — Consolidation plan: retire the fork (spec WP-C5)

> Status: **Plan for review**, not started
> Written: 2026-09-24, from the platform hardening spec (WP-C5) and the Phase 1–5 closeouts
> Inventory: `node scripts/forms-engine-inventory.js` (summary) and `--markdown` (the appendix below)

## Where it stands

- The v5 engine is built and tested (Phases 1–5, 517 form-engine tests at Phase 5 exit, 641 today). It ships behind the `forms.useV5Engine` flag with a per-form `options.engine` override.
- **One form** runs on v5: `core.ReactoryNewFormInput` (`formDefinitions/ReactoryNewFormInput.ts`).
- Everything else still renders on the rjsf v4.2 fork at `components/reactory/form/` (22 source files). The fork carries `UNSAFE_componentWillReceiveProps` (`form/components/FormClass.tsx:51`), one of the React 19 blockers in WP-B6.
- The Phase 5 closeout left the remaining work as product coordination: migrate forms in waves, flip the flag, soak, delete the fork.

## Done means

From [`13-rollback-and-coexistence.md`](./13-rollback-and-coexistence.md#acceptance-for-full-retirement-phase-5), held for **four weeks**:

- no form with `options.engine: 'fork'`;
- no engine-blamed production incident;
- the deprecated-import codemod has run over every in-house consumer;
- the dev-only deprecation warning counter reads zero;
- the bundle-size budget holds.

Then: delete `components/reactory/form/`, write the retirement ADR, publish release notes and the downstream migration runbook.

## Inventory

A static scan of every TypeScript form definition (91 form directories across the server modules, the PWA and `reactory-client-core`), grouped by what stands between the form and v5:

| Readiness | Forms | Meaning |
|---|---|---|
| Ready | 34 | Only catalogue or standard widgets and v5 layouts. Pin `engine: 'v5'`, add to the parity test, smoke-test. |
| Plugin components | 31 | Uses FQN components or `widgetMap` entries. v5 resolves both (ADR-0003, `EngineDispatchedForm`), but each needs a render check because `formContext` differs. |
| Conditional schema | 1 | `if`/`then`/`else` or `dependencies`: needs `ui:field: 'ConditionalField'` (ADR-0007). |
| Blocked | 24 | Uses a widget or layout v5 does not have. Needs an adapter first. |
| On v5 | 1 | Done. |

By owner: reactory-core 28, reactory-reactor 23, reactory-zepz-quotes 15 (all plugin components), reactory-kb 7 (all blocked), client-core 4, classroom 3, socialeyes 3, PWA 4, google, kyc, communicator and temporal 1 each.

**Not in the scan:** the 8 YAML forms in `reactory-data/forms/`, forms built at runtime (workflow designer step property forms, ReactorChat form macros, the GraphQL editor's form builder, telemetry dashboards), and tenant forms stored in Mongo. Count those in Wave 0.

### Adapter gaps (what blocks the 24)

| Gap | Size | Work |
|---|---|---|
| `TabbedLayout` | 4 forms: Application, ReactoryContentCapture (cms), the reactor project form, client-core `UserImportForm` | Port the fork's tabbed layout as a v5 field. The largest single gap. |
| `ReactoryImageField` | 1 form (client-core Profile) | Port as a v5 field. |
| Lowercase aliases the fork maps: `tags`, `multiselect`, `search`, `markdown`, `number`, `slider`, `object`, `label`, `readonly`, `tel`, `document-viewer` | 11 aliases, 19 uses | An alias table in `form-engine/widgets` pointing at existing catalogue widgets. Mostly mechanical. |
| Named widgets missing from the catalogue: `TextAreaWidget`, `ArrayFieldWidget`, `ArrayField`, `TagsWidget`, `JSONEditorWidget`, `SwitchWidget`, `LabelWidgetV2`, `StaticContent`, `MultiSelect`, `FileUpload`, `TimezoneSelector`, `PaginationWidget`, `HeadingWidget`, `BadgeWidget`, and client-core's `ReactoryClientSelector`, `ReactoryOrganizationSelector`, `ReactoryBusinessUnitSelector` | 17 widgets, 21 uses | Wire the fork's existing widgets into the catalogue, or map them in each form's `widgetMap`. |
| Module-specific names without a `widgetMap` entry: `CourseSelector`, `ProjectListWidget`, `ProjectDetailForm`, `LogoWidget`, `UserPeersWidget`, `UserListItemWidget` | 6 widgets, 6 uses | Add the `widgetMap` entry the fork was resolving from its global registry. |

The per-form detail is in the appendix.

## Plan

Waves follow the risk-ascending order in [`13-rollback-and-coexistence.md`](./13-rollback-and-coexistence.md#migration-rollout-order). Each form is one small PR with per-form rollback (`engine: 'fork'`).

| Wave | Scope | Forms | Effort (engineer-days) |
|---|---|---|---|
| 0 | **Prerequisites.** Inventory the YAML, runtime and Mongo forms. Build the migration scoreboard (engine, render and error counts per form) on the telemetry hook. Add the alias table. Port `TabbedLayout` and `ReactoryImageField`. Wire the missing named widgets. | — | 5–7 |
| 1 | **Internal devtools:** FormEditor dialogs, debug panels, the remaining "ready" reactory-core admin forms | ~20 | 4–6 |
| 2 | **Workflow designer:** step property forms (14 contract fixtures `step-*`), PropertyForm synthetic-definition plumbing (1.5 days per the Phase 5 closeout) | ~15 + generated | 4–5 |
| 3 | **System forms:** login, profile, password reset, support, content | ~10 | 3–4 |
| 4 | **Tenant-facing CRUD:** zepz-quotes (15), kb (7), kyc, classroom, socialeyes, google | ~30 | 10–14 |
| 5 | **Plugin and data forms:** client-core (4), YAML forms (8), ReactorChat macros, Mongo tenant forms | ~15 + data | 4–6 |
| 6 | **Flag flip:** `forms.useV5Engine` default true once at least five forms have run cleanly in production; the fork remains the per-form fallback | — | 1 + monitoring |
| 7 | **Retirement**, after four weeks meeting the criteria above: codemod run, fork deletion, retirement ADR, release notes and runbook | — | 3 |

**Total: 34–46 engineer-days, plus the four-week soak.** That averages about half a day per form including smoke tests, in line with the Phase 5 closeout's per-form estimate, plus the adapter work in Wave 0.

Waves 1–3 need no product sign-off; Waves 4 and 5 touch tenants and need their owners (the quotes squad for zepz-quotes). Wave 6 is a product decision.

## Dependencies and risks

- **WP-B6 (React 19).** The fork's `FormClass.tsx` uses `UNSAFE_componentWillReceiveProps`. If B6 lands before Wave 7, convert `FormClass` to `componentDidUpdate` as part of B6; do not wait for the fork to go. ADR-0008 pins rjsf v5 to React 17 support; check that pin when B6 starts.
- **`formContext` differences** are the main source of per-form regressions (Phase 3 closeout). The 31 plugin-component forms carry most of this risk. Budget time to verify them in dev, since heavy widgets (Apollo, Mermaid, localforage) cannot render under jsdom.
- **The scan is static.** Widgets chosen at runtime or named in variables are missed. Wave 0 should confirm the gap list by rendering each form once with the v5 engine in dev.
- **Tenant forms in Mongo** can only be counted from a database, not from source.
- **Version pinning (WP-C3)** now applies on both engines: v5's `resolveFqn` passes `@version` through, so a form that names a version no plugin registers gets a warning (or, in strict mode, nothing).

## Open questions

1. Who signs off tenant-facing waves (4 and 5), and is a production scoreboard required before Wave 4 starts?
2. Should the flag flip (Wave 6) be per tenant first, or global?
3. Do plugin authors outside this repo exist whose forms need the deprecation window?

## Appendix: per-form inventory

Generated by `node scripts/forms-engine-inventory.js --markdown` on 2026-09-24. Rows are form directories; a directory can hold more than one form.

| Form directory | Owner | Readiness | Gaps |
|---|---|---|---|
| `reactory-data/plugins/reactory-client-core/src/components/TemplateEditors` | client-core | blocked (adapter needed) | widget ReactoryClientSelector, widget ReactoryOrganizationSelector, widget ReactoryBusinessUnitSelector, 3 plugin component(s) |
| `reactory-data/plugins/reactory-client-core/src/components/User` | client-core | blocked (adapter needed) | widget UserListItemWidget, 2 plugin component(s) |
| `reactory-data/plugins/reactory-client-core/src/components/User/Profile` | client-core | blocked (adapter needed) | layout ReactoryImageField |
| `reactory-express-server/src/modules/reactory-classroom/forms` | server:reactory-classroom | blocked (adapter needed) | widget CourseSelector, widget number, widget slider, widget object, widget MultiSelect, widget ArrayField, widget FileUpload, widget TimezoneSelector, runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-core/forms` | server:reactory-core | blocked (adapter needed) | widget ProjectListWidget, widget ProjectDetailForm, widget LogoWidget, widget UserPeersWidget, conditional schema, 2 plugin component(s) |
| `reactory-express-server/src/modules/reactory-core/forms/Application` | server:reactory-core | blocked (adapter needed) | layout TabbedLayout, 10 plugin component(s) |
| `reactory-express-server/src/modules/reactory-core/forms/Application/ApplicationRouteEditor` | server:reactory-core | blocked (adapter needed) | widget TagsWidget, widget JSONEditorWidget |
| `reactory-express-server/src/modules/reactory-core/forms/ReactoryContentCapture` | server:reactory-core | blocked (adapter needed) | layout TabbedLayout, widget TextAreaWidget, widget SwitchWidget |
| `reactory-express-server/src/modules/reactory-google/forms` | server:reactory-google | blocked (adapter needed) | widget label, widget tags |
| `reactory-express-server/src/modules/reactory-kb/forms/createArticle` | server:reactory-kb | blocked (adapter needed) | widget markdown, widget tags, widget multiselect |
| `reactory-express-server/src/modules/reactory-kb/forms/createKnowledgeBase` | server:reactory-kb | blocked (adapter needed) | widget tags |
| `reactory-express-server/src/modules/reactory-kb/forms/editArticle` | server:reactory-kb | blocked (adapter needed) | widget markdown, widget tags, widget multiselect, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-kb/forms/libraryHome` | server:reactory-kb | blocked (adapter needed) | widget search, runtime modules |
| `reactory-express-server/src/modules/reactory-kb/forms/searchArticles` | server:reactory-kb | blocked (adapter needed) | widget search, widget multiselect |
| `reactory-express-server/src/modules/reactory-kb/forms/searchResults` | server:reactory-kb | blocked (adapter needed) | widget search, widget PaginationWidget, 3 plugin component(s) |
| `reactory-express-server/src/modules/reactory-kb/forms/viewArticle` | server:reactory-kb | blocked (adapter needed) | widget HeadingWidget, widget BadgeWidget, 4 plugin component(s) |
| `reactory-express-server/src/modules/reactory-kyc/forms` | server:reactory-kyc | blocked (adapter needed) | widget readonly, widget document-viewer, widget tel |
| `reactory-express-server/src/modules/reactory-reactor/forms/AgentGitCommit` | server:reactory-reactor | blocked (adapter needed) | widget TextAreaWidget |
| `reactory-express-server/src/modules/reactory-reactor/forms/graph/ProjectIndexForm` | server:reactory-reactor | blocked (adapter needed) | widget StaticContent |
| `reactory-express-server/src/modules/reactory-reactor/forms/project` | server:reactory-reactor | blocked (adapter needed) | layout TabbedLayout, 8 plugin component(s) |
| `reactory-express-server/src/modules/reactory-reactor/forms/projectIncidents` | server:reactory-reactor | blocked (adapter needed) | widget ArrayFieldWidget |
| `reactory-express-server/src/modules/reactory-reactor/forms/projectSecurity` | server:reactory-reactor | blocked (adapter needed) | widget ArrayFieldWidget, widget TextAreaWidget |
| `reactory-express-server/src/modules/reactory-reactor/forms/projectTeamPanel` | server:reactory-reactor | blocked (adapter needed) | widget ArrayFieldWidget |
| `reactory-express-server/src/modules/reactory-reactor/forms/UsageDashboard` | server:reactory-reactor | blocked (adapter needed) | widget LabelWidgetV2 |
| `reactory-express-server/src/modules/reactory-core/forms/Workflow/WorkflowRegistryManagement` | server:reactory-core | conditional (ConditionalField) | conditional schema, runtime modules |
| `reactory-express-server/src/modules/reactory-classroom/forms/screens` | server:reactory-classroom | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-classroom/forms/screens/_shared` | server:reactory-classroom | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-core/forms/Application/ApplicationOrganizations` | server:reactory-core | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-core/forms/Application/ApplicationUsers` | server:reactory-core | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-core/forms/Applications` | server:reactory-core | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-core/forms/FormSubmissions` | server:reactory-core | plugin components (verify) | 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-core/forms/Support/SupportRequest` | server:reactory-core | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-core/forms/Support/SupportTickets` | server:reactory-core | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-core/forms/Workflow/WorkflowDetails` | server:reactory-core | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-reactor/forms/graph/GraphExplorer` | server:reactory-reactor | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-reactor/forms/graph/NodeEditor` | server:reactory-reactor | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-reactor/forms/graph/ProjectStatisticsForm` | server:reactory-reactor | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-reactor/forms/projects` | server:reactory-reactor | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-socialeyes/forms/Accounts/SocialAccounts` | server:reactory-socialeyes | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-socialeyes/forms/Feed/SocialFeed` | server:reactory-socialeyes | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-socialeyes/forms/Messages/SocialMessages` | server:reactory-socialeyes | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/_shared` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/CampaignSetupWizard` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/CorridorDetail` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/CorridorValidation` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/CustomerCohortLookup` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/CustomerRewards` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/FxRates` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/LoyaltyData` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/PriceCalculator` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/PricingAutoAdjustments` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/PricingBulkUpload` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/PricingComponents` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/PricingHistoricalRates` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/PricingSystemConfig` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 1 plugin component(s) |
| `reactory-express-server/src/modules/reactory-zepz-quotes/forms/QuotesDashboard` | server:reactory-zepz-quotes | plugin components (verify) | runtime modules, 2 plugin component(s) |
| `reactory-data/plugins/reactory-client-core/src/components/Develop` | client-core | ready | — |
| `reactory-express-server/src/modules/reactory-communicator/forms` | server:reactory-communicator | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/EmailForms` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/EmailTemplate/TemplateList` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Global` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Organization/Employee` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/ReactoryContentList` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Samples` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Security` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Security/Login` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Support/SupportTicketDelete` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/templates/BasicFormTemplate` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/User/CreateUserForApplication` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/User/Login` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Workflow/InstanceManagement` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Workflow/OperationsDashboard` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Workflow/SystemDashboard` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-core/forms/Workflow/WorkflowScheduleManagement` | server:reactory-core | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/aiModels` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/aiProviders` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/externalSources` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/projectDeployments` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/projectDocumentation` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/projectHistory` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/projectInfoPanel` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/projectMetrics` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/projectOverview` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/providerConfig` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/serviceCatalogue` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-reactor/forms/UserBudgetAdmin` | server:reactory-reactor | ready | — |
| `reactory-express-server/src/modules/reactory-temporal/forms` | server:reactory-temporal | ready | — |
| `reactory-pwa-client/src/components/plugins/reactory-core/application-management` | pwa-plugins | ready | — |
| `reactory-pwa-client/src/components/plugins/reactory-core/content-management/forms` | pwa-plugins | ready | — |
| `reactory-pwa-client/src/components/plugins/reactory-core/graphql-editor/schema` | pwa-plugins | ready | — |
| `reactory-pwa-client/src/components/reactory/formDefinitions` | pwa | on v5 | — |
