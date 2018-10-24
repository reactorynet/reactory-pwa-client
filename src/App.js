import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Redirect,
} from 'react-router-dom';
import { isNil, isArray } from 'lodash';
import { Provider } from 'react-redux';
import configureStore from './models/redux';
import { ApolloClient, InMemoryCache } from 'apollo-client-preset';
import { ApolloProvider, Query, Mutation } from 'react-apollo';
import { createHttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
import CssBaseline from '@material-ui/core/CssBaseline';
import { createMuiTheme } from '@material-ui/core/styles';
import { forgot } from './api'
import logo from './logo.svg';
import queryString from './query-string';
import './App.css';
import AssessorHeaderBar from './components/shared/header';
import {
  componentRegistery
} from './components';
import ApiProvider, { ReactoryApi, ReactoryApiEventNames } from './api/ApiProvider'
import * as themes from './themes';


const authLink = setContext((_, { headers }) => {
  const anonToken = process.env.ANON_USER_TOKEN
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem('auth_token') || anonToken;

  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      'x-client-key': `${process.env.REACT_APP_CLIENT_KEY}`,
      'x-client-pwd': `${process.env.REACT_APP_CLIENT_PASSWORD}`
    }
  }
});

const httpLink = createHttpLink({
  uri: `${process.env.REACT_APP_API_ENDPOINT}/api`,
});

const cache = new InMemoryCache();

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache
});

const setTheme = (theme) => {
  localStorage.setItem('theme', theme)
};

const getTheme = () => {
  return localStorage.getItem('theme')
}

const api = new ReactoryApi(client);
//register built-in components
componentRegistery.forEach((componentDef) => {
  const { nameSpace, name, version, component } = componentDef
  api.registerComponent(nameSpace, name, version, component);
});

api.status();

const store = configureStore();

class App extends Component {

  constructor(props, context) {
    super(props, context);

    const query = queryString.parse(window.location.search)
    if (query.auth_token) localStorage.setItem('auth_token', query.auth_token)
    api.queryObject = query;
    api.objectToQueryString = queryString.stringify;
    this.state = {
      drawerOpen: false,
      has_token: localStorage.getItem('auth_token') !== null,
      auth_valid: false,
      auth_validated: isNil(localStorage.getItem('auth_token')) === false ? false : true,
      theme: props.appTheme,
    }

    this.onLogout = this.onLogout.bind(this);
    this.onLogin = this.onLogin.bind(this);
    api.on(ReactoryApiEventNames.onLogout, this.onLogout)
    api.on(ReactoryApiEventNames.onLogin, this.onLogin)
  }

  onLogin(){
    console.log('User logged in');
    //this.forceUpdate();
  }

  onLogout() {
    this.forceUpdate();
  }

  componentDidMount() {
    const that = this;
    if (this.state.has_token === true && this.state.auth_validated === false) {
      const auth_token = localStorage.getItem('auth_token');
      try {
        api.validateToken(auth_token).then((valid) => {
          that.setState({ auth_valid: valid === true, authenticated: true, auth_validated: true })
        }).catch((validationError) => {
          that.setState({ auth_valid: false, authenticated: false, auth_validated: true })
        });
      } catch (vErr) {
        console.error('vErr', vErr);
      }
    }
  }

  render() {
    const { auth_valid, has_token, auth_validated } = this.state;
    let themeOptions = api.getTheme();

    if (isNil(themeOptions)) themeOptions = { ...this.props.appTheme };
    if (Object.keys(themeOptions).length === 0) themeOptions = { ...this.props.appTheme };
    const muiTheme = createMuiTheme(themeOptions);

    if (auth_validated === false && has_token === true) {
      return <p>Starting application, please wait a moment...</p>
    }
    
    const routes = api.getRoutes()
    return (
      <React.Fragment>
        <CssBaseline />
        <Router>
          <Provider store={store}>
            <ApolloProvider client={client}>
              <ApiProvider api={api}>
                <MuiThemeProvider theme={muiTheme}>
                  <div style={{ marginTop: '80px' }}>
                    <AssessorHeaderBar title={muiTheme.content.appTitle} />
                    {
                      routes.map((routeDef) => {
                      const routeProps = {
                        key: routeDef.id,
                        componentFqn: routeDef.componentFqn,
                        path: routeDef.path,
                        exact: routeDef.exact === true,
                        render: (props) => {
                          const componentArgs = {}
                          if(isArray(routeDef.args)) {
                            routeDef.args.forEach((arg) => {
                              componentArgs[arg.key] = arg.value[arg.key];
                            })
                          }
                          const ApiComponent = api.getComponent(routeDef.componentFqn)
                          if (ApiComponent) return <ApiComponent {...componentArgs} />
                          else return (<p>No Component for {routeDef.componentFqn}</p>)
                        }
                      }
                      if (routeDef.public === true) {
                        return (<Route {...routeProps} />)
                      } else {
                        if (has_token === true && auth_valid === true) {              
                          return <Route {...routeProps} />
                        } else {
                          return (<Redirect key={routeDef.id}
                            to={{
                              pathname: `/login`,
                              state: { from: routeDef.path }
                            }}
                          />)
                        }                
                      }
                    })}
                  </div>                  
                </MuiThemeProvider>
              </ApiProvider>
            </ApolloProvider>
          </Provider>
        </Router>
      </React.Fragment>
    );
  }
}

App.propTypes = {
  appTitle: PropTypes.string.isRequired,
  appTheme: PropTypes.object
};



App.defaultProps = {
  appTitle: "Reactory",
  appTheme: {}
};

export default App;


/**
 * 
* <PrivateRoute exact path="/" component={Home}/>                  
                    <PrivateRoute path="/admin" component={AdminDashboard} />              
                    <Route exact path="/login" component={Login} />
                    <Route exact path="/forgot" component={ForgotForm}/>
                    <Route exact path="/reset-password" component={ResetPasswordForm}/>    
                    <Route exact path="/register" component={Register } />
                    <PrivateRoute path="/assess/:assessmentId" component={Assessment} />
                    <PrivateRoute exact path="/inbox" component={UserInbox} />
                    <PrivateRoute exact path="/users" component={UserList} />
                    <PrivateRoute path="/profile" component={Profile}/>
                    <PrivateRoute path="/surveys" component={UserSurvey} />
                    <PrivateRoute path="/reports" component={Report} />
                    <PrivateRoute path="/tasks" component={ChatDashboard} />
                    <PrivateRoute path="/actions" component={TaskDashboard} />                    
                    <PrivateRoute exact path="/organizations" component={OrganizationTable} />             
 * 
 * 
 */