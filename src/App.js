import "@babel/polyfill";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { MuiPickersUtilsProvider } from 'material-ui-pickers';
import MomentUtils from '@date-io/moment';
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
import queryString from './query-string';
import './App.css';
import AssessorHeaderBar from './components/shared/header';
import {
  componentRegistery
} from './components';
import ApiProvider, { ReactoryApi, ReactoryApiEventNames } from './api/ApiProvider'
import { fetch } from "whatwg-fetch";
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
  fetch: fetch
});

const cache = new InMemoryCache();

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'ignore',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
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
const store = configureStore();
api.reduxStore = store;

class App extends Component {
  
  constructor(props, context) {
    super(props, context);
    
    const query = queryString.parse(window.location.search)
    if (query.auth_token) localStorage.setItem('auth_token', query.auth_token);
    api.queryObject = query;
    api.queryString = window.location.search;
    api.objectToQueryString = queryString.stringify;

    this.state = {
      drawerOpen: false,
      auth_valid: false,
      auth_validated: false,
      theme: props.appTheme,
      user: api.getUser(),
      routes: [],
    }

    this.onLogout = this.onLogout.bind(this);
    this.onLogin = this.onLogin.bind(this);
    this.configureRouting = this.configureRouting.bind(this);
    api.on(ReactoryApiEventNames.onLogout, this.onLogout)
    api.on(ReactoryApiEventNames.onLogin, this.onLogin)
    
    this.componentRefs = api.getComponents(['core.Loading@1.0.0', 'core.Login@1.0.0']);    
  }

  
  onLogin() {
    const loggedInUser = api.getUser();        
    this.setState({ user: loggedInUser });
  }

  onLogout() {
    this.setState({ user: api.getUser() })
  }

  configureRouting(){
    const { auth_validated, user } = this.state;
    const { Loading } = this.componentRefs;
    const routes = [];
    let loginRouteDef = null;
    let homeRouteDef = null;
    const that = this;

    api.getRoutes().forEach((routeDef) => {
      const routeProps = {
        key: routeDef.id,
        componentFqn: routeDef.componentFqn,
        path: routeDef.path,
        exact: routeDef.exact === true,
        render: (props) => {
          const componentArgs = {}
          if (isArray(routeDef.args)) {
            routeDef.args.forEach((arg) => {
              componentArgs[arg.key] = arg.value[arg.key];
            })
          }

          const ApiComponent = api.getComponent(routeDef.componentFqn)

          if(routeDef.public === true) {
            if (ApiComponent) return (<ApiComponent {...componentArgs} />)
            else return (<p>No Component for {routeDef.componentFqn}</p>)
          }

          const hasRolesForRoute = api.hasRole(routeDef.roles, api.getUser().roles)  === true;

          if (auth_validated === true && hasRolesForRoute === true) {
            if (ApiComponent) return (<ApiComponent {...componentArgs} />)
            else return (<p>No Component for {routeDef.componentFqn}</p>)
          }

          if(api.isAnon() === true && auth_validated && routeDef.path !== "/login") {
            return <Redirect to={{pathname: '/login', state: { from: routeDef.path } }} />
          }
          
          return <Redirect to={{pathname: '/login', state: { from: routeDef.path } }} />
        }
      }
            
      routes.push(<Route {...routeProps} />)            
    });    

    this.setState({ routes });
  }


  componentDidMount() {
    const that = this;
    if (window && !window.reactory) {
      window.reactory = {
        api,
      };
    }
    
    if (this.state.auth_validated === false) {      
      api.status({ emitLogin: true }).then((user) => {                
        that.setState({ auth_validated: true, user }, that.configureRouting)
      }).catch((validationError) => {
        that.setState({ auth_validated: false })
      });
    }
  }

  render() {
    const { auth_validated, routes } = this.state;
    const { Loading } = this.componentRefs;

    let themeOptions = api.getTheme();
    if (isNil(themeOptions)) themeOptions = { ...this.props.appTheme };
    if (Object.keys(themeOptions).length === 0) themeOptions = { ...this.props.appTheme };
    if(!themeOptions.typography) themeOptions.typograph =  { useNextVariants: true };
    else themeOptions.typography.useNextVariants = true;
    const muiTheme = createMuiTheme(themeOptions);
    api.muiTheme = muiTheme;
                
    return (
      <React.Fragment>        
        <CssBaseline />        
        <Router>
          <Provider store={store}>
            <ApolloProvider client={client}>
              <ApiProvider api={api}>
                <MuiThemeProvider theme={muiTheme}>
                  <MuiPickersUtilsProvider utils={MomentUtils}>
                  <div style={{ marginTop: '80px' }}>
                    <AssessorHeaderBar title={muiTheme.content.appTitle} />                    
                    { auth_validated === true && routes.length > 0 ? routes : <Loading message="Configuring Application. Please wait" icon="security" spinIcon={false} /> }
                  </div>
                  </MuiPickersUtilsProvider>
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