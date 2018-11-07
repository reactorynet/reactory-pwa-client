import gql from "graphql-tag";

export default {
  createBusinessUnit: gql`
  mutation CreateBusinessUnit($input: BusinessUnitInput!){
    createBusinessUnit(input: $input) {
      id
      name
      avatar
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
  }`,
  updateBusinessUnit: gql`
  mutation UpdateBusinessUnit($id: String!, $input: BusinessUnitInput!){
    updateBusinessUnit(id: $id, input: $input){
      id
      name
      avatar
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
  `,
  addMemberToBusinessUnit: gql`
  mutation AddMemberToBusinessUnit($id: String!, $memberId: String!) {
    addMemberToBusinessUnit(id: $id, memberId: $memberId)
  }  
  `,
  removemMemberFromBusinessUnit: gql`
    mutation RemoveMemberFromBusinessUnit($id: String, $memberId: String!) {
      removeMemberFromBusinessUnit(id: $id, memberId: $memberId)
    }
  `
}