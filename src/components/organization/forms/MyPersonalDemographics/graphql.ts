
const graphql = {
  query: {
    name: 'MoresUserDemographic',
    text: `
    query MoresUserDemographic($userId: String!, $orgId: String!){
      MoresUserDemographic(userId:$userId, organisationId: $orgId){
        message
        gender{
          id
        }
        race{
          id
        }
        position{
          id
        }
        region{
          id
        }
        operationalGroup{
          id
        }
        businessUnit{
          id
        }
        team{
          id
        }
      }
    }
      `,
    variables: {
      'formContext.organisationId': 'orgId',
      'formContext.userId': 'userId',
    },
    resultMap: {
      'userId': 'id',
      'age': 'age',
      'race.id': 'race',
      'gender.id': 'gender',
      'region.id': 'region',
      'position.id': 'position',
      'operationalGroup.id': 'operationalGroup',
      'businessUnit.id': 'businessUnit',
      'team.id': 'team',
    },
    new: true,
    edit: true,
  },
};

export default graphql;
