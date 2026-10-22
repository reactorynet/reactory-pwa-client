/**
 * GraphQL documents for the self-service My Demographics section (ORG-034).
 *
 * The server contract is fixed (`reactory-express-server`, Demographics):
 *
 *   query    MyDemographics(organizationId: String!, membershipId: String)
 *   mutation MySaveDemographics(organizationId: String!, values: [DemographicValueInput!]!, membershipId: String)
 *   query    OrganizationDemographicDefinitions(organizationId: String!, includeDisabled: Boolean)
 *
 * All three are `@auth(USER)`: the section never reads another member's values
 * and never sends a `user` field on save — the server writes for the caller and
 * rejects a payload that names somebody else.
 *
 * The organization's self-service policy is not a top-level query: it is the
 * `Organization.demographicsPolicy` **field** (`@roles(READ_ROLES)` = `['USER']`,
 * resolved by `DemographicResolver.organizationPolicy`), so it is read through
 * `CoreOrganization`. Reading it up front is what lets the form render
 * read-only from its first paint instead of only learning the policy when a
 * save is refused.
 */

/**
 * `DemographicDefinition` fields the shared renderer actually reads.
 *
 * Mirrors `type DemographicDefinition` in the server schema. `schema`,
 * `componentProps` and `componentPropsMap` are the server's `Any` scalar and
 * are consumed as opaque JSON by the renderer.
 */
export const DEMOGRAPHIC_DEFINITION_FIELDS = `
  id
  organization
  key
  title
  description
  icon
  category
  valueType
  schema
  options { key label ordinal deprecated }
  reference { model multiple }
  widget { componentFqn componentProps componentPropsMap }
  required
  multiValued
  sensitive
  searchable
  enabled
  ordinal
  roles
  system
`;

/**
 * `DemographicValue` fields this section needs.
 *
 * `key` is the snapshot taken when the value was written and is what the form
 * keys on; `definition`, `valueType` and `source` are not needed to render an
 * editable form, so they are not selected.
 */
export const DEMOGRAPHIC_VALUE_FIELDS = `
  id
  organization
  user
  membership
  definition
  key
  value
  valueType
  source
  verified
  effectiveFrom
  effectiveTo
`;

/**
 * The organization's *enabled* definitions.
 *
 * `includeDisabled` is always sent as `false`: this is the member-facing form
 * and a disabled definition must not collect an answer. The renderer filters
 * `enabled === false` again so a stale/over-eager payload can never render one.
 */
export const ORGANIZATION_DEMOGRAPHIC_DEFINITIONS = `
  query OrganizationDemographicDefinitions($organizationId: String!, $includeDisabled: Boolean) {
    OrganizationDemographicDefinitions(organizationId: $organizationId, includeDisabled: $includeDisabled) {
      ${DEMOGRAPHIC_DEFINITION_FIELDS}
    }
  }
`;

/**
 * The organization's demographics policy, as a member may read it.
 *
 * `Organization.demographicsPolicy` is defaulted server-side on read ("at most
 * one document per organization; reading it before it has ever been written
 * returns the defaults"), so `selfServiceEnabled` is present even for an
 * organization that never configured anything. `adminOnlyKeys` is deliberately
 * not selected: this section cannot render a per-field read-only state, and the
 * server's own field error already reports a key it refuses.
 */
export const ORGANIZATION_DEMOGRAPHICS_POLICY = `
  query OrganizationDemographicsPolicy($organizationId: String!) {
    CoreOrganization(id: $organizationId) {
      id
      demographicsPolicy {
        selfServiceEnabled
      }
    }
  }
`;

/**
 * The caller's own values for one organization.
 *
 * `membershipId` is optional on the wire and is only supplied when a membership
 * is selected — the server always resolves the subject from the session.
 */
export const MY_DEMOGRAPHICS = `
  query MyDemographics($organizationId: String!, $membershipId: String) {
    MyDemographics(organizationId: $organizationId, membershipId: $membershipId) {
      ${DEMOGRAPHIC_VALUE_FIELDS}
    }
  }
`;

/**
 * The self-service save.
 *
 * `DemographicValueInput` accepts `user`, but this document's variables are
 * built in `buildSavePayload` from `{ key, value }` only: the definition is
 * resolved from its key inside the active organization, so a stale or foreign
 * id can never be written, and the server stays the sole authority on who the
 * value belongs to.
 */
export const MY_SAVE_DEMOGRAPHICS = `
  mutation MySaveDemographics($organizationId: String!, $values: [DemographicValueInput!]!, $membershipId: String) {
    MySaveDemographics(organizationId: $organizationId, values: $values, membershipId: $membershipId) {
      ${DEMOGRAPHIC_VALUE_FIELDS}
    }
  }
`;

/** Operation names, shared by the hook and the tests. */
export const OPERATIONS = {
  organizationDemographicDefinitions: 'OrganizationDemographicDefinitions',
  organizationDemographicsPolicy: 'CoreOrganization',
  myDemographics: 'MyDemographics',
  mySaveDemographics: 'MySaveDemographics',
} as const;
