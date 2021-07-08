import React, { Component } from 'react';
import PropTypes from 'prop-types';
import om from 'object-mapper';
import { withRouter } from 'react-router';
import classnames from 'classnames';
import gql from 'graphql-tag';
import { compose } from 'redux';
import { graphql } from '@apollo/client';
import { Query, Mutation } from '@apollo/client/react/components';
import { withApollo } from '@apollo/client/react/hoc';
import { intersection, isEqualWith } from 'lodash';
import {
  Avatar,
  Chip,
  Checkbox,
  Button,
  FormControl,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListSubheader,
  InputLabel,
  Input,
  Icon,
  InputAdornment,
  IconButton,
  Grid,
  Paper,
  Menu,
  TextField,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { DataGrid, ColDef, ValueGetterParams } from '@material-ui/data-grid';

import {
  Visibility,
  VisibilityOff,
  Search as SearchIcon
} from '@material-ui/icons'
import classNames from 'classnames';
import AddCircleIcon from '@material-ui/icons/AddCircle'
import DetailIcon from '@material-ui/icons/Details'
import { withTheme, withStyles } from '@material-ui/core/styles';
import { isArray, isNil, isFunction, sortedUniqBy, uniq, filter } from 'lodash';
import moment from 'moment';
import { ReactoryFormComponent } from '../reactory/ReactoryFormComponent';
import { TableFooter } from '@material-ui/core/Table';
import { withApi } from '../../api/ApiProvider';
import { ReactoryApi } from "../../api/ReactoryApi";
import DefaultAvatar from '../../assets/images/profile/default.png';
import Profile from './Profile';
import Message from '../message'
import { omitDeep, getAvatar, CenteredContainer } from '../util';
import styles from '../shared/styles'
const UserSearchInputStyles = theme => {
  return {

  }
}

const UserSearchInput = (props, context) => {

  const { classes, value } = props;
  const nilf = () => ({});

  return (
    <FormControl>
      <InputLabel htmlFor={props.id || 'user-search-control'}>Search User</InputLabel>
      <Input
        id={props.id || 'user-search-control'}
        type={'text'}
        value={value}
        fullWidth
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              aria-label="Search for user"
              onClick={props.onSearch || nilf}
            >
              <SearchIcon />
            </IconButton>
          </InputAdornment>
        }
      />
    </FormControl>
  )
}

export const UserSearchInputComponent = compose(
  withTheme,
  withStyles(UserSearchInputStyles)
)(UserSearchInput)

/**
 * List component for user entries
 * @param {*} param0
 */
class UserTable extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      selected: [],
      newUser: {
        email: '',
        firstName: '',
        lastName: '',
        mobileNumber: ''
      }
    }

    this.onMobileNumberChanged = this.onMobileNumberChanged.bind(this);
    this.onEmailChanged = this.onEmailChanged.bind(this);
    this.onFirstNameChanged = this.onFirstNameChanged.bind(this);
    this.onLastNameChanged = this.onLastNameChanged.bind(this);
    this.onCreateEmployee = this.onCreateEmployee.bind(this);
  }

  static propTypes = {
    organizationId: PropTypes.string
  };

  onViewDetails = (userId) => this.setState({ viewDetailsForUser: userId });
  onEmailChanged = (evt) => this.setState({ newUser: { ...this.state.newUser, email: evt.target.value } })
  onMobileNumberChanged = (evt) => this.setState({ newUser: { ...this.state.newUser, mobileNumber: evt.target.value } })
  onFirstNameChanged = (evt) => this.setState({ newUser: { ...this.state.newUser, firstName: evt.target.value } })
  onLastNameChanged = (evt) => this.setState({ newUser: { ...this.state.newUser, lastName: evt.target.value } })
  onCreateEmployee = (evt) => {
    const { client, organizationId } = this.props;
    const { newUser } = this.state;

  }

  render() {
    const that = this;
    const { loading, error, allUsers } = this.props.data;
    const { email, firstName, lastName, mobileNumber } = this.state;
    const { onViewDetails } = this
    if (loading === true) {
      return <p>Loading ...</p>;
    }

    if (error) {
      return <p>{error.message}</p>;
    }

    const isSelected = (index) => {
      return this.state.selected.indexOf(index) !== -1;
    }

    const handleRowSelection = (selectedRows) => {
      this.setState({
        selected: selectedRows
      });
    }

    let users = allUsers || []
    return (
      <Table onRowSelection={this.handleRowSelection}>
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Firstname</TableCell>
            <TableCell>Lastname</TableCell>
            <TableCell>&nbsp;</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user, index) => {

            const selectUser = () => {
              onViewDetails(user.id);
            };

            return (
              <TableRow selected={isSelected(index)}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.firstName}</TableCell>
                <TableCell>{user.lastName}</TableCell>
                <TableCell><Button onClick={selectUser}><DetailIcon /></Button></TableCell>
              </TableRow>)
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell><TextField fullWidth value={email} placeholder="Email address" name="email" onChange={this.onEmailChanged} /></TableCell>
            <TableCell><TextField fullWidth value={firstName} placeholder="Firstname" name="firstName" onChange={this.onFirstNameChanged} /></TableCell>
            <TableCell><TextField fullWidth value={lastName} placeholder="Lastname" name="lastName" onChange={this.onLastNameChanged} /></TableCell>
            <TableCell><Button onClick={this.onCreateEmployee}><AddCircleIcon />ADD</Button></TableCell>
          </TableRow>
        </TableFooter>
      </Table>);
  }

};

