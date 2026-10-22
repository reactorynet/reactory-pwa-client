
const base_query = `
    id
    name
    avatarURL
    avatar
    logoURL
    logo
    settings
`;

export const LoggedInOrganisationQuery = `
query CoreActiveOrganisation {
  CoreActiveOrganisation {
    ${base_query}
  }
}
`;

export const CoreOrganizations = `
query CoreOrganizations  {
  CoreOrganizations {
    ${base_query}
  }
}  
`;

export const CoreOrganisationWithId = `
query CoreOrganisationWithId($id: String!) {
  organizationWithId(id: $id) {
    ${base_query}
  }
}
`;

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

export const SetActiveOrganisationMutation = `
mutation CoreSetActiveOrganisation($id: String!) {
  CoreSetActiveOrganisation(id: $id) {
    ${base_query}
  }
}
`;

export const CreateOrganization = `
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input){
      ${base_query}
    }
  }
`;


export default {
  LoggedInOrganisationQuery,
  CoreOrganizations,
  SetActiveOrganisationMutation,
  CoreSetOrganisationInfo: CreateOrganization,
  CoreOrganisationWithId,
  OrganizationTheme,
};