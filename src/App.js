import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom';
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
  Home,
  Profile,
  UserSurvey, 
  OrganizationTable,
  Report,
  TaskDashboard,
  AdminDashboard,
  ReactoryRouter,  
  ForgotForm,
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

    //const query = queryString.parse(props.location.search)
    this.state = {
      drawerOpen: false,
      authenticated: localStorage.getItem('auth_token') === null,
      auth_valid: false,
      theme: props.appTheme,
    }
  }

  componentWillMount(){
    if(this.state.authenticated){
      //api.validateToken(localStorage.getItem('auth_token')).then((valid) => {
      //  this.setState({ auth_valid: valid === true })
      //}).catch((validationError) => {
      //  this.setState({ auth_valid: false, authenticated: false })
      //})
    }
  }

  render() {
    const { appTitle, appTheme } = this.props;
    const { drawerOpen, auth_valid, authenticated } = this.state;
    
    const muiTheme = createMuiTheme( appTheme.muiTheme );
    
    return (
      <Router>
        <Provider store={store}>
          <ApolloProvider client={client}>
            <ApiProvider api={api}>
              <MuiThemeProvider theme={muiTheme}>
                <div style={{marginTop:'80px'}}>
                  <Reboot />              
                  <AssessorHeaderBar title={muiTheme.content.appTitle}/>
                  <Route exact path="/" component={Home}/>                  
                  <Route path="/admin" component={AdminDashboard} />              
                  <Route exact path="/login" component={Login} />
                  <Route exact path="/forgot" component={ForgotForm}/>                  
                  <Route exact path="/register" component={Register } />
                  <Route path="/assess" component={Assessment} />
                  <Route exact path="/inbox" component={UserList} />
                  <Route exact path="/users" component={UserList} />
                  <Route path="/profile" component={Profile}/>
                  <Route path="/survey" component={UserSurvey} />
                  <Route path="/reports" component={Report} />
                  <Route path="/actions" component={TaskDashboard} />
                  <Route path="/reactory">
                    <ReactoryRouter />
                  </Route>
                  <Route exact path="/organizations" component={OrganizationTable} />             
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
