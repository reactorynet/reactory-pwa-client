import gql from 'graphql-tag';

const allScales = gql`
  query ScalesQuery {
    allScales {
      title
      key 
      entries {
        description
        rating
      }
    }
  }
`
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
  mutation UpdateUserMutation($id: String!, $profileData: UpdateUserInput!){
    updateUser(id: $id, profileData: $profileData){
      id
      firstName
      lastName
      email
      avatar
    } 
  }
`;

const setPassword = gql`
  mutation SetPasswordMutation($input: UpdatePasswordInput!){
    setPassword(input: $input) {
      id
      firstName
      lastName
      email
      avatar
    }
  }
`;

const surveyDetail = gql`
  query SurveyDetail($surveyId: String!){
    surveysDetail(surveyId: $surveyId){
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

const surveysForOrganization = gql`
  query SurveysForOrganization($organizationId: String!){
    surveysForOrganization(organizationId: $organizationId){
      id      
      leadershipBrand {
        title
        description                
      }      
      title
      startDate
      endDate
      mode            
    }
  }
`;

const userProfile = gql`
  query userProfile($profileId: String!){
    userWithId(id: $profileId){
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

const apiStatus = gql`
query status {
  apiStatus {
		when
		status
    firstName
    lastName
    email
    id
    avatar
	}
}
`;

const surveysForUser = gql`
  
`

const userInbox = gql`
  query UserInboxQuery($id: String, $sort: String){
    userInbox(id: $id, sort: $sort){
      id
      sendAfter
      sentAt
      sent
      error
      failures
      from
      message
      subject
      to
      archived
      createdAt
      format
      user {
        id
        firstName
        lastName
        email
      }      
      survey {
        id
        title
        startDate
        endDate
      }
    }
  }
`;

export default {
  queries: {
    Organization: {
      allOrganizations: allOrganizations,
      leadershipBrands: leadershipBrandsForOrganization,      
    },
    Users: {
      usersForOrganization,
      userProfile,
      userInbox,      
      userLogs: null,
      userPeers: null,
    },
    Templates: {
      templateForOrganization: null,
      defaultTemplates: null
    },
    Surveys: {
      allScales,
      surveysForOrganization,
      surveyDetail,
      surveysForUser,
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
    },
    System: {
      apiStatus
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
      setPassword,
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