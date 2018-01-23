import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {Card, CardActions, CardHeader, CardMedia, CardTitle, CardText} from 'material-ui/Card';
import Paper  from 'material-ui/Paper';
import TextField from 'material-ui/TextField';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';
import Divider from 'material-ui/Divider';
import FontIcon from 'material-ui/FontIcon';

import muiThemeable from 'material-ui/styles/muiThemeable';
import defaultProfileImage from '../../assets/images/profile/default.png';
import { BasicContainer, CenteredContainer, textStyle } from '../util'; 


class LoginCard extends Component {

  constructor(props, context){
    super(props, context);

    this.doLogin = this.doLogin.bind(this);
  }

  doLogin = (evt) => {        
    const { router } = this.context;
    router.history.push('/');
  }


  render(){    
    const that = this;
    const { doLogin, props } = that;
    const { muiTheme } = props;
    
    return (
      <CenteredContainer>        
        <BasicContainer>          
          <CardMedia overlay={<CardTitle title={muiTheme.content.appTitle} subtitle={muiTheme.content.login.message} />} style={{float:'left'}}>
            <img src={muiTheme.assets.login.featureImage} style={{maxWidth:400}}/>
          </CardMedia>
          <BasicContainer style={{maxWidth:'400px',float:'right'}}>

          <CardMedia>
            <img src={muiTheme.assets.login.logo} style={{width:'300px !important', minWidth:'unset'}}/>
          </CardMedia>

            <TextField        
                floatingLabelText="Email"
                style={textStyle} />

                <TextField
                floatingLabelText='Password'
                type='password'
                style={textStyle}
                />
              
              <RaisedButton
                id="doLoginButton"
                label="Login"          
                icon={<FontIcon className="fas fa-sign-in-alt" />}
                onClick={doLogin} />                                    
              
              <h2>OR</h2>
              <p>Login using your social login of choice</p>        
              <FlatButton
                href="/facebook_login"
                label="Login with Facebook"          
                icon={<FontIcon className="fab fa-facebook" />}/>

              <FlatButton
                href="/linkedin_login"
                label="Login with LinkedIn"          
                icon={<FontIcon className="fab fa-linkedin" />}/>
            </BasicContainer>
        </BasicContainer>
      </CenteredContainer>)
  }

  static contextTypes = {
    router: PropTypes.object
  }
};

export default muiThemeable()(LoginCard);