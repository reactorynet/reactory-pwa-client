import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import classnames from 'classnames';
import gql from 'graphql-tag';
import { compose } from 'redux';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import {
  Avatar,
  Chip,
  Button,
  FormControl,
  List,
  ListItem,
  ListItemText,
  InputLabel,
  Input,
  Icon,
  InputAdornment,
  IconButton,
  Grid,
  Paper,
  TextField,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Tooltip,
  Typography,
} from '@material-ui/core';

import {
  Visibility,
  VisibilityOff,
  Search as SearchIcon
} from '@material-ui/icons'
import classNames from 'classnames';
import AddCircleIcon from '@material-ui/icons/AddCircle'
import DetailIcon from '@material-ui/icons/Details'
import { withTheme, withStyles } from '@material-ui/core/styles';
import { isArray, isNil } from 'lodash';
import moment from 'moment';
import { ReactoryFormComponent } from '../../reactory';
import { TableFooter } from '@material-ui/core/Table';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';
import DefaultAvatar from '../../../assets/images/profile/default.png';
import Profile from './../Profile';
import Message from '../../message'
import { omitDeep, getAvatar, CenteredContainer } from '../../util';
import styles from '../../shared/styles'






export class UserListWithSearch extends Component {
  
  constructor(props, context){
    super(props, context)
    this.state = {
      searchString: '',
      inputText: ''
    }

    this.doSearch = this.doSearch.bind(this);
    this.searchStringChanged = this.searchStringChanged.bind(this);
    this.componentDefs = this.props.api.getComponents(['core.SingleColumnLayout', 'core.UserSearch', 'core.UserList'])
  }
  

  searchStringChanged(evt){
    console.log('searchString changed', evt);
    this.setState({inputText: evt.target.value});
  }

  doSearch(){
    console.log('do it');
    this.setState({ searchString: this.state.inputText })
  }

  render(){
    const { SingleColumnLayout, UserSearch, UserList } = this.componentDefs;
    return (
      <SingleColumnLayout style={{ maxWidth: 900, margin: 'auto' }}>
        <UserSearch onSearch={this.doSearch} onChange={this.searchStringChanged} value={this.state.inputText}/>
        <UserList onUserSelect={this.props.onUserSelect} organizationId={this.props.organizationId} searchString={this.state.searchString} />
      </SingleColumnLayout> 
    )
  }
  
}

export const UserListWithSearchComponent = compose(withStyles(styles), withTheme(), withApi)(UserListWithSearch);

export default {
  UserListWithSearchComponent
};
