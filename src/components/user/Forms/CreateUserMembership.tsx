import { useReactory } from "@reactory/client-core/api";

export const CreateUserMembership = (props) => {

  const reactory = useReactory()



  const {
    React, ReactoryForm,
    ReactRouter, Material, ReactoryMembershipRoles } = reactory.getComponents([
      'react.React',
      'react-router.ReactRouter',
      'core.ReactoryMembershipRoles',
      'core.ReactoryForm',
      'material-ui.Material']);
  const { useState, useEffect } = React;


  const { MaterialStyles, MaterialCore } = Material;

  const { Paper, TextField, FormControl, InputLabel, Input, InputAdornment, IconButton, Icon } = MaterialCore;

  const [error, setError] = useState(null);
  const [passwordUpdated, setIsPasswordUpdated] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    user: reactory.getUser(),
    password: '',
    passwordConfirm: '',
    authToken: localStorage.getItem('auth_token')
  });

  const history = ReactRouter.useHistory();

  const classes = MaterialStyles.makeStyles((theme) => {
    return {
      paper: {
        maxWidth: '900px',
        marginLeft: 'auto',
        marginRight: 'auto',
      },
      form_root: {
        marginTop: '10px',
        padding: '24px',
      },
    };
  })();

  const ReactoryRoleSelector = ({ formData = [], onChange }) => {

    return (
      <>
        <ReactoryMembershipRoles user={props.user} membership={{ id: null, organization: null, businessUnit: null, roles: formData }} onChange={(membership) => {
          debugger
          onChange(membership.roles)
        }} />
      </>
    )
  };


  reactory.componentRegister['core.ReactoryRoleSelector@1.0.0'] = {
    nameSpace: 'core',
    name: 'ReactoryRoleSelector',
    component: ReactoryRoleSelector,
    version: '1.0.0'
  }

  const onSubmit = ({ formData, uiSchema, schema, errors, formContext }) => {

    reactory.log(`onSubmit`, { formData, uiSchema, schema, errors, formContext }, 'error');

    const {
      organization,
      businessUnit,
      roles
    } = formData;

    debugger

    const mutation = `mutation ReactoryCoreCreateUserMembership($user_id:String!, $organization: String, $businessUnit: String, $roles:[String]!) {
      ReactoryCoreCreateUserMembership(user_id: $user_id, organization: $organization, businessUnit: $businessUnit, roles: $roles) {
        id
        organization {
          id
          name
          logo
        }
        businessUnit {
          id
          name
        }
        roles
        created
      }
    }`;

    reactory.graphqlMutation(mutation, { user_id: props.user.id, organization, businessUnit, roles }).then(({ data, errors = [] }) => {

      if (errors.length > 0) {
        reactory.log(`Could not create the new the role`, { errors }, 'errors');
      }

      if (data && data.ReactoryCoreCreateUserMembership) {
        const { id, organization, businessUnit, roles } = data.ReactoryCoreCreateUserMembership;

        if (id) {
          let message = '.';
          if (organization) {
            message = ` on ${organization.name}`;

            if (businessUnit) {
              message = `${message} (${businessUnit.name}).`
            }
          }
          reactory.createNotification(`New membership created for ${props.user.firstName} ${props.user.lastName}${message}`, { type: 'success', showInAppNotification: true });
        }
      }

    }).catch((err) => {
      reactory.log('Graphql Mutation Error Creating New Membership', { err }, 'error');
      reactory.createNotification(`Could not create the membership due to an error`, { type: 'error', showInAppNotification: true });
    });

  }

  const getFormDefinition = () => {

    const base_query = `
    id
    name
    avatarURL
    avatar
    logoURL
    logo,
    businessUnits {
      id
      name
    }
`;


    const MyOrganisationMemberships = `
      query MyOrganisationMemberships  {
        MyOrganisationMemberships {
          ${base_query}
        }
      }  
`;

    return {
      id: 'CreateUserMembership',
      uiFramework: 'material',
      uiSupport: ['material'],
      uiResources: [],
      title: 'Create User Membership',
      tags: ['user management', 'create user role', 'permissions'],
      registerAsComponent: true,
      name: 'CreateUserMembership',
      nameSpace: 'forms',
      version: '1.0.0',
      backButton: true,
      helpTopics: ['create-new-user-role'],
      roles: ['ADMIN'],
      widgetMap: [{
        componentFqn: 'core.ReactoryRoleSelector@1.0.0',
        widget: 'ReactoryRoleSelector'
      }],
      schema: {
        title: 'Create New Membership',
        description: '',
        type: 'object',
        required: [
          'roles',
        ],
        properties: {
          organization: {
            type: 'string',
            title: 'Organization',
          },
          businessUnit: {
            type: 'string',
            title: 'Business Unit'
          },
          roles: {
            type: 'array',
            items: {
              type: 'string',
              title: 'Role'
            }
          },
        },
      },
      uiSchema: {
        organization: {
          'ui:widget': 'SelectWithDataWidget',
          'ui:options': {
            multiSelect: false,
            query: MyOrganisationMemberships,
            resultItem: 'MyOrganisationMemberships',
            resultsMap: {
              'MyOrganisationMemberships.[].id': ['[].key', '[].value'],
              'MyOrganisationMemberships.[].name': '[].label',
            },
          },
        },
        businessUnit: {
          'ui:widget': 'SelectWithDataWidget',
          'ui:options': {
            multiSelect: false,
            query: `
            query CoreOrganization($id: String!) {
              CoreOrganization(id: $id) {
                id
                businessUnits {
                  id
                  name
                }
              }
            }`,
            propertyMap: {
              'formContext.formData.organization': 'id'
            },
            resultItem: 'CoreOrganization',
            resultsMap: {
              'CoreOrganization.businessUnits[].id': ['[].key', '[].value'],
              'CoreOrganization.businessUnits[].name': '[].label'
            },
          },
        },
        roles: {
          'ui:widget': 'ReactoryRoleSelector',
        }
      },
      defaultFormValue: {
        roles: ['USER']
      }
    };

  }

  const onValidate = (formData, errors, formContext, method) => {
    const { password, confirmPassword } = formData;

    // if (password !== confirmPassword) {
    //   errors.confirmPassword.addError("Confirm password must match the password");

    //   if (method === "submit") {
    //     reactory.createNotification("The passwords do not match, please check your input",
    //       { type: "warning", canDismiss: true, timeOut: 3500, showInAppNotification: false });
    //   }
    // }

    return errors;
  }

  return (
    <Paper elevation={1} className={classes.paper}>
      {/* YOUR COMPONENTS HERE */}
      <ReactoryForm
        className={classes.form_root}
        formDef={getFormDefinition()}
        validate={onValidate}
        liveValidate={true}
        onSubmit={onSubmit}
        formData={formData} />
    </Paper>
  )

};

export default {
  nameSpace: 'core',
  name: 'ReactoryCreateUserMembership',
  component: CreateUserMembership,
  version: '1.0.0',
}