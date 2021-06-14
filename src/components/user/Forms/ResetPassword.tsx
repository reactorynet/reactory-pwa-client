import { useReactory } from "@reactory/client-core/api";

export const PasswordResetForm = (props) => {


  const reactory = useReactory()

  const {
    React, ReactoryForm,
    ReactRouter, Material } = reactory.getComponents([
      'react.React', 'react-router.ReactRouter', 'core.ReactoryForm', 'material-ui.Material']);
  const { useState, useEffect } = React;

  const { MaterialStyles, MaterialCore } = Material;

  const { Paper, TextField, FormControl, InputLabel, Input, InputAdornment, IconButton, Icon } = MaterialCore;

  const [error, setError] = useState(null);
  const [passwordUpdated, setIsPasswordUpdated] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    user: reactory.getUser(),
    password: '',
    passwordConfirm: '' || " ",
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

  const ReactoryPasswordField = ({ formData, onChange }) => {

    const [values, setValues] = React.useState({
      showPassword: false,
    });

    const handleChange = (prop) => (event) => {
      // setValues({ ...values, [prop]: event.target.value });
      onChange(event.target.value)
    };

    const handleClickShowPassword = () => {
      setValues({ ...values, showPassword: !values.showPassword });
    };

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
    };

    return (
      <FormControl>
        <InputLabel htmlFor="standard-adornment-password">Password</InputLabel>
        <Input
          id="standard-adornment-password"
          type={values.showPassword ? 'text' : 'password'}
          value={formData}
          onChange={handleChange('password')}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
              >
                <Icon>{values.showPassword ? "visibility" : "visibility_off"}</Icon>
              </IconButton>
            </InputAdornment>
          }
        />
      </FormControl>
    )


  };


  reactory.componentRegister['core.ReactoryPasswordField@1.0.0'] = {
    nameSpace: 'core',
    name: 'ReactoryPasswordField',
    component: ReactoryPasswordField,
    version: '1.0.0'
  }

  const onSubmit = ({ formData, uiSchema, schema, errors, formContext }) => {
    debugger
    reactory.log(`onSubmit`, { formData, uiSchema, schema, errors, formContext }, 'error');

    const {
      password,
      confirmPassword
    } = formData;

    if (password !== confirmPassword) {
      reactory.createNotification("The passwords do not match, please check your input",
        { type: "warning", canDismiss: true, timeOut: 3500, showInAppNotification: true });

      return;
    }

    reactory.resetPassword({
      password: password,
      confirmPassword: confirmPassword
    }).then((forgotResult) => {

      debugger;

      setIsPasswordUpdated(true);
      reactory.createNotification("Your password has been updated, you will be redirected momentarily",
        { type: "success", canDismiss: true, timeOut: 3500, showInAppNotification: true });


      const last_route = localStorage.getItem('$reactory.last.attempted.route$');

      setTimeout(() => {
        history.push(last_route || '/');
      }, 3501);

    }).catch((error) => {
      reactory.log(`Error updating the password ${error.message}`, { error }, 'error');
    });
  }

  const getFormDefinition = () => {


    return {
      id: 'ResetPasswordForm',
      uiFramework: 'material',
      uiSupport: ['material', 'bootstrap'],
      uiResources: [],
      title: 'Password Reset',
      tags: ['forgot password reset', 'user account', 'reset passwords'],
      registerAsComponent: true,
      name: 'ResetPasswordForm',
      nameSpace: 'forms',
      version: '1.0.0',
      backButton: true,
      helpTopics: ['password-reset'],
      widgetMap: [{
        componentFqn: 'core.ReactoryPasswordField@1.0.0',
        widget: 'ReactoryPasswordField'
      }],
      schema: {
        title: '',
        description: 'Provide a new password and confirm it in order to change your password',
        type: 'object',
        required: [
          'user',
          'authToken',
          'password',
          'confirmPassword',
        ],
        properties: {
          user: {
            type: 'object',
            title: 'User',
            properties: {
              firstName: {
                type: 'string',
                title: 'First name',
              },
              lastName: {
                type: 'string',
                title: 'Last name',
              },
              email: {
                type: 'string',
                title: 'Email Address',
                readOnly: true,
              },
              avatar: {
                type: 'string',
                title: 'Avatar',
              },
            },
          },
          authToken: {
            type: 'string',
            title: 'Token',
            readOnly: true,
          },
          password: {
            type: 'string',
            title: 'Password',
            format: 'password',
          },
          confirmPassword: {
            type: 'string',
            title: 'Confirm Password',
            format: 'password',
          },
        },
      },
      uiSchema: {
        user: {
          'ui:widget': 'UserListItemWidget',
        },
        authToken: {
          'ui:widget': 'HiddenWidget',
        },
        password: {
          'ui:help': 'Ensure your password is at least 8 characters long.',
          'ui:options': {
            showLabel: false,
          },
          'ui:widget': 'ReactoryPasswordField',
        },
        confirmPassword: {
          'ui:options': {
            showLabel: false,
          },
          'ui:widget': 'ReactoryPasswordField',
        },
      },
    };

  }

  const onValidate = (formData, errors, formContext, method) => {
    const { password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      errors.confirmPassword.addError("Confirm password must match the password");

      if (method === "submit") {
        reactory.createNotification("The passwords do not match, please check your input",
          { type: "warning", canDismiss: true, timeOut: 3500, showInAppNotification: false });
      }
    }




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
  name: 'ResetPassword',
  component: PasswordResetForm,
  version: '1.0.0',
}