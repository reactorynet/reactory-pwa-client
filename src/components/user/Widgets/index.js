import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import classnames from 'classnames';
import gql from 'graphql-tag';
import { compose } from 'redux';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import {
  AppBar,
  Avatar,
  Badge,
  Chip,
  Button,
  FormControl,
  List,
  ListItem,
  ListItemText,
  InputLabel,
  Input,
  InputBase,
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
  Toolbar,
  Tooltip,
  Typography,
} from '@material-ui/core';

import {
  Visibility,
  VisibilityOff,
  Search as SearchIcon
} from '@material-ui/icons'
import { fade } from '@material-ui/core/styles/colorManipulator';
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

  static Styles = theme => {
    return styles(theme, {
      mainContainer: {
        padding: '5px',
        height: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
        backgroundColor: '#F3F2F1',
        overflow: 'hidden'
      },
      columnContainer: {
        width: '100%',
        overflowX: 'scroll',
        maxHeight: (window.innerHeight - 140),
        padding: theme.spacing.unit,
        display: 'flex',
        justifyContent: 'center',
        minWidth: 250 * 5
      },
      general: {
        padding: '5px'
      },
      formControl: {
        margin: theme.spacing.unit,
        minWidth: 120,
      },
      selectEmpty: {
        marginTop: theme.spacing.unit * 2,
      },
      buttonRow: {
        display: 'flex',
        justifyContent: 'flex-end'
      },
      userList: {
        maxHeight: (window.innerHeight - 140) / 2,
        overflow: 'scroll'
      },
      taskList: {

      },
      column: {
        maxHeight: (window.innerHeight - 140),
        overflowY: 'scroll',
        padding: theme.spacing.unit,
        margin: theme.spacing.unit * 2,
        minWidth: '250px',
        maxWidth: '350px',
        width: (window.innerWidth / 5)
      },
      toolbar: {
        marginBottom: theme.spacing.unit * 2
      },
      menuButton: {
        marginLeft: -12,
        marginRight: 20,
      },
      title: {
        display: 'none',
        [theme.breakpoints.up('sm')]: {
          display: 'block',
        },
      },
      search: {
        position: 'relative',
        borderRadius: theme.shape.borderRadius,
        backgroundColor: fade(theme.palette.common.white, 0.15),
        '&:hover': {
          backgroundColor: fade(theme.palette.common.white, 0.25),
        },
        marginRight: theme.spacing.unit * 2,
        marginLeft: 0,
        width: '100%',
        [theme.breakpoints.up('sm')]: {
          marginLeft: theme.spacing.unit * 3,
          width: 'auto',
        },
      },
      searchIcon: {
        width: theme.spacing.unit * 9,
        height: '100%',
        position: 'absolute',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      inputRoot: {
        color: 'inherit',
        width: '100%',
      },
      inputInput: {
        paddingTop: theme.spacing.unit,
        paddingRight: theme.spacing.unit,
        paddingBottom: theme.spacing.unit,
        paddingLeft: theme.spacing.unit * 10,
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('md')]: {
          width: 200,
        },
      },
      sectionDesktop: {
        display: 'none',
        [theme.breakpoints.up('md')]: {
          display: 'flex',
        },
      },
      sectionMobile: {
        display: 'flex',
        [theme.breakpoints.up('md')]: {
          display: 'none',
        },
      }
    })
  }

  constructor(props, context) {
    super(props, context)
    this.state = {
      searchString: '',
      inputText: '',
      skip: false,
    }

    this.doSearch = this.doSearch.bind(this);
    this.doRefresh = this.doRefresh.bind(this);    
    this.searchStringChanged = this.searchStringChanged.bind(this);
    this.searchStringOnKeyPress = this.searchStringOnKeyPress.bind(this);
    this.componentDefs = this.props.api.getComponents(['core.SingleColumnLayout', 'core.UserSearch', 'core.UserList'])
  }

  doRefresh(){
    this.setState({ skip: false, searchString: this.state.inputText });
  }


  searchStringChanged(evt) {
    this.setState({ inputText: evt.target.value, skip: true });
  }

  searchStringOnKeyPress(evt) {
    if (evt.keyCode === 13) this.doSearch()
  }


  doSearch() {
    this.setState({ searchString: this.state.inputText })
  }


  render() {
    const { SingleColumnLayout, UserList } = this.componentDefs;
    const { classes } = this.props;
    const { skip } = this.state;

    return (
      <SingleColumnLayout style={{ maxWidth: 900, margin: 'auto' }}>
        <AppBar position="static" color="default" className={classes.toolbar}>
          <Toolbar>
            <Typography variant="h6" color="inherit">Employees</Typography>
            <div className={classes.search}>
              <div className={classes.searchIcon}>
                <SearchIcon />
              </div>
              <InputBase
                placeholder="Search…"
                value={this.state.inputText}
                onChange={this.searchStringChanged}
                classes={{
                  root: classes.inputRoot,
                  input: classes.inputInput,
                }}
              />
            </div>
            <Tooltip title={`Click to refresh after changing your search options`}>
              <IconButton color="inherit" onClick={this.doRefresh}>
                <Badge badgeContent={skip ? '!' : ''} hidden={skip === false} color="secondary">
                  <Icon>cached</Icon>
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={`Click to add new employee`}>
              <IconButton color="inherit" onClick={this.newUser}>
                <Icon>add_circle_outline</Icon>
              </IconButton>
            </Tooltip>
            <Tooltip title={`Filter By Business Unit`}>
              <IconButton color="inherit">
                <Icon>filter</Icon>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <UserList onUserSelect={this.props.onUserSelect} organizationId={this.props.organizationId} searchString={this.state.searchString} skip={skip} />
      </SingleColumnLayout>
    )
  }

}

export const UserListWithSearchComponent = compose(withStyles(UserListWithSearch.Styles), withTheme(), withApi)(UserListWithSearch);

export default {
  UserListWithSearchComponent
};


/**
 * <div className={classes.sectionDesktop}>
              <Tooltip title={`You have (${4}) business units in the filter`}>
                <IconButton color="inherit">
                  <Badge badgeContent={4} color="secondary">
                    <Icon>assignment_ind</Icon>
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title={`You have (${5}) assgined tasks in progress`}>
                <IconButton color="inherit">
                  <Badge badgeContent={5} color="secondary">
                    <Icon>assignment_returned</Icon>
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title={`You have (${17}) completed tasks`}>
                <IconButton color="inherit">
                  <Badge badgeContent={17} color="secondary">
                    <Icon>assignment_turned_in</Icon>
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title={`You have (${3}) personal tasks in progress`}>
                <IconButton color="inherit">
                  <Badge badgeContent={3} color="secondary">
                    <Icon>delete</Icon>
                  </Badge>
                </IconButton>
              </Tooltip>
            </div>
 * 
 * 
 * */

