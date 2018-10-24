import gql from 'graphql-tag';

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
      avatar
      businessUnit
      lastLogin
      peers {
        organization {
          name
          logo
        }
        user {
          firstName
          lastName
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
		query status {
		apiStatus {
			applicationName
			applicationAvatar
			when
			status
			firstName
			lastName
			avatar
			roles
			id
			theme
			themeOptions
			routes {
				id
				path
				public
				roles
        exact
				componentFqn
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
				}
				
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
			title
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
` 

const surveysForUser = gql`
query UserSurveys($id: String) {
  userSurveys(id: $id) {
    id
    updatedAt
		createdAt
    complete
    selfAssessment
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
			title
			startDate
			endDate
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
		ratings {
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
            title
            status
            percentComplete
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
        createSurvey(surveyData: $surveyData){
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
      unlinkDelegate:  gql`
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
    }
  }
}