export const CreateProfile = compose(
  withApi
)((props) => {
  const {
    api, organizationId,
    profile, onCancel,
    onSave, profileTitle,
    withPeers = false, withAvatar = false,
    withMembership = false, onUserCreated = () => { },
    firstNameHelperText,
    surnameHelperText,
    emailHelperText, formProps = {}, reactory } = props;

  //we update the cache with the server response
  const updateCache = (cache, { data }) => {
    //console.log('Updating cache with user create response', data);


    try {
      const { CoreUsersForOrganization } = cache.readQuery({ query: api.queries.Users.usersForOrganization, variables: { id: organizationId } })

      cache.writeQuery({
        query: api.queries.Users.usersForOrganization,
        data: { CoreUsersForOrganization: [...CoreUsersForOrganization, data.createUser] },
        variables: { id: organizationId }
      });
    } catch (cacheError) {
      console.error("Could not update cache.", cacheError)
    }


    //console.log("Cache has been updaterated");
    onUserCreated(data.createUser);
  };

  const mutationText = reactory.utils.gql(`
  mutation CreateUserMutation($input: CreateUserInput!, $organizationId: String!){
    createUser(input: $input, organizationId: $organizationId){
      id
      firstName
      lastName
      avatar
      lastLogin
    }
  }
`);

  return (
    <Mutation mutation={mutationText} update={updateCache}>
      {(createUser, { loading, error, data }) => {
        let props = {
          loading,
          error,
          profile: profile,
          profileTitle,
          mode: 'admin',
          isNew: true,
          withPeers,
          withAvatar,
          withMembership,
          onCancel,
          firstNameHelperText,
          surnameHelperText,
          emailHelperText,
          ...formProps,
          onSave: (profileData) => {
            createUser({
              variables: { input: omitDeep(profileData, '__isnew'), organizationId }
            });
          }
        }

        if (loading) return "Creating user, please wait"
        if (error) {
          if (error.message) {
            reactory.createNotification('Could not create the user', { type: 'error', canDismiss: true, showInAppNotifcation: true })
          }
          return error.message
        }
        if (data && data.createUser) {
          const { firstName, lastName } = data.createUser;
          reactory.createNotification(`Created user ${firstName} ${lastName}`, { type: 'success', canDismiss: true, showInAppNotifcation: true });
        }

        return <Profile {...props} />
      }}
    </Mutation>
  )
})


