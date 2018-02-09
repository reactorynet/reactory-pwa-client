import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom';
import logo from './logo.svg';
import './App.css';

import { ApolloClient, InMemoryCache } from 'apollo-client-preset';
import { ApolloProvider } from 'react-apollo';
import { createHttpLink } from 'apollo-link-http';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import Reboot from 'material-ui/Reboot';
import { createMuiTheme } from 'material-ui/styles';
import AssessorHeaderBar from './components/header';
import {
  Login,
  UserList,
  Home, 
  OrganizationTable 
} from './components';

import * as themes from './themes';


const link = createHttpLink({
  uri: 'http://localhost:4000/api',
  credentials: 'same-origin'
});

const cache = new InMemoryCache();

const client = new ApolloClient({
  link  ,
  cache
});

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
    console.log('Created theme', muiTheme);
    
    return (
      <Router>
        <ApolloProvider client={client}>
          <MuiThemeProvider theme={muiTheme}>
            <div style={{marginTop:'80px'}}>
              <Reboot />              
              <AssessorHeaderBar title={muiTheme.content.appTitle}/>             
              <Route exact path="/" component={Home}/>
              <Route exact path="/login" component={Login} />
              <Route exact path="/inbox" component={UserList} />
              <Route exact path="/users" component={UserList} />
              <Route exact path="/organizations" component={OrganizationTable} />             
            </div>
          </MuiThemeProvider>
        </ApolloProvider>
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
