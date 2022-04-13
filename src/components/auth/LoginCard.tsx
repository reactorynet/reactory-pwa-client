import React, { Component, Fragment } from 'react';

import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';

import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

import { isNil } from 'lodash';
import {
  Typography,
  Fab,
} from '@mui/material';
import { Icon } from '@mui/material';

import { withStyles, withTheme } from '@mui/styles';

import { CenteredContainer, textStyle, isEmail, isValidPassword } from '../util';
import { withApi } from '../../api/ApiProvider';
import ReactoryApi from "../../api/ReactoryApi";

class LoginCard extends Component<any, any> {
  componentRefs: { Logo: (props: any, context: any) => JSX.Element; Loading: (props: any, context: any) => JSX.Element; BasicModal: (props: any, context: any) => JSX.Element; MicrosoftLogin: (props: any, context: any) => JSX.Element; };

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
    this.mountComponents = this.mountComponents.bind(this);
    this.componentRefs = {
      Logo: (props, context) => (<span>...</span>),
      Loading: (props, context) => (<span>...</span>),
      BasicModal: (props, context) => (<span>x</span>),
      MicrosoftLogin: (props, context) => (<span>...</span>),
    }
  }

  mountComponents() {
    this.componentRefs = this.props.api.getComponents([
      'core.Logo@1.0.0',
      'core.Loading@1.0.0',
      'core.BasicModal@1.0.0',
      'microsoft.MicrosoftLogin@1.0.0'
    ]);
    this.forceUpdate();
  }

  componentDidMount() {
    const that = this;
    const { api } = that.props;
    let checked = 0;
    if (api.formSchemaLastFetch !== null) {
      that.mountComponents();
    } else {
      const checkWait = () => {
        if (api.formSchemaLastFetch === null) {
          if (checked >= 5) {
            api.forms();
            checked = 0;
          }
          setTimeout(checkWait, 300);
        } else {
          that.mountComponents();
        }
      }

      setTimeout(checkWait, 300);
    }
  }


  doLogin = () => {
    const { history, api } = this.props;
    const { redirectOnLogin } = this.state;
    const that = this;

    that.setState({ busy: true }, () => {
      api.setLastUserEmail(this.state.username);
      api.login(this.state.username, this.state.password).then(({ user }) => {
        api.afterLogin(user).then(status => {
          that.setState({ loginError: `Welcome ${user.firstName}`, loggedIn: true }, () => {
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

  doEmailLogin = () => {
    const { history, api } = this.props;
    history.push('/send-link');
  }

  doRegister = evt => this.props.history.push('/register')
  doForgot = evt => this.props.history.push('/forgot')
  updateUsername = (evt) => {
    this.setState({ username: evt.target.value })
    if (localStorage) {
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
    const { theme, classes, authlist, magicLink, reactory } = props;
    const { busy, loginError, message } = this.state;
    const { Logo, MicrosoftLogin } = this.componentRefs;
    const enableLogin = isEmail(this.state.username) && isValidPassword(this.state.password) && !busy;

    const authcomponents = [];
    const activeTheme = reactory.getTheme();
    debugger
    authlist.forEach(authType => {
      switch (authType) {
        case 'local': {
          authcomponents.push((
            <form style={{ padding: '20px', borderBottom: `1px ${theme.palette.primary.main}` }} key={authType}>
              <TextField
                label="Email"
                style={textStyle}
                value={this.state.username}
                onChange={this.updateUsername}
                disabled={busy}
                name='reactory-security::standard-login-email'
                id='reactory-security::standard-login-email'
                autoFocus={true}
              />

              <TextField
                label='Password'
                type='password'
                style={textStyle}
                value={this.state.password}
                onChange={this.updatePassword}
                onKeyPress={this.keyPressPassword}
                name='reactory-security::standard-login-password'
                id='reactory-security::standard-login-password'
                disabled={busy}
              />

              <Fab
                id="reactory-security::standard-login-button"
                name="reactory-security::standard-login-button"
                onClick={doLogin}
                color="primary"
                disabled={enableLogin === false || busy === true}
                style={{ marginTop: '20px' }}>
                <Icon>lock_open</Icon>
              </Fab> <br />

              <Button onClick={this.doForgot} color='secondary' id="reactory-security::standard-forgot-password-button" name="reactory-security::standard-forgot-password-button" disabled={busy} style={{ marginTop: '20px' }}>
                Forgot Password
              </Button>
              {this.props.magicLink === true && <Fragment>
                <br />
                <Button onClick={this.doEmailLogin} id="reactory-security::standard-send-link-button" name="reactory-security::standard-send-link-button" color='secondary' disabled={busy} style={{ marginTop: '20px' }}>
                  Send Magic Link
                </Button>
              </Fragment>}
            </form>))
          break;
        }
        case 'microsoft': {
          // authcomponents.push((<MicrosoftLogin key={authType} /> || <p>Login Button goes here</p>));
          break;
        }
      }
    });

    let logoResource = activeTheme.assets.find((e) => e.name === "logo");

    return (<CenteredContainer>
    <Logo backgroundSrc={logoResource?.url} />
      <Paper className={classes.root}>
        <Typography variant="h6" color="primary" style={{ fontSize: '80px', marginTop: '20px', marginBottom: '20px' }}>
          <Icon fontSize='inherit'>security</Icon>
        </Typography>
        <Typography variant="subtitle1" color="secondary">{loginError || 'Welcome, please sign in below'}</Typography>
        {authcomponents}
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
    authlist: PropTypes.array
  }

  static defaultProps = {
    magicLink: false,
    authlist: ['local'],
  }

};

const styles = (theme): any => {  
  return {
    root: {
      maxWidth: '600px',
      minWidth: '320px',
      padding: theme.spacing(1),
      textAlign: 'center',
      margin: 'auto',
    },
  }
}
export default compose(withApi, withStyles(styles), withTheme, withRouter)(LoginCard);