export const EditProfile = compose(
  withApi
)((props) => {
  const { api, organizationId, surveyId, profile, onCancel, withPeers, profileTitle, mode, headerComponents, footerComponents, refetch } = props
  return (
    <Mutation mutation={api.mutations.Users.updateUser} >
      {(updateUser, { loading, error, data }) => {
        let _props = {
          loading,
          error,
          profile,
          withPeers,
          mode,
          isNew: false,
          onCancel,
          profileTitle,
          organizationId,
          surveyId,
          footerComponents,
          headerComponents,
          refetch,
          onSave: (profileData) => {
            let profileDataInput = omitDeep(profileData);
            delete profileDataInput.peers
            updateUser({
              variables: {
                id: profile.id,
                profileData: profileDataInput,
              },
              refetchQueries: [{ query: api.queries.System.apiStatus, options: { fetchPolicy: 'network-only' } }]
            });
          }
        }

        if (loading) return (<p>Updating... please wait</p>)
        if (error) return (<p>{error.message}</p>)

        return <Profile {..._props} />
      }}
    </Mutation>
  )
})

export const UserProfile = compose(
  withApi,
  withRouter,
)((props) => {
  const { api, location, profileId, organizationId, match, withPeers, profileTitle, mode } = props
  let pid = null;
  pid = isNil(profileId) === false ? profileId : match.params.profileId;
  if (isNil(pid) === true) pid = api.getUser() ? api.getUser().id : null;
  if (isNil(pid) === true) return <Typography variant="h6" value="No profile id" />

  return (
    <Query query={api.queries.Users.userProfile} variables={{ profileId: pid }} >
      {(queryProps, context) => {
        const { loading, error, data, refetch } = queryProps;

        if (loading) return <p>Loading User Profile, please wait...</p>
        if (error) return <p>{error.message}</p>

        if (data.userWithId) {
          let profileProps = { ...props, profile: { ...data.userWithId }, refetch }
          return <EditProfile  {...profileProps} />
        } else {
          return <p>No user data available</p>
        }
      }}
    </Query>)
});

export const UserWithQuery = compose(
  withApi,
  withRouter
)((props) => {
  const { api, location, userId, organizationId, match, componentFqn, UserWidget, onClick } = props
  let Component = UserListItem
  if (componentFqn) Component = api.getComponent(componentFqn);
  if (UserWidget) Component = UserWidget

  const skip = userId === null;
  return (
    <Query query={api.queries.Users.userProfile} variables={{ profileId: userId }} skip={skip}>
      {(props, context) => {
        const { loading, error, data } = props;

        if (skip === false) {
          if (loading) return <p>Fetching user details...</p>
          if (error) return <p>{error.message}</p>
          if (data.userWithId) {
            const componentProps = {
              ...props,
              user: data.userWithId,
              onClick
            };

            return <Component {...componentProps} />
          } else {
            return <Component {...props} />
          }
        } else {
          return <Component {...props} onClick={onClick} />
        }

      }}
    </Query>)
});


export const UserListItem = (props) => {
  const { user, selected, key, onClick, message, withTheme } = props;
  if (!user) {
    return (<ListItem button onClick={onClick} key={key}>
      <Avatar alt={"No user avaialble"} src={getAvatar(user)} style={{ marginRight: '8px' }} />
      <ListItemText primary={"None"} secondary={"User not set"} />
    </ListItem>)
  }

  const displayText = `${user.firstName} ${user.lastName}`;
  const hasMessage = typeof message === 'string';
  return (
    <ListItem selected={selected} onClick={onClick} key={key}>
      <Avatar alt={displayText} src={getAvatar(user)} style={{ marginRight: '8px' }} />
      <ListItemText primary={user.__isnew ? 'NEW' : displayText} secondary={hasMessage === true ? message : user.email} />
    </ListItem>
  )
}



