import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import { CardMedia, CardTitle } from '@material-ui/core/Card';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import { isNil } from 'lodash';
import {
  Typography,
  Fab,
} from '@material-ui/core';
import Icon from '@material-ui/core/Icon';
import SecurityIcon from '@material-ui/icons/Security'
import { withStyles, withTheme } from '@material-ui/core/styles';
import defaultProfileImage from '../../assets/images/profile/default.png';
import { BasicContainer, CenteredContainer, textStyle, isEmail, isValidPassword } from '../util';
import { withApi, ReactoryApi } from '../../api/ApiProvider';
class LoginCard extends Component {

  constructor(props, context) {
    super(props, context);
    const { api } = props;
    this.state = {
      username: localStorage ? localStorage.getItem('$reactory$last_logged_in_user') : '',
      password: '',
      loginError: null,
      busy: false,
      loggedIn: false,
      redirectOnLogin: isNil(api.queryObject) === false && api.queryObject.r ? api.queryObject.r : '/'
    };
    this.doLogin = this.doLogin.bind(this);
    this.doRegister = this.doRegister.bind(this);
    this.doForgot = this.doForgot.bind(this);
    this.updateUsername = this.updateUsername.bind(this);
    this.updatePassword = this.updatePassword.bind(this);
    this.keyPressPassword = this.keyPressPassword.bind(this);
    this.componentRefs = props.api.getComponents([
      'core.Logo@1.0.0',
      'core.Loading@1.0.0',
      'core.BasicModal@1.0.0'
    ]);
  }


  doLogin = (evt) => {
    const { history, api } = this.props;
    const { redirectOnLogin } = this.state;
    const that = this;
    that.setState({ busy: true }, () => {
      api.setLastUserEmail(this.state.username);
      api.login(this.state.username, this.state.password).then(({ user }) => {
        api.afterLogin(user).then(status => {
          that.setState({ loginError: null, loggedIn: true }, () => {
            setTimeout(() => {
              history.push(redirectOnLogin);
            }, 1000);
          })                            
        });
      }).catch((error) => {
        that.setState({ loginError: 'Your account details could not be authenticated', busy: false });
      });
    });
  }

  doEmailLogin = (evt) => {
    const { history, api } = this.props;    
    history.push('/send-link');
  }

  doRegister = evt => this.props.history.push('/register')
  doForgot = evt => this.props.history.push('/forgot')
  updateUsername = (evt) => { 
    this.setState({ username: evt.target.value }) 
    if(localStorage) {
      localStorage.setItem('$reactory$last_logged_in_user', evt.target.value);
    }
  }
  updatePassword = (evt) => this.setState({ password: evt.target.value })
  keyPressPassword = (evt) => {
    if (evt.charCode === 13) {
      this.doLogin()
    }
  }

  render() {
    const that = this;
    const { doLogin, props, context } = that;
    const { theme, classes } = that.props;
    const { busy, loginError, message } = this.state;
    const { Logo } = this.componentRefs;
    const enableLogin = isEmail(this.state.username) && isValidPassword(this.state.password) && !busy;
    return (<CenteredContainer>
      <Logo />
      <Paper className={classes.root}>        
        <Typography variant="h6" color="primary" style={{ fontSize: '80px', marginTop: '20px', marginBottom: '20px' }}>
          <Icon fontSize='inherit'>security</Icon>
        </Typography>
        <Typography variant="subtitle1" color="secondary">{loginError || 'Welcome, please sign in below' }</Typography>
        <form style={{padding: '20px'}}>
          <TextField
            label="Email"
            style={textStyle}
            value={this.state.username}
            onChange={this.updateUsername}
            disabled={busy}
            autoFocus={true}
          />

          <TextField
            label='Password'
            type='password'
            style={textStyle}
            value={this.state.password}
            onChange={this.updatePassword}
            onKeyPress={this.keyPressPassword}
            disabled={busy}
          />

          <Fab
            id="doLoginButton"
            onClick={doLogin} color="primary" raised="true" disabled={enableLogin === false || busy === true}
            style={{ marginTop: '20px' }}>
            <Icon>lock_open</Icon>
          </Fab> <br />

          <Button onClick={this.doForgot} color='secondary' disabled={busy} style={{ marginTop: '20px' }}>
            Forgot Password
          </Button>
          {this.props.magicLink === true && <Fragment>
              <br/>
              <Button onClick={this.doEmailLogin} color='secondary' disabled={busy} style={{ marginTop: '20px' }}>
                Send Magic Link
              </Button>
            </Fragment>}
          
        </form>
      </Paper>
    </CenteredContainer>)
  }

  static contextTypes = {
    router: PropTypes.object,
    theme: PropTypes.object
  }

  static propTypes = {
    api: PropTypes.instanceOf(ReactoryApi),
    magicLink: PropTypes.bool.isRequired,
  }

  static defaultProps = {
    magicLink: false,
  }

  static styles = theme => ({
    root: {
      maxWidth: '600px',
      minWidth: '320px',
      padding: theme.spacing.unit,
      textAlign: 'center',
      margin: 'auto',
    },
  })
};

export default compose(withApi, withStyles(LoginCard.styles), withTheme(), withRouter)(LoginCard);