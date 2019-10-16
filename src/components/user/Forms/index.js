import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import classnames from 'classnames';
import gql from 'graphql-tag';
import { compose } from 'redux';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import {
  Avatar,
  Chip,
  Container,
  Button,
  Fab,
  FormControl,
  List,
  ListItem,
  ListItemText,
  InputLabel,
  Input,
  Icon,
  InputAdornment,
  IconButton,
  Grid,
  Paper,
  TextField,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Tooltip,
  Typography,
} from '@material-ui/core';

import {
  Visibility,
  VisibilityOff,
  Search as SearchIcon
} from '@material-ui/icons'
import classNames from 'classnames';
import AddCircleIcon from '@material-ui/icons/AddCircle'
import DetailIcon from '@material-ui/icons/Details'
import { withTheme, withStyles } from '@material-ui/core/styles';
import { isArray, isNil } from 'lodash';
import moment from 'moment';
import { ReactoryFormComponent } from '../../reactory/ReactoryFormComponent';
import { TableFooter } from '@material-ui/core/Table';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';
import DefaultAvatar from '../../../assets/images/profile/default.png';
import Profile from './../Profile';
import Message from '../../message'
import { omitDeep, getAvatar, CenteredContainer } from '../../util';
import lodash from 'lodash';
import styles from '../../shared/styles'




class Forgot extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      formData: { email: '' },
      mailSent: false,
      message: '',
      hasError: false,
      displayModal: false,
      email: '',
    }

    this.onSubmit = this.onSubmit.bind(this);
    this.goBack = this.goBack.bind(this);
    this.emailKeyPressHandler = this.emailKeyPressHandler.bind(this);
    this.componentRefs = props.api.getComponents([
      'core.Loading@1.0.0',
      'core.Layout@1.0.0',      
      'core.BasicModal@1.0.0',      
    ]);
  }

  onSubmit() {
    const that = this;    this.props.api.forgot({ email: this.state.email }).then((forgotResult) => {
      that.setState({ mailSent: true })
    }).catch((error) => {
      that.setState({ hasError: true, message: 'Could not send an email. If this problem persists please contact our helpdesk.' })
    })
  }
  
  goBack() {
    this.props.history.goBack();
  }

  emailKeyPressHandler(keyPressEvent){
    if(keyPressEvent.charCode === 13){
      this.onSubmit();
    }
  }

  render() {

    const { emailKeyPressHandler } = this;
    const {
      BasicModal,      
    } = this.componentRefs;
    const { magicLink } = this.props;

    if (this.state.mailSent) {
      return (
      <BasicModal open={true} onClose={this.goBack} title="Email Sent">
        <Typography variant="heading">
          { magicLink === false 
            ? 'An email has been sent with instructions to reset your password. Please allow a few minutes for delivery' 
            : 'An email has been sent with a magic link to login. Please allow a few minutes for delivery' } 
        </Typography>
      </BasicModal>)
    }
    if (this.state.hasError) {
      return (<div><Typography variant="heading">{this.state.message}</Typography></div>);
    }

    const beforeComponent = (<div className={this.props.classes.logo} style={{ marginBottom: '16px', marginTop: '20%' }}></div>)
    const updateEmailAddress = e => this.setState({ email: e.target.value })
    return (
      <CenteredContainer classNames={this.props.classes.root} style={{ maxWidth: 600, margin: 'auto'  }}>
        {beforeComponent}
        <Paper style={{padding: '16px'}}>
          <Grid container>            
            <Grid item xs={12}>
              <TextField 
                onChange={updateEmailAddress} 
                onKeyPress={emailKeyPressHandler}
                value={this.state.email} 
                label="Email"  
                fullWidth={true} 
                helperText={ magicLink === false ? 
                  "Enter your email and click the send button below to start the reset process for your account." :
                  "Enter your email address and we will send you link to log in with."
                }
                style={{marginBottom: '50px'}}
                inputProps={{ 
                  inputProps:{
                    onKeyPress: emailKeyPressHandler
                  }
                 }}
                />
            </Grid>
            <Grid item xs={12}>
              <Button type="button" onClick={this.goBack} variant="flat"><Icon>keyboard_arrow_left</Icon>&nbsp;BACK</Button>
              <Tooltip title={ magicLink === false ? "Click to send a reset email" : "Click to send a magic link to login with" }>
                <Fab onClick={this.onSubmit} variant="rounded" color="primary" ><Icon>send</Icon></Fab>
              </Tooltip>                    
            </Grid>
          </Grid>
          
        </Paper>
      </CenteredContainer>
    )
  }
}

