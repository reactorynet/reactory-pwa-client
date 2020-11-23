import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import {
  AppBar,
  Badge,
  InputBase,
  Icon,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@material-ui/core';

import {
  Search as SearchIcon
} from '@material-ui/icons'
import { fade } from '@material-ui/core/styles/colorManipulator';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';
import styles from '@reactory/client-core/components/shared/styles';

export class UserListWithSearch extends Component<any, any> {

  componentDefs: any

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
        padding: theme.spacing(1),
        display: 'flex',
        justifyContent: 'center',
        minWidth: 250 * 5
      },
      general: {
        padding: '5px'
      },
      formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
      },
      selectEmpty: {
        marginTop: theme.spacing(2),
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
        padding: theme.spacing(1),
        margin: theme.spacing(2),
        minWidth: '250px',
        maxWidth: '350px',
        width: (window.innerWidth / 5)
      },
      toolbar: {
        marginBottom: theme.spacing(2)
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
        marginRight: theme.spacing(2),
        marginLeft: 0,
        width: '100%',
        [theme.breakpoints.up('sm')]: {
          marginLeft: theme.spacing(3),
          width: 'auto',
        },
      },
      searchIcon: {
        width: theme.spacing(9),
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
        paddingTop: theme.spacing(1),
        paddingRight: theme.spacing(1),
        paddingBottom: theme.spacing(1),
        paddingLeft: theme.spacing(10),
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
    });
  }

  static propTypes = {
    onAcceptSelection: PropTypes.func,
    organizationId: PropTypes.string.isRequired,
    businessUnitFilter: PropTypes.bool,
    onNewUserClick: PropTypes.func,
    onDeleteUsersClick: PropTypes.func,
    allowDelete: PropTypes.bool,
    selected: PropTypes.array,
    multiSelect: PropTypes.bool,
  };

  static defaultProps = {
    businessUnitFilter: true,
    onAcceptSelection: (evt) => {
      //console.log('No selection accept handler');
    },
    onDeleteUsersClick: (evt) => {
      //console.log('No delete handler');
    },
    allowDelete: false,
    selected: [],
    multiSelect: false,
  };

  constructor(props, context) {
    super(props, context)
    this.state = {
      searchString: '',
      inputText: '',
      skip: false,
      includeDeleted: false,
      selected: [],
      businessUnitFilter: null,
      showBusinessUnitFilter: false,
      paging: null
    }

    this.doSearch = this.doSearch.bind(this);
    this.doRefresh = this.doRefresh.bind(this);
    this.searchStringChanged = this.searchStringChanged.bind(this);
    this.searchStringOnKeyPress = this.searchStringOnKeyPress.bind(this);
    this.onNewUserClick = this.onNewUserClick.bind(this);
    this.onShowBusinessUnitFilter = this.onShowBusinessUnitFilter.bind(this);
    this.componentDefs = this.props.api.getComponents(['core.SingleColumnLayout', 'core.UserSearch', 'core.UserList'])
  }

  doRefresh() {
    this.setState({ skip: false, searchString: this.state.inputText });
  }

  searchStringChanged(evt) {
    this.setState({ inputText: evt.target.value, skip: true });
  }

  searchStringOnKeyPress(evt) {
    if (evt.charCode === 13) this.doSearch()
  }


  doSearch() {
    this.setState({ searchString: this.state.inputText })
  }

  onUserSelect(user, index) {
    //console.log(`User selected ${user.id} ${index}`, {user, index});

    if (this.props.onUserSelect) this.props.onUserSelect(user, index);

  }


  onShowBusinessUnitFilter() {
    this.setState({ showBusinessUnitFilter: !this.state.showBusinessUnitFilter })
  }

  onNewUserClick() {
    //console.log("New User Clicked", {onNewUserClick: this.props.onNewUserClick});
    if (typeof this.props.onNewUserClick === 'function') {
      this.props.onNewUserClick()
    } else {
      this.props.history.push(`/admin/org/${this.props.organizationId}/employees/new`)
    }
  }

  render() {
    const { SingleColumnLayout, UserList } = this.componentDefs;
    const { classes } = this.props;
    const { skip, page = 1, pageSize = 25 } = this.state;
    const that = this;
    const onPageChange = (page) => {
      that.setState({ current_page: page });
    }

    return (
      <SingleColumnLayout style={{ maxWidth: 900, margin: 'auto' }}>
        <AppBar position="sticky" color="default" className={classes.toolbar}>
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
                onKeyPress={this.searchStringOnKeyPress}
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

            <Tooltip title={'Click to accept your selection'}>
              <IconButton color="inherit" onClick={this.props.onAcceptSelection}>
                <Icon>check</Icon>
              </IconButton>
            </Tooltip>

            <Tooltip title={`Click to add new employee`}>
              <IconButton color="inherit" onClick={this.onNewUserClick}>
                <Icon>add_circle_outline</Icon>
              </IconButton>
            </Tooltip>
            {this.state.businessUnitFilter ? <Tooltip title={`Filter By Business Unit`}>
              <IconButton color="inherit" onClick={this.onShowBusinessUnitFilter}>
                <Icon>filter</Icon>
              </IconButton>
            </Tooltip> : null}

            {this.props.allowDelete === true && this.props.selected.length > 0 &&
              <Tooltip title={`Click here to delete the ${this.props.selected.length > 1 ? `${this.props.selected.length} employees` : 'employee'} selected`}>
                <IconButton color="inherit" onClick={this.props.onDeleteUsersClick}>
                  <Icon>delete</Icon>
                </IconButton>
              </Tooltip>
            }
          </Toolbar>
        </AppBar>

        <UserList
          onUserSelect={this.props.onUserSelect}
          organizationId={this.props.organizationId}
          searchString={this.state.searchString}
          skip={skip === true}
          selected={this.props.selected}
          excluded={this.props.excluded}
          multiSelect={this.props.multiSelect === true || false}
          page={this.state.current_page || 1}
          pageSize={this.state.page_size || 25}
          onPageChange={onPageChange} />
      </SingleColumnLayout>
    )
  }

}

export const UserListWithSearchComponent = compose(
  withStyles(UserListWithSearch.Styles),
  withTheme,
  withApi,
  withRouter)(UserListWithSearch);


export default {
  UserListWithSearchComponent,
};