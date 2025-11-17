
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
  CoreOrganisationWithId
};