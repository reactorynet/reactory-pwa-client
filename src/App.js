import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Redirect,
} from 'react-router-dom';
import { isNil } from 'lodash';
import { Provider } from 'react-redux';
import configureStore from './models/redux';
import { ApolloClient, InMemoryCache } from 'apollo-client-preset';
import { ApolloProvider } from 'react-apollo';
import { createHttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import Reboot from 'material-ui/Reboot';
import { createMuiTheme } from 'material-ui/styles';
import { forgot } from './api'
import logo from './logo.svg';
import queryString from './query-string';
import './App.css';
import AssessorHeaderBar from './components/header';
import {
  Assessment,
  Login,
  Register,
  UserList,
  UserInbox,
  Home,
  Profile,
  UserSurvey, 
  OrganizationTable,
  Report,
  TaskDashboard,
  AdminDashboard,
  ReactoryRouter,  
  ForgotForm,
  ResetPasswordForm
} from './components';
import ApiProvider, { ReactoryApi } from './api/ApiProvider'
import * as themes from './themes';


const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem('auth_token');
  
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      'x-client-key': 'towerstone',
      'x-client-pwd': 'sonicwasadog'
    }
  }
});

const httpLink = createHttpLink({
  uri: `${process.env.REACT_APP_API_ENDPOINT}/api`,  
});

const cache = new InMemoryCache();

const client = new ApolloClient({
  link: authLink.concat(httpLink)  ,
  cache
});

const setTheme = (theme) => {
  localStorage.setItem('theme', theme)
};

const getTheme = () => {
  return localStorage.getItem('theme')
}

const api = new ReactoryApi(client);
const store = configureStore();

const defaultTheme = themes.woosparksTheme;

class App extends Component {

  constructor(props, context){
    super(props, context);

    const query = queryString.parse(window.location.search)
    if(query.auth_token) localStorage.setItem('auth_token', query.auth_token)            

    this.state = {
      drawerOpen: false,
      has_token: localStorage.getItem('auth_token') !== null,
      auth_valid: false,
      auth_validated: isNil(localStorage.getItem('auth_token')) === false ? false : true,
      theme: props.appTheme,
    }
  }

  componentDidMount(){    
    const that = this;
    if(this.state.has_token === true && this.state.auth_validated === false){
      const auth_token = localStorage.getItem('auth_token');
      try {
        api.validateToken(auth_token).then((valid) => {
          that.setState({ auth_valid: valid === true, authenticated: true, auth_validated: true })
        }).catch((validationError) => {
          that.setState({ auth_valid: false, authenticated: false, auth_validated: true })
        });
      } catch ( vErr) {
        console.error('vErr',vErr);
      }
      
    }
  }

  render() {
    const { appTitle, appTheme } = this.props;
    const { drawerOpen, auth_valid, has_token, auth_validated } = this.state;
    
    const muiTheme = createMuiTheme( appTheme.muiTheme );  
    
    if(auth_validated === false && has_token === true) {
      return <p>Checking login...</p>
    }
    
    const PrivateRoute = ({ component: Component, ...rest }) => (
      <Route
        {...rest}
        render={(props) => {          
          if (has_token === true && auth_valid === true) {
            return <Component {...props} />
          } else {
            return <Redirect
              to={{
                pathname: "/login",
                state: { from: props.location }
              }}
            />
          }       
        }}
      />);

    return (
      <Router>
        <Provider store={store}>
          <ApolloProvider client={client}>
            <ApiProvider api={api}>
              <MuiThemeProvider theme={muiTheme}>
                <div style={{marginTop:'80px'}}>
                  <Reboot />              
                  <AssessorHeaderBar title={muiTheme.content.appTitle} />
                  <PrivateRoute exact path="/" component={Home}/>                  
                  <PrivateRoute path="/admin" component={AdminDashboard} />              
                  <Route exact path="/login" component={Login} />
                  <Route exact path="/forgot" component={ForgotForm}/>
                  <Route exact path="/reset-password" component={ResetPasswordForm}/>    
                  <Route exact path="/register" component={Register } />
                  <PrivateRoute path="/assess" component={Assessment} />
                  <PrivateRoute exact path="/inbox" component={UserInbox} />
                  <PrivateRoute exact path="/users" component={UserList} />
                  <PrivateRoute path="/profile" component={Profile}/>
                  <PrivateRoute path="/surveys" component={UserSurvey} />
                  <PrivateRoute path="/reports" component={Report} />
                  <PrivateRoute path="/actions" component={TaskDashboard} />
                  <Route path="/reactory">
                    <ReactoryRouter />
                  </Route>
                  <PrivateRoute exact path="/organizations" component={OrganizationTable} />             
                </div>
              </MuiThemeProvider>
            </ApiProvider>
          </ApolloProvider>
        </Provider>
      </Router>
    );
  }
}

App.propTypes = {
  appTitle: PropTypes.string.isRequired,
  appTheme: PropTypes.object  
};

App.defaultProps = {
  appTitle: defaultTheme.muiTheme.content.appTitle, 
  appTheme: defaultTheme
};

export default App;
