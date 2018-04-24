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
import logo from './logo.svg';
import './App.css';
import AssessorHeaderBar from './components/header';
import {
  Assessment,
  Login,
  UserList,
  Home,
  Profile,
  UserSurvey, 
  OrganizationTable,
  Report,
  TaskDashboard,
  AdminDashboard
} from './components';

import * as themes from './themes';


const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem('auth_token');
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const httpLink = createHttpLink({
  uri: 'http://localhost:4000/api',  
});

const cache = new InMemoryCache();

const client = new ApolloClient({
  link: authLink.concat(httpLink)  ,
  cache
});

const store = configureStore();

const defaultTheme = themes.towerstoneTheme;

class App extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      drawerOpen: false
    }
  }

  render() {
    const { appTitle, appTheme } = this.props;
    const { drawerOpen } = this.state;
    const muiTheme = createMuiTheme( appTheme.muiTheme );
    if(muiTheme.type === 'bootstrap'){
      console.log('App is bootstrap')  
    }
    return (
      <Router>
        <Provider store={store}>
          <ApolloProvider client={client}>
            <MuiThemeProvider theme={muiTheme}>
              <div style={{marginTop:'80px'}}>
                <Reboot />              
                <AssessorHeaderBar title={muiTheme.content.appTitle}/>             
                <Route exact path="/" component={Home}/>
                <Route path="/admin" component={ AdminDashboard } />              
                <Route exact path="/login" component={Login} />
                <Route path="/assess" component={Assessment} />
                <Route exact path="/inbox" component={UserList} />
                <Route exact path="/users" component={UserList} />
                <Route path="/profile" component={Profile}/>
                <Route path="/survey" component={UserSurvey} />
                <Route path="/reports" component={Report} />
                <Route path="/actions" component={TaskDashboard} />
                <Route exact path="/organizations" component={OrganizationTable} />             
              </div>
            </MuiThemeProvider>
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
