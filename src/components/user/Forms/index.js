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
  Button,
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
import { ReactoryFormComponent } from '../../reactory';
import { TableFooter } from '@material-ui/core/Table';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';
import DefaultAvatar from '../../../assets/images/profile/default.png';
import Profile from './../Profile';
import Message from '../../message'
import { omitDeep, getAvatar, CenteredContainer } from '../../util';
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
    }

    this.onSubmit = this.onSubmit.bind(this);
    this.goBack = this.goBack.bind(this);
    this.componentRefs = props.api.getComponents([
      'core.Loading@1.0.0',
      'core.DateSelector@1.0.0',
      'core.Layout@1.0.0',
      'core.ReactoryForm@1.0.0',
      'core.BasicModal@1.0.0'
    ]);
  }

  onSubmit(form) {
    const that = this;
    this.props.api.forgot(form.formData).then((forgotResult) => {
      console.log('Forgot password has been triggered', forgotResult);
      that.setState({ mailSent: true })
    }).catch((error) => {
      console.error('Error sending forgot password email to user', error);
      that.setState({ hasError: true, message: 'Could not send an email. If this problem persists please contact our helpdesk.' })
    })
  }

  onChange(formData) {
    console.log('formData changed', formData)
    this.setState({ formData });
  }

  goBack() {
    this.props.history.goBack();
  }

  render() {

    const {
      BasicModal
    } = this.componentRefs

    if (this.state.mailSent) {

      return (<BasicModal open={true} onClose={this.goBack} title="Email Sent"><Typography variant="heading">An email has been sent with instructions to reset your password. Please allow a few minutes for delivery</Typography></BasicModal>)
    }
    if (this.state.hasError) {
      return (<div><Typography variant="heading">{this.state.message}</Typography></div>);
    }

    const beforeComponent = (<div className={this.props.classes.logo} style={{ marginBottom: '16px' }}></div>)
    const fabstyle = {
      float: 'right',
      bottom: '61px',
      right: '10px',
    };
    return (
      <CenteredContainer classNames={this.props.classes.root} style={{ maxWidth: 600, margin: 'auto' }}>
        <ReactoryFormComponent before={beforeComponent} className={this.props.classes.root} formId="forgot-password" uiFramework="material" onSubmit={this.onSubmit}>
          <Button type="button" onClick={this.goBack} variant="flat"><Icon>keyboard_arrow_left</Icon>&nbsp;BACK</Button>
          <Tooltip title="Click to send a reset email">
            <Button type="submit" variant="fab" color="primary" style={fabstyle}><Icon>send</Icon></Button>
          </Tooltip>
        </ReactoryFormComponent>
      </CenteredContainer>
    )
  }
}

Forgot.propTypes = {
  api: PropTypes.instanceOf(ReactoryApi)
}

Forgot.styles = theme => ({
  ...styles(theme)
});

export const ForgotForm = compose(
  withStyles(Forgot.styles),
  withTheme(),
  withApi,
  withRouter)(Forgot);



class ResetPassword extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      formData: { email: '', password: '', passwordConfirm: '', authToken: localStorage.getItem('auth_token') },
      message: '',
      hasError: false,
    }

    this.onSubmit = this.onSubmit.bind(this);
  }

  onSubmit(form) {
    const that = this;
    this.props.api.resetPassword(form.formData).then((forgotResult) => {
      console.log('Forgot password has been triggered', forgotResult);
      that.setState({ mailSent: true })
    }).catch((error) => {
      console.error('Error sending forgot password email to user', error);
      that.setState({ hasError: true, message: 'Could not send an email. If this problem persists please contact our helpdesk.' })
    })
  }

  onChange(formData) {
    console.log('formData changed', formData)
    this.setState({ formData });
  }

  render() {

    if (this.state.mailSent) {
      return (<div><Typography variant="body1" value="An email has been sent with instructions to reset your password. Please allow a few minutes for delivery" /></div>)
    }
    if (this.state.hasError) {
      return (<div><Typography variant="body2" value={this.state.message} /></div>);
    }

    const formData = {
      email: this.props.api.getUser().email,
      authToken: this.props.api.queryObject.auth_token
    };

    return (
      <CenteredContainer classNames={this.props.classes.root} style={{ maxWidth: 600, margin: 'auto' }}>
        <ReactoryFormComponent formId="password-reset" uiFramework="material" onSubmit={this.onSubmit} formData={formData}>
          <Button type="submit" variant="raised" color="primary"><Icon>save</Icon>&nbsp;UPDATE PASSWORD</Button>
        </ReactoryFormComponent>
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
    console.log('formData changed', formData)
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

SearchUser.propTypes = {
}

SearchUser.styles = theme => ({
  ...styles(theme)
});

export const SearchUserForm = compose(
  withStyles(SearchUser.styles),
  withTheme(),
)(SearchUser);

export const ResetPasswordForm = compose(
  withStyles(ResetPassword.styles),
  withTheme(),
  withApi,
  withRouter)(ResetPassword);

export default {
  ForgotForm,
  ResetPasswordForm,
}