class Inbox extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      selected: null
    };
    this.onItemSelect = this.onItemSelect.bind(this);
  }

  static styles = (theme) => {
    return {
      ListPane: {
        maxHeight: '400px',
        overflowY: 'scroll'
      },
      PreviewPane: {
        margin: `${theme.spacing(1)}px`,
        padding: `${theme.spacing(1)}px`,
      },
      PreviewBody: {
        outline: '1px solid black',
        display: 'block',
        width: '100%',
        overflow: 'scroll',
      }
    };
  }

  onItemSelect(index) {
    this.setState({ selected: index });
  }

  render() {
    const that = this;
    const { selected } = this.state;
    const { classes } = this.props;

    const listProps = {
      item: true,
      xs: 12,
      md: 3,
      lg: 3,
    };

    const viewProps = {
      item: true,
      xs: 12,
      md: 9,
      lg: 9
    };

    let viewPane = null;
    if (isNil(selected) === false) {
      const message = this.props.messages[selected];
      viewPane = (
        <Grid {...viewProps}>
          <Paper className={classes.PreviewPane}>
            <Typography variant="h6">{message.subject}</Typography><br />
            <Typography className={classes.PreviewBody} variant="body1" dangerouslySetInnerHTML={{ __html: message.message }}></Typography>
          </Paper>
        </Grid>);
    } else {
      viewPane = (<Grid {...viewProps}>
        <Paper className={classes.PreviewPane}>
          <Typography variant="h6">Select a message to view</Typography>
        </Paper>
      </Grid>);
    }

    return (
      <CenteredContainer>
        <Grid container>
          <Grid {...listProps}>
            <List>
              {this.props.messages.map((message, index) => {
                if (message && message.from) {
                  return (
                    <ListItem onClick={() => (this.onItemSelect(index))} dense button key={index}>
                      <Avatar>{message.from.substring(0, 1).toUpperCase()}</Avatar>
                      <ListItemText primary={`${message.from} ${moment(message.sentAt || message.sendAfter).format('DD MMM YY')}`} secondary={message.subject} />
                      <div>
                        <IconButton>
                          <Icon>delete</Icon>
                        </IconButton>
                      </div>
                    </ListItem>)
                }
              }
              )}
            </List>
          </Grid>
          {viewPane}
        </Grid>
      </CenteredContainer>
    );
  }
}

export const ThemedInbox = compose(withTheme, withStyles(Inbox.styles))(Inbox);

export const UserInbox = compose(withApi)(({ api, via = 'local', display = 'default', filter = '' }) => (
  <Query query={api.queries.Users.userInbox} variables={{ order: 'asc', via }}>
    {(props, context) => {
      const { loading, error, data } = props;
      if (loading === true) return <p>Loading emails</p>
      if (error) return <p>{error.message}</p>
      return (
        <ThemedInbox {...props} messages={data.userInbox || []} />
      )
    }}
  </Query>));


