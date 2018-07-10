import gql from 'graphql-tag';

const allOrganizations = gql`
  query OrganizationQuery {
      allOrganizations {
        id
        code
        name
        legacyId
        createdAt
        updatedAt
      }
  }
`;

const leadershipBrandsForOrganization = gql`
query brandListForOrganizationQuery($organizationId: String!) {
    brandListForOrganization(organizationId: $organizationId) {
      id      
      title
      description
      scale {
        key
        title 
        entries {          
          rating
          description
        }
      }
      qualities {        
        title
        description
        ordinal
        behaviours {
          title
          description
          ordinal
        }      
      }
    }
}
`;

const createBrandMutation = gql`
  mutation CreateBrandMutation($brandInput: BrandInput!, $organizationId: String!){
    createBrandForOrganization(brandInput: $brandInput, organizationId: $organizationId){
      id
      title
      description      
      scale {
        key
        title
        entries {
          rating
          description
        }
      }      
      qualities {
        ordinal        
        title
        description
        behaviours {
          ordinal
          description
        }      
      }
    } 
  }
`;

const updateBrandMutation = gql`
  mutation UpdateBrandMutation($brandInput: BrandInput!, $organizationId: String!){
    updateBrandForOrganization(brandInput: $brandInput, organizationId: $organizationId){
      id
      title
      scale {
        title
        entries {
          rating
          description
        }
      }
      description      
      qualities {
        ordinal        
        title
        description
        behaviours {
          ordinal
          description
        }      
      }
    } 
  }
`;

const usersForOrganization = gql`
query UserListQuery($id: String!) {
  usersForOrganizationWithId(id: $id) {
      id      
      email
      firstName
      lastName
      avatar
      businessUnit
      lastLogin
    }
}
`;

const createUserMutation = gql`
  mutation CreateUserMutation($input: CreateUserInput!, $organizationId: String!){
    createUser(input: $input, organizationId: $organizationId){
      id
    } 
  }
`;

const updateUserMutation = gql`
  mutation UpdateUserMutation($input: UpdateUserInput!){
    updateUser(input: $input){
      id
    } 
  }
`;

const surveysForOrganization = gql`
  query SurveysForOrganization($organizationId: String!){
    surveysForOrganization(organizationId: $organizationId){
      id      
      leadershipBrand {
        title
        description
        scale {
          title
          entries {
            rating
            description
          }
        }
        qualities {
          title
          behaviours {
            ordinal
            description
          }
        }
      }
      organization {
        name
        logo
      }
      title
      startDate
      endDate
      mode
      calendar {
        entryType
        title
        start
        end
        hasTask
        taskResult
        taskError        
      }
      timeline {
        when
        eventType
        eventDetail
        who {
          firstName
          lastName
          avatar
        }
      }
    }
  }
`

export default {
  queries: {
    Organization: {
      allOrganizations: allOrganizations,
      leadershipBrands: leadershipBrandsForOrganization,      
    },
    Users: {
      usersForOrganization,
      userDetails: null,
      userLogs: null,
      userPeers: null,
    },
    Templates: {
      templateForOrganization: null,
      defaultTemplates: null
    },
    Surveys: {
      surveysForOrganization,
      calendarForSurvey: null      
    },
    Assessments: {
      assessmentsForSurvey: null,
      assessmentsForUser: null
    },
    Notifications: {
      notificationsForUser: null,      
    },
    Tasks: {
      tasksForUser: null
    }
  },
  mutations: {
    Organization: {
      createBrand: createBrandMutation,
      updateBrand: updateBrandMutation
    },
    Users: {
      createUser: createUserMutation,
      updateUser: updateUserMutation,
      createMembership: null,
      removeMembership: null,
      invitePeer: null,
      removePeer: null,
      updatePeer: null,
      confirmPeers: null,
    },  
    Templates: {
      createTemplate: null,
      updateTemplate: null,
    },
    Surveys: {
      createSurvey: null,
      updateSurvey: null,
      launchSurvey: null,
      linkDelegate: null,
      unlinkDelegate: null,
      postReminders: null
    },
    Tasks: {
      createTask: null,
      updateTask: null,
      archive: null
    }
  }
}