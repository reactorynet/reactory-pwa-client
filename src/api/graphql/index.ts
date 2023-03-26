import { gql } from '@apollo/client';

const allScales = gql`
  query ScalesQuery {
    allScales {
      id
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
        avatar
        logo
        legacyId
        createdAt
        updatedAt
      }
  }
`;

const leadershipBrandsForOrganization = gql`
query brandListForOrganizationQuery($organizationId: String!) {
    MoresLeadershipBrands(organizationId: $organizationId) {
      id
      title
      description
      scale {
        id
        key
        title
        entries {
          rating
          description
        }
      }
      qualities {
        id
        title
        description
        ordinal
        behaviours {
          id
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
    MoreLeadershipBrandCreate(brandInput: $brandInput, organizationId: $organizationId){
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
    MoreLeadershipBrandUpdate(brandInput: $brandInput, organizationId: $organizationId){
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
query UserListQuery($id: String!, $searchString: String, $paging: PagingRequest) {
  CoreUsersForOrganization(id: $id, searchString: $searchString, paging: $paging) {
      paging {
        hasNext
        total
        page
      }
      users {
        id
        email
        firstName
        lastName
        avatar
        lastLogin
      }      
    }
}
`;

const createUserMutation = gql`
  mutation CreateUserMutation($input: CreateUserInput!, $organizationId: String!){
    createUser(input: $input, organizationId: $organizationId){
      id
      firstName
      lastName
      avatar
      lastLogin
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
      mobileNumber
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
    surveyDetail(surveyId: $surveyId){
      id
			status
      leadershipBrand {
        id
        title
        description
        scale {
          id
          title
          entries {
            rating
            description
          }
        }
        qualities {
          id
          title
          behaviours {
            ordinal
            description
          }
        }
      }
      organization {
        id
        name
        logo
      }
      title
      startDate
      endDate
      mode
			delegates {
				delegate {
					id
					firstName
					lastName
					email
					avatar
				}
				assessments {
					assessor {
						id
						firstName
						lastName
            email
						avatar
					}
				}
				complete
				launched
				removed
			}
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
      organization {
        id
        name
        logo
      }
      leadershipBrand {
        id
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

const surveysList = gql`
  query SurveysList{
    surveysList{
      id
      organization {
        id
        name
        logo
      }
      leadershipBrand {
        id
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
      mobileNumber
      avatar
      lastLogin
      deleted
      memberships {
        id
        client {
          id
          name
        }
        organization {
          id
          name
        }
        businessUnit {
          id
          name
        }
        created
        lastLogin
        roles
        enabled
      }
      peers {
        organization {
          id
          name
          logo
        }
        user {
          id
          firstName
          lastName
          avatar
          email
        }
        peers {
          user {
            id
            firstName
            lastName
            email
            avatar
          }
          relationship
          isInternal
        }
        allowEdit
      }
    }
  }
`;

const apiStatus = gql`
  query status($theme: String, $mode: String) {
      apiStatus(theme: $theme, mode: $mode) {
      applicationName
      applicationAvatar
      applicationRoles
      when
      status
      firstName
      lastName
      email
      avatar
      roles
      organization {
        id
        name
        logo
      }
      businessUnit {
        id
        name
        avatar
      }
      memberships {
        id
        client {
          id
          name
        }
        organization {
          id
          name
          logo
        }
        businessUnit {
          id
          name
          avatar
        }
        roles
      }
      id
      theme
      activeTheme(mode: $mode) {
        id
        type
        name
        nameSpace
        version
        description
        modes {
          id
          name
          description
          icon
        }
        options
        assets {
          id
          name
          assetType
          url
          loader
          options
          data
        }        
      }
      themes {
        id
        type
        name
        nameSpace
        version
        description        
      }
      server {
        id
        version,
        started,
        clients {
          id
          clientKey
          name
          siteUrl
        }
      }
      colorSchemes
      routes {
        id
        path
        public
        roles
        componentFqn
        exact
        redirect
        args {
          key
          value
        }
        component {
          nameSpace
          name
          version
          args {
            key
            value
          }
          title
          description
          roles
        }
      }
      menus {
        id
        key
        name
        target
        roles
        entries {
          id
          ordinal
          title
          link
          external
          icon
          roles
          items {
            id
            ordinal
            title
            link
            external
            icon
            roles
          }
        }

      }
      messages {
        id
        title
        text
        data
        via
        icon
        image
        requireInteraction
        silent
        timestamp
        actions {
          id
          action
          icon
          componentFqn
          componentProps
          modal
          modalSize
          priority
        }
      }
      navigationComponents {
				componentFqn
				componentProps
				componentPropertyMap
				componentKey
				componentContext
        contextType
			}
    }
  }

`;

const assessmentWithId = gql`
query assesmentWithId($id: String) {
  assessmentWithId(id: $id) {
    id
    updatedAt
		createdAt
    complete
    selfAssessment
    overdue
    team
		assessor {
			id
			username
			firstName
			lastName
			avatar
		}
		delegate {
			id
			username
			firstName
			lastName
			avatar
		}
		survey {
      id
			title
			startDate
			endDate
      surveyType
      status
      organization {
        id
        name
        logo
      }
      delegateTeam {
        id
        name
      }
      assessorTeams {
        id
        name
      }
      delegates {
        id
        delegate {
          id
          email
          firstName
          lastName
          avatar
        }
        team
      }
			leadershipBrand {
        id
				title
				description
				scale {
          id
					title
          min
          max
					entries {
						rating
						description
					}
				}
				qualities {
          id
					title
					description
					ordinal
					behaviours {
            id
						title
						description
            assessorTitle
            assessorDescription
            delegateTitle
            delegateDescription                        
						ordinal
					}
				}
			}
		}
		ratings {
      id
			quality {
				id
				title
				ordinal
			}
			behaviour {
				id
				title
				ordinal
			}
			rating
			comment
      custom
      updatedAt
		}
	}
}
`

const surveysForUser = gql`
query MoresUserSurvey($id: String) {
  MoresUserSurvey(id: $id) {
    id
    updatedAt
		createdAt
    complete
    selfAssessment
    overdue
		assessor {
			id
			email
			firstName
			lastName
			avatar
		}
		delegate {
			id
			email
			firstName
			lastName
			avatar
		}
		survey {
      id
			title
			startDate
			endDate
      surveyType
      assessorTeams {
        id
        name
      }
      delegateTeam {
        id
        name
      }
			leadershipBrand {
        id
				title
				description
				scale {
          id
					title
					entries {
						rating
						description
					}
				}
				qualities {
          id
					title
					description
					ordinal
					behaviours {
            id
						title
						description
						ordinal
					}
				}
			}
		}
		ratings {
      id
			quality {
				id
				title
				ordinal
			}
			behaviour {
				id
				title
				ordinal
			}
			rating
			comment
		}
	}
}
`;

const userInbox = gql`
  query UserInboxQuery($id: String, $sort: String, $via: String){
    userInbox(id: $id, sort: $sort, via: $via){
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
  }`;

const reportDetailForUser = gql`
query ReportDetailForUser($userId: String, $surveyId: String){
  reportDetailForUser(userId: $userId, surveyId: $surveyId){
    overall
		status
		survey {
			id
			title
			status
			startDate
			endDate
      surveyType,
      organization {
        id
        name
        logo
      }
			leadershipBrand {
				title
				description
        qualities {
					id
					title
					description
					ordinal
					behaviours {
						id
						title
						description
						ordinal
					}
				}
				scale {
					title
					min
					max
					entries {
						rating
						description
					}
				}
			}
		}
		user {
			id
			firstName
			lastName
			avatar
			email
		}
		assessments {
      assessor {
				id
				firstName
				lastName
				email
			}
			assessmentType
			ratings {
				quality {
					id
					title
					description
					ordinal
				}
				behaviour {
					title
					description
					ordinal
				}
				rating
				comment
			}

		}
	}
}`;

const reportsForUser = gql`
query UserReports($id: String) {
  userReports(id: $id) {
		overall
		status
		survey {
			id
			title
			status
			startDate
			endDate
			leadershipBrand {
				title
				description
				scale {
					title
					min
					max
					entries {
						rating
						description
					}
				}
			}
		}
		user {
			id
			firstName
			lastName
			avatar
			email
		}
		assessments {
			assessmentType
			ratings {
				quality {
					id
					title
					description
					ordinal
				}
				behaviour {
					title
					description
					ordinal
				}
				rating
				comment
			}

		}
	}
}`;

const graphql = {
  queries: {
    Organization: {
      allOrganizations: allOrganizations,
      leadershipBrands: leadershipBrandsForOrganization,
      organizationWithId: require('./organization/organizationWithId')
    },
    Users: {
      usersForOrganization,
      userProfile,
      userInbox,
      userLogs: null,
      userPeers: null,
      searchUser: gql`
        query SearchUser($searchString: String!, $sort: String){
          searchUser(searchString: $searchString, sort: $sort){
            id
            email
            firstName
            lastName
            avatar
          }
        }
      `
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
      surveysList,
      calendarForSurvey: null,
      reportsForUser,
      reportDetailForUser
    },
    Assessments: {
      assessmentsForSurvey: null,
      assessmentsForUser: null,
      assessmentWithId: assessmentWithId
    },
    Notifications: {
      notificationsForUser: null,
    },
    Tasks: {
      userTasks: gql`
        query UserTasks($id: String, $status: String){
          userTasks(id: $id, status: $status){
            id
            title
            status
            percentComplete
            comments {
              id
              text
              who {
                id
                firstName
                lastName
                avatar
              }
              when
            }
            createdAt
            updatedAt
          }
        }
      `,
      taskDetail: gql`
        query taskDetail($id: String){
          taskDetail(id: $id){
            id
            project {
              id
              title
              description
            }

            title
            status
            percentComplete
            startDate
            dueDate
            shortCodeId
            user {
              id
              firstName
              lastName
            }
            comments {
              id
              text
              who {
                id
                firstName
                lastName
                avatar
              }
              when
            }
            createdAt
            updatedAt
          }
        }
      `
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
      setActiveOrganization: gql`
        mutation SetActiveOrganization($organizationId: String) {
          setActiveOrganization(organizationId: $organizationId){
            id,
            name
            logo
          }
        }
      `,
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
      createSurvey: gql`
      mutation CreateSurveyMutation($id: String!, $surveyData: SurveyInput!){
        createSurvey(id: $id, surveyData: $surveyData){
          id
        }
      }
      `,
      updateSurvey: gql`
      mutation UpdateSurveyMutation($id: String!, $surveyData: SurveyInput!){
        updateSurvey(id: $id, surveyData: $surveyData){
          id
          errors
          updated
        }
      }
    `,
      launchSurvey: gql`
        mutation LaunchSurvey($id: String!, $options: SurveyLaunchOptions!){
          launchSurvey(id: $id, options: $options){
            id
            errors
          }
      }
      `,
      linkDelegate: gql`
        mutation AddDelegateToSurvey($surveyId: String!, $delegateId: String){
          addDelegateToSurvey(surveyId: $surveyId, delegateId: $delegateId){
            id
            errors
            user {
              id
              firstName
            }
          }
        }
      `,
      unlinkDelegate: gql`
      mutation removeDelegateFromSurvey($surveyId: String!, $delegateId: String){
        removeDelegateFromSurvey(surveyId: $surveyId, delegateId: $delegateId){
          id
          errors
          user {
            id
            firstName
          }
        }
      }
    `,
      postReminders: gql`
        mutation postReminders($surveyId: String, $options: ReminderOptions){
          postReminders(surveyId: $surveyId, options: $options){
            id
            errors
          }
        }
      `,
      deleteSurvey: gql`
        mutation deleteSurvey($id: String!){
          deleteSurvey(id: $id){
            id
            errors
            updated
          }
        }
      `
    },
    Tasks: {
      createTask: gql`
        mutation createTask($id: String, $taskInput: TaskInput){
          createTask(id: $id, taskInput: $taskInput){
            id
            title
            description
            percentComplete
          }
        }
      `,
      updateTask: null,
      archive: null
    },
    System: {
      startWorkflow: `mutation StartWorkflow($name: String, $data: Any){
        startWorkflow(name: $name, data: $data) {
          id
        }
      }`
    },
  }
};

export default graphql;
