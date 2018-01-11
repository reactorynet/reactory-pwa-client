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
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import AssessorHeaderBar from './components/header';
import { UserList, Home, OrganizationTable } from './components';


const link = createHttpLink({
  uri: 'http://localhost:4000/api',
  credentials: 'same-origin'
});

const cache = new InMemoryCache();

const client = new ApolloClient({
  link  ,
  cache
});

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: '#990033'
  }
});

class App extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      drawerOpen: false
    }
  }

  render() {
    const { appTitle } = this.props;
    const { drawerOpen } = this.state;
    return (
      <Router>
        <ApolloProvider client={client}>
          <MuiThemeProvider muiTheme={muiTheme}>
            <div>              
              <AssessorHeaderBar />             
              <Route exact path="/" component={Home}/>
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
  appTitle: PropTypes.string.isRequired  
};

App.defaultProps = {
  appTitle: 'TowerStone Learning Centre',  
}

export default App;
