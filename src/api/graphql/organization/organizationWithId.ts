export default `
query OrganizationWithIdQuery($id: String!){
  organizationWithId(id: $id){
    code
    name
    logo
    avatar
  }
}
`;
