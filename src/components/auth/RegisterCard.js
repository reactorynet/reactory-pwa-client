import React, { Component } from 'react';import PropTypes from 'prop-types';

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
import { BasicContainer, CenteredContainer, textStyle, nilStr, isEmail, isValidPassword } from '../util';
import queryString from '../../query-string';
import { login, register, companyWithId } from '../../api';


class RegisterCard extends Component {

  constructor(props, context) {
    super(props, context);
    const queryParams = queryString.parse(props.location.search)
    this.state = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      passwordConfirm: '',
      organizationId: queryParams.oid || null,
      organizationName: queryParams.onm || null
    };
    this.doLogin = this.doLogin.bind(this);
    this.doRegister = this.doRegister.bind(this);
    this.updateFirstname = this.updateFirstname.bind(this);
    this.updateLastname = this.updateLastname.bind(this);
    this.updateEmail = this.updateEmail.bind(this);    
    this.updatePassword = this.updatePassword.bind(this);
    this.updatePasswordConfirm = this.updatePasswordConfirm.bind(this);
    this.updateOrganizationName = this.updateOrganizationName.bind(this);
    this.formValid = this.formValid.bind(this);
  }

  componentDidMount(){
    const that = this;
    if(!nilStr(this.state.organizationId)){
      companyWithId(this.state.organizationId).then((searchResult) => {
        if(!nilStr(searchResult.name)) that.setState({ organizationName: searchResult.name })
      }).catch((error) => {
        console.error('Could not lookup company', error);
      })
    }
  }
  
  doLogin = (evt) => {
    const { history } = this.props;
    const { email, password } = this.state;
    login(email, password)
    .then((response) => response.json())
    .then((response)=>{
      console.log('user logged in', response);
      localStorage.setItem('auth_token', response.user.token);
      history.push('/admin')
    }).catch((error) => {
      //could not login user
    })
  }

  doRegister = (evt) => {
    const { email, password, firstName, lastName } = this.state;
    const that = this;
    const payload = { 
      user: { 
        email,
        password,
        firstName,
        lastName,
      },
      organization: {
        id: this.state.organizationId,
        name: this.state.organizationName
      }
    };
    
    register(payload).then(( registerResult) => {
      console.log('Register Complete', registerResult)
      that.doLogin();
    }).catch((registerError) => {
      console.error('Register Error', registerError)
      that.setState({ registerError })
    })
  }
  

  updateFirstname = (evt) => this.setState({firstName: evt.target.value})
  updateLastname = (evt) => this.setState({lastName: evt.target.value})
  updateEmail = (evt) => this.setState({email: evt.target.value})  
  updatePassword = (evt) => this.setState({password: evt.target.value})
  updatePasswordConfirm = (evt) => this.setState({passwordConfirm: evt.target.value})
  updateOrganizationName = (evt) => this.setState({organizationName: evt.target.value})

  formValid = () => {
    const { 
      firstName,
      lastName,
      email, 
      password,
      passwordConfirm,
      organizationName,
      organiaztionId
    } = this.state;

    let valid = true;
    
    let errors = {
      firstName: null,
      lastName: null,
      email: null, 
      password: null,
      passwordConfirm: null,
      organizationName: null
    }

    if(nilStr(firstName)) {
      valid = false
      errors.firstName = 'Please enter your firstname'
    }

    if(nilStr(lastName)){
      valid = false
      errors.lastName = 'Please enter your lastname'
    }

    if(nilStr(email)){
      valid = false
      errors.email = 'Please enter your email address'
    }

    if(nilStr(password) || !isValidPassword(password)){
      valid = false
      errors.password = 'Please enter a password with at least 8 characters'
    }

    if(nilStr(passwordConfirm) || password !== passwordConfirm){
      valid = false
      errors.passwordConfirm = 'Ensure your confirm and password match'
    }

    return {
      valid,
      errors
    }
  }

  render() {
    const that = this;
    const { doRegister, props, context, formValid } = that;
    const { theme } = that.props;

    const validationResult = formValid()

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
              label="Organization"
              style={textStyle}
              value={this.state.organizationName}
              onChange={this.updateOrganizationName}
              placeholder='Your company name'
               />

             <TextField
              label="Firstname"
              style={textStyle}
              value={this.state.firstName}
              onChange={this.updateFirstname}
               />

               <TextField
              label="Lastname"
              style={textStyle}
              value={this.state.lastName}
              onChange={this.updateLastname}
               />

            <TextField
              label="Email"
              style={textStyle}
              value={this.state.email}
              onChange={this.updateEmail}
               />

            <TextField
              label='Password'
              type='password'
              style={textStyle}
              value={this.state.password}
              onChange={this.updatePassword}
            />

          <TextField
              label='Password Confirm'
              type='password'
              style={textStyle}
              value={this.state.passwordConfirm}
              onChange={this.updatePasswordConfirm}
            />
            
            <Button
              id="doRegisterButton"                          
              onClick={doRegister} color="primary" raised="raised" disabled={ formValid() }>
              <Icon className="fas fa-sign-in-alt"  />
              Register
            </Button>

            <h2>OR</h2>
            <p>Register using your social login of choice</p>
            <Button>              
                <Icon className="fab fa-facebook"/>
                Register with Facebook
              </Button>

            <Button>              
              <Icon className="fab fa-linkedin" />
              Register with Linkedin
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

export default compose(withTheme(), withRouter)(RegisterCard);