const UserList = ({
  organizationId,
  api, onUserSelect, searchString,
  selected, multiSelect, excluded = [],
  secondaryAction = null,
  classes, graphql = null,
  formContext, page = 1, pageSize = 25, onPageChange = () => { } }) => {
  const queryText = graphql && graphql.text ? graphql.text : api.queries.Users.usersForOrganization;
  const variables = graphql && graphql.variables ? om(formContext, graphql.variables) : { id: organizationId, searchString };
  const Components = api.getComponents(['material-ui.Material']);

  const { MaterialLab } = Components.Material;

  const columns = [
    {field: 'firstName', headerName: 'First Name', width: 250},
    {field: 'lastName', headerName: 'Last Name', width: 250},
    {field: 'email', headerName: 'Email', width: 250},
  ]
  return (
    <Query query={queryText} variables={{ id: organizationId, searchString, paging: { page, pageSize } }}>
      {(result, info) => {
        const { loading, errors, data, called } = result;


        try {

          if (called === false) return (<Typography>💤</Typography>)
          if (loading === true) return (<Typography>Loading</Typography>)
          if (errors && errors.length > 0) return (<Typography>The api server reported an error. 💥</Typography>)

          const newUser = {
            firstName: '',
            lastName: '',
            email: '',
            mobileNumber: '',
            avatar: DefaultAvatar,
            businessUnit: null,
            peers: [],
            surveys: [],
            teams: [],
            __isnew: true
          }

          if (data && data.CoreUsersForOrganization) {
            const { users, paging } = data.CoreUsersForOrganization;
            const availableAlphabet = uniq(sortedUniqBy(users, u => u.firstName.substring(0, 1).toUpperCase()).map(user => user.firstName.substring(0, 1).toUpperCase()));

            const onPageChanged = (evt, page) => {
              if (onPageChange) {
                onPageChange(page);
              }
            }

            let pageCount = Math.floor((paging.total / (paging.pageSize || 25)));

            if ((pageCount * (paging.pageSize || 25) < paging.total)) pageCount += 1;

            debugger
            return (
              <React.Fragment>
                <div style={{ height: 400, width: '100%'}}>
                  <DataGrid rows={[...users]} columns={columns} checkboxSelection >
                  <MaterialLab.Pagination count={pageCount} page={paging.page} onChange={onPageChanged} shape="rounded" />
                  </DataGrid>
                </div>
                <List subheader={<li />}>
                  {
                    availableAlphabet.map((letter, index) => {
                      return (
                        <li key={letter} className={classes && classes.userListSubheader ? classes.userListSubheader : ''}>
                          <ul>
                            <ListSubheader>{letter}</ListSubheader>
                            {
                              filter(users, user => user.firstName.substring(0, 1).toUpperCase() === letter).map((user, uid) => {
                                const raiseUserSelected = () => {
                                  if (onUserSelect) onUserSelect(user, uid)
                                }

                                const raiseUserChecked = () => {
                                  if (onUserSelect) onUserSelect(user, uid, { toggle: true })
                                }


                                const nilf = () => { };


                                const isSelected = intersection(selected, [user.id]).length === 1;
                                const exclude = intersection(excluded, [user.id]).length === 1;
                                const displayText = `${user.firstName} ${user.lastName}`;

                                if (exclude === true) return null;

                                return (
                                  <ListItem selected={isSelected} onClick={multiSelect === false ? raiseUserSelected : nilf} dense button key={uid}>
                                    <Avatar alt={displayText} src={getAvatar(user)} onClick={raiseUserSelected} style={{ marginRight: '20px' }} />
                                    <ListItemText primary={user.__isnew ? 'NEW' : displayText} secondary={user.__isnew ? 'Click here to add a new user / employee' : user.email} />
                                    {multiSelect === true ?
                                      <Checkbox
                                        checked={isSelected}
                                        tabIndex={-1}
                                        disableRipple
                                        onClick={raiseUserChecked}
                                      /> : null}
                                    {isFunction(secondaryAction) === true ?
                                      secondaryAction(user) :
                                      secondaryAction}
                                  </ListItem>
                                )
                              })
                            }
                          </ul>
                        </li>
                      );
                    })
                  }
                </List>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <MaterialLab.Pagination count={pageCount} page={paging.page} onChange={onPageChanged} shape="rounded" />
                </div>
              </React.Fragment>
            )
          }

          return <div>No users</div>
        } catch (err) {

          return (<div>{err.message}</div>)
        }
      }}
    </Query>);
}

UserList.propTypes = {
  organizationId: PropTypes.string,
  data: PropTypes.object,
  api: PropTypes.instanceOf(ReactoryApi).isRequired
}

UserList.defaultProps = {
  organizationId: null,
  data: {
    loading: true,
    error: null,
    CoreUsersForOrganization: []
  }
};


export const UserListWithData = compose(
  withTheme,
  withApi
)(UserList);


export const ForgotForm = require('./Forms').ForgotForm;
export const ResetPasswordForm = require('./Forms').ResetPasswordForm;


class Logout extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      done: false,
    }
  }

  componentDidMount() {
    this.props.api.logout()
    this.props.api.status().then((status) => {
      this.props.history.push('/login')
    }).catch(e => {
      //console.log('error logging out', e)
      this.props.history.push('/login')
    })
  }

  render() {
    if (this.state.done === false) return <Typography>Signing out...</Typography>

    return <Typography>Signing out...done</Typography>
  }
}

export const LogoutComponent = compose(
  withTheme,
  withApi,
  withRouter,
)(Logout)


