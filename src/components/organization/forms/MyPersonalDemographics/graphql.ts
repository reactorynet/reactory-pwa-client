
const graphql = {
  query: {
    name: 'MoresUserDemographic',
    text: `
    query MoresUserDemographic($userId: String!, $orgId: String!){
      MoresUserDemographic(userId:$userId, organisationId: $orgId){
        gender{
          id
          key
          title
        }
        dateOfBirth
        age
        ageGroup {
          id
          title
          key
        }
        race{
          id
          key
          title
        }
        position{
          id
          key
          title
        }
        region{
          id
          key
          title
        }
        operationalGroup{
          id
          key
          title
        }
        businessUnit{
          id
          name
        }
        team {
          id
          name
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
      'dateOfBirth': 'dateOfBirth',
      'ageGroup.title': 'ageGroup',
      'race.id': 'race',
      'gender.id': 'gender',
      'region.id': 'region',
      'position.id': 'position',
      'operationalGroup.id': 'operationalGroup',
      'businessUnit.id': 'businessUnit',
      'team.id': 'teams',
    },
    new: true,
    edit: true,
  },
};

export default graphql;
