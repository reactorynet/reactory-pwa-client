/**
 * GraphQL operations for the organization *theme* pipeline.
 *
 * ORG-041a: this file previously also carried the operations used by the
 * duplicated organization UI (`LoggedInOrganisationQuery`, `CoreOrganizations`,
 * `CoreOrganisationWithId`, `SetActiveOrganisationMutation`,
 * `CreateOrganization`). That UI was removed because the canonical
 * implementation lives in the `organization-management/` plugin. Only
 * `OrganizationTheme` remains, because `theme/OrganizationThemeService.ts`
 * (ORG-014, live) consumes it.
 *
 * Organization CRUD/list operations now belong to the plugin — do not re-add
 * them here.
 */

/**
 * Reads the branding fields needed to resolve a runtime organization theme
 * (ORG-014). The server exposes `theme` as the active theme *name* and
 * `themes` as the same ApplicationTheme shape a ReactoryClient owns, so the
 * client can resolve without a second round trip per theme.
 */
export const OrganizationTheme = `
query CoreOrganization($id: String!) {
  CoreOrganization(id: $id) {
    id
    name
    theme
    themeMode
    themes {
      name
      nameSpace
      version
      defaultThemeMode
      modes {
        id
        mode
        name
        options
      }
      assets {
        id
        name
        assetType
        url
        loader
        options
        data
      }
      content
      options
    }
  }
}
`;

export default {
  OrganizationTheme,
};
