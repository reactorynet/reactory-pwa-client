import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import { CardMedia, CardTitle } from '@material-ui/core/Card';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import {
  Grid
} from '@material-ui/core';
import Icon from '@material-ui/core/Icon';
import { withStyles, withTheme } from '@material-ui/core/styles';
import defaultProfileImage from '../../assets/images/profile/default.png';
import { BasicContainer, CenteredContainer, textStyle, isEmail, isValidPassword } from '../util';
import { withApi, ReactoryApi } from '../../api/ApiProvider';

class LoginCard extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      username: '',
      password: '',
      loginError: null,      
      busy: false,
      redirectOnLogin: '/'
    };
    this.doLogin = this.doLogin.bind(this);
    this.doRegister = this.doRegister.bind(this);
    this.doForgot = this.doForgot.bind(this);
    this.updateUsername = this.updateUsername.bind(this);
    this.updatePassword = this.updatePassword.bind(this);
  }

  doLogin = (evt) => {
    const { history, api } = this.props;
    const that = this;    
    api.login(this.state.username, this.state.password)    
    .then((response)=>{
      localStorage.setItem('auth_token', response.user.token);
      that.setState({ loginError: null, busy: false }, ()=>{
        history.push(that.state.redirectOnLogin);
      })      
    }).catch((error) => {
      that.setState({ loginError: error, busy: false })
    });
  }

  doRegister = evt => this.props.history.push('/register')
  doForgot = evt => this.props.history.push('/forgot')
  updateUsername = (evt) => this.setState({username: evt.target.value})
  updatePassword = (evt) => this.setState({password: evt.target.value})
  render() {
    const that = this;
    const { doLogin, props, context } = that;
    const { theme, classes } = that.props; 
    const { busy, loginError, message } = this.state;

    const enableLogin = isEmail(this.state.username) && isValidPassword(this.state.password) && !busy;   
    return (      
      <CenteredContainer>
        <Paper className={classes.root}>
          <div className={classes.logo}>            
          </div>

          <TextField
            label="Email"
            style={textStyle}
            value={this.state.username}
            onChange={this.updateUsername}
            disabled={busy}
            />

          <TextField
            label='Password'
            type='password'
            style={textStyle}
            value={this.state.password}
            onChange={this.updatePassword}
            disabled={busy}
            />
          
          <Button
            id="doLoginButton"                          
            onClick={doLogin} color="primary" raised="true" disabled={enableLogin === false}>
            <Icon className="fas fa-sign-in-alt"  />&nbsp;
            Login
          </Button>

          <h2>OR</h2>
          <Button onClick={this.doRegister} color='secondary' disabled={busy}>                              
              Register
          </Button>

          <Button onClick={this.doForgot} color='secondary' disabled={busy}>                              
              Forgot Password
          </Button>
        </Paper>        
      </CenteredContainer>
          )
  }

  static contextTypes = {
    router: PropTypes.object,
    theme: PropTypes.object
  }

  static propTypes = {
    api: PropTypes.instanceOf(ReactoryApi)
  }

  static styles = theme => ({
    root: {
      maxWidth: '600px',
      minWidth: '320px',
      padding: theme.spacing.unit,
      textAlign: 'center',
    },
    logo: {
      display: 'block',
      height: '200px',
      margin: 0,
      padding: 0,
      background: `url(${theme.assets.login.logo || '//placehold.it/200x200'})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
      marginRight: '0px',
      width: 'auto',
    }
  })
};

export default compose(withApi, withStyles(LoginCard.styles), withTheme(), withRouter)(LoginCard);