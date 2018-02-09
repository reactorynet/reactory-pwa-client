import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Card, CardActions, CardHeader, CardMedia, CardTitle, CardText } from 'material-ui/Card';
import Paper from 'material-ui/Paper';
import TextField from 'material-ui/TextField';
import Button from 'material-ui/Button';
import Divider from 'material-ui/Divider';
import Icon from 'material-ui/Icon';
import { withTheme } from 'material-ui/styles';
import defaultProfileImage from '../../assets/images/profile/default.png';
import { BasicContainer, CenteredContainer, textStyle } from '../util';


class LoginCard extends Component {

  constructor(props, context) {
    super(props, context);

    this.doLogin = this.doLogin.bind(this);
  }

  doLogin = (evt) => {
    const { router } = this.context;
    router.history.push('/');
  }


  render() {
    const that = this;
    const { doLogin, props, context } = that;
    const { theme } = that.props;
    console.log('LoginCard', { props, context })
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
              style={textStyle} />

            <TextField
              label='Password'
              type='password'
              style={textStyle}
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

export default withTheme()(LoginCard);