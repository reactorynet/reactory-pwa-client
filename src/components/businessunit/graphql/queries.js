import gql from "graphql-tag";


export default {
  businessUnitsForOrganization: gql`
  query BusinessUnitsForOrganization($id: String!){
    businessUnitsForOrganization(id: $id) {
      id
      name 
      description
      organization {
        id
        name
        logo
        avatar
      }
      owner {
        id
        firstName
        lastName
        email
        avatar
      }
      members {
        id
        firstName
        lastName
        email
        avatar
      }
    }
  }
`}