Forgot.propTypes = {
  api: PropTypes.instanceOf(ReactoryApi),
  magicLink: PropTypes.bool.isRequired
};

Forgot.defaultProps = {
  magicLink: false,
};

Forgot.styles = theme => ({
  ...styles(theme)
});

export const ForgotForm = compose(
  withStyles(Forgot.styles),
  withTheme,
  withApi,
  withRouter)(Forgot);



class ResetPassword extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      formData: { 
        user: props.api.getUser(),
        password: '', 
        passwordConfirm: '', 
        authToken: localStorage.getItem('auth_token') 
      },
      message: '',
      hasError: false,
      passwordUpdated: false,

    }
    this.onSubmit = this.onSubmit.bind(this);
    this.componentDefs = props.api.getComponents([
      'forms.ResetPasswordForm', 
      'core.BasicModal',
    ]);
  }

  componentDidCatch(err){
    this.setState({ errored: true, error: err })
  }

  onSubmit(form) {
    const that = this;
    //console.log('Submiting Password Change', form);
    let errors = [];
        
    this.props.api.resetPassword({
      email: form.formData.user.email,
      authToken: form.formData.authToken,
      password: form.formData.password,
      confirmPassword: form.formData.confirmPassword
    }).then((forgotResult) => {
      //console.log('Forgot password has been triggered', forgotResult);
      that.setState({ passwordUpdated: true, message: 'Your password has been updated, you will be redirected to the dashboard momentarily' }, ()=>{
        setTimeout(()=>{
          that.props.history.push('/')
        }, 1500)
      });

    }).catch((error) => {
      console.error('Error sending forgot password email to user', error);
      //that.setState({ hasError: true, message: 'Could not send an email. If this problem persists please contact our helpdesk.' })
      that.setState({ passwordUpdated: false, message: 'Your could not be updated, please try again. If this problem persists please contact the administrator', hasError: true });
    });
  }

  render() {
    const { ResetPasswordForm, BasicModal } = this.componentDefs;

    if(this.state.errored === true) {
      return <p>Error {this.state.error.message}</p>
    }

    if (this.state.passwordUpdated === true) {      
      return (<BasicModal open={true}><Typography variant="body1" >{this.state.message}</Typography></BasicModal>)
    }
    if (this.state.hasError === true) {
      const clearError = e => this.setState({ hasError: false, message: '' });
      return (<BasicModal open={true}><Typography variant="body1" onClose={clearError}>{this.state.message}</Typography></BasicModal>);
    }    

    const beforeComponent = (<div className={this.props.classes.logo} style={{ marginBottom: '16px', marginTop: '20%' }}></div>)

    return (
      <CenteredContainer className={this.props.classes.root} style={{ maxWidth: 600, margin: 'auto' }}>
        <ResetPasswordForm before={beforeComponent} onSubmit={this.onSubmit} formData={this.state.formData}>
          <Button type="submit" variant="raised" color="primary"><Icon>save</Icon>&nbsp;UPDATE PASSWORD</Button>
        </ResetPasswordForm>
      </CenteredContainer>
    )
  }
}

ResetPassword.propTypes = {
  api: PropTypes.instanceOf(ReactoryApi)
}

ResetPassword.styles = theme => ({
  ...styles(theme)
});

class SearchUser extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      formData: { searchString: '' },
      message: '',
      hasError: false,      
    }    
  }

  

  onChange(formData) {
    //console.log('formData changed', formData)
    this.setState({ formData });
  }
  

  render() {
        

    return (      
      <CenteredContainer classNames={this.props.classes.root} style={{ maxWidth: 600, margin: 'auto' }}>
        <ReactoryFormComponent formId="password-reset" uiFramework="material" onSubmit={this.props.onSubmit} formData={this.state.formData}>
          <Button type="submit" variant="raised" color="primary"><Icon>search</Icon></Button>
        </ReactoryFormComponent>
      </CenteredContainer>
    )
  }
}


class RememberCredentials extends Component {

  static propTypes = {
    username: PropTypes.string,
    password: PropTypes.string,
    provider: PropTypes.string,
    showLogin: PropTypes.bool,
    message: PropTypes.string,
    title: PropTypes.string,
    onOk: PropTypes.func,    
    api: PropTypes.instanceOf(ReactoryApi),    
  }

