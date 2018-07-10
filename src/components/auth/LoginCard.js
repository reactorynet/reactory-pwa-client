import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import { Card, CardActions, CardHeader, CardMedia, CardTitle, CardText } from 'material-ui/Card';
import Paper from 'material-ui/Paper';
import TextField from 'material-ui/TextField';
import Button from 'material-ui/Button';
import Divider from 'material-ui/Divider';
import Icon from 'material-ui/Icon';
import { withTheme } from 'material-ui/styles';
import defaultProfileImage from '../../assets/images/profile/default.png';
import { BasicContainer, CenteredContainer, textStyle } from '../util';
import { login } from '../../api';

class LoginCard extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      username: '',
      password: ''
    };
    this.doLogin = this.doLogin.bind(this);
    this.updateUsername = this.updateUsername.bind(this);
    this.updatePassword = this.updatePassword.bind(this);
  }

  doLogin = (evt) => {
    const { history } = this.props;
    const token = btoa(`${this.state.username}:${this.state.password}`)
    login(this.state.username, this.state.password)
    .then((response)=>{
      console.log('user logged in', response);
      localStorage.setItem('auth_token', response.user.token);
      history.push('/admin')
    })
  }

  updateUsername = (evt) => this.setState({username: evt.target.value})
  updatePassword = (evt) => this.setState({password: evt.target.value})
  render() {
    const that = this;
    const { doLogin, props, context } = that;
    const { theme } = that.props;    
    return (
      <CenteredContainer>
        <BasicContainer>
          <CardMedia overlay={<CardTitle title={ theme.content.appTitle} subtitle={ theme.content.login.message} />} style={{ float: 'left' }}>
            <img src={theme.assets.login.featureImage} style={{ maxWidth: 400 }} />
          </CardMedia>
          <BasicContainer style={{ maxWidth: '400px', float: 'right' }}>

            <CardMedia>
              <img src={theme.assets.login.logo} style={{ width: '300px !important', maxWidth: '400px' }} />
            </CardMedia>

            <TextField
              label="Email"
              style={textStyle}
              value={this.state.username}
              onChange={this.updateUsername}
               />

            <TextField
              label='Password'
              type='password'
              style={textStyle}
              value={this.state.password}
              onChange={this.updatePassword}
            />

            
            <Button
              id="doLoginButton"                          
              onClick={doLogin} color="primary" raised>
              <Icon className="fas fa-sign-in-alt"  />
              Login
            </Button>

            <h2>OR</h2>
            <p>Login using your social login of choice</p>
            <Button>              
                <Icon className="fab fa-facebook"/>
                Login with Facebook
              </Button>

            <Button>              
              <Icon className="fab fa-linkedin" />
              Login with Linkedin
            </Button>
          </BasicContainer>
        </BasicContainer>
      </CenteredContainer>)
  }

  static contextTypes = {
    router: PropTypes.object,
    theme: PropTypes.object
  }
};

export default compose(withTheme(), withRouter)(LoginCard);