  static defaultProps = {
    onComplete: ()=> {

    },    
    showLogin: false,  
    title: 'We need some security information',
    loginHandler: () => {
      return new Promise(( resolve, reject ) => { 
        reject('No login handler available');
      });
    }
  }

  static styles = theme => ({ })

  constructor(props, context){
    super(props, context);  
    this.componentDefs = props.api.getComponents([
      'core.Loading',
      'core.Logo',      
      'forms.LoginForm'
    ]);

    this.state = {
      saving: false,
      username: props.username,
      password: props.password
    }

    this.saveCredentials = this.saveCredentials.bind(this);
    this.cancelSave = this.cancelSave.bind(this);
  }

  componentDidMount(){
    //make sure we have the provider localsetting store
    localStorage.setItem(`reactory.authentications.${this.props.provider}.prompt.remember`, 'not-set');    
    localStorage.setItem(`reactory.authentications.${this.props.provider}.prompt.last`, new Date().valueOf());
  }

  componentDidCatch(unhandled) {
    this.props.api.log('An unhandled error occured in RememberCredentials Form', unhandled, 'warning')
  }

  saveCredentials(){
    const {  provider, onComplete, api } = this.props;    
    const { username, password, loginResults } = this.state;

    const self = this;
    this.setState({ saving: true, busy: true }, ()=>{      
      api.saveUserLoginCredentials(provider, { username, password }).then((saved) => {        
        self.setState({ saving: false, busy: false, complete: true, message: 'Your credentials has been stored and kept safe' }, ()=>{
          onComplete(saved.data.addUserCredentials === true);
        });
      }).catch((saveError) => {
        const errorMessage = saveError.message;
        self.setState({ saving: false, busy: false, complete: true, message: `We could not save your credentials due to a system error. ${errorMessage}` }, ()=>{          
          onComplete(false, errorMessage);
        });      
      });
    })    
  }

  cancelSave(){    
    if(this.props.onClose) {
      this.props.onClose()
    }
  }

  render(){
    const { Logo, Loading, LoginForm } = this.componentDefs;
    const { api, showLogin, message, loginHandler } = this.props;
    const { loginError, loginResult, busy } = this.state;
    const user = api.getUser();
    const self = this;

    const fixSchema = ( formSchema) => {
      //we remove baseUrl and client Id
      
      const { schema, uiSchema }  = formSchema
      delete schema.properties.baseUrl;
      delete schema.properties.clientId;
      schema.properties.email.title = 'Please use your email or 360 username'
      delete schema.format;

      return {
        ...formSchema,
        schema,
        uiSchema
      }
    };

    const collectLogin = (form) => {
      api.log(`Collected formData`, formData);
      const { formData } = form;
      const { email, password } = formData
      this.setState({ username: email, password, busy: true }, this.saveCredentials);      
    };


    return (
      <Container maxWidth="sm" style={{paddingTop: '3%'}}>                
        { this.state.saving && (<Loading message={'Please wait while we set things up.'} />) }
        { this.state.saving === false ? (<Logo backgroundSrc={api.assets.logo} />) : null }
        <Typography variant="h4" style={{marginTyop:"40px"}}>{this.props.title}</Typography>
        <Typography variant="body2">
          {message || 'Credentials required'}
        </Typography>
        { showLogin === true && <LoginForm extendSchema={fixSchema} formData={{email: user.email }} onSubmit={collectLogin} busy={ busy === true } /> }               
        { showLogin === false ? (
          <React.Fragment> 
            <Button color="primary" onClick={this.saveCredentials}><Icon>check</Icon>Yes please</Button>
            <Button onClick={this.cancelSave}><Icon>close</Icon>No thanks</Button> 
          </React.Fragment>) : 
          null }      
        
      </Container>
    )
  }
}

export const RememberCredentialsComponent = compose(withApi, withTheme, withStyles(RememberCredentials.styles))(RememberCredentials)


SearchUser.propTypes = {
}

SearchUser.styles = theme => ({
  ...styles(theme)
});

export const SearchUserForm = compose(
  withStyles(SearchUser.styles),
  withTheme,
)(SearchUser);

export const ResetPasswordForm = compose(
  withStyles(ResetPassword.styles),
  withTheme,
  withApi,
  withRouter)(ResetPassword);

export default {
  ForgotForm,
  ResetPasswordForm,
}


