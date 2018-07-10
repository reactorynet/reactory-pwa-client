import React, { Component } from 'react';
import PropTypes from 'prop-types';
import gql from 'graphql-tag';
import { compose } from 'redux';
import { graphql, withApollo, Query, Mutation } from 'react-apollo';
import {
  Avatar,
  Button,
  FormControl,
  List,
  ListItem,
  ListItemText,
  InputLabel,
  Input,
  InputAdornment,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableHead,  
  TableRow,
  TableCell,
} from 'material-ui';

import {
  Visibility, 
  VisibilityOff,
  Search as SearchIcon
} from 'material-ui-icons'
import classNames from 'classnames';
import AddCircleIcon from 'material-ui-icons/AddCircle'
import DetailIcon from 'material-ui-icons/Details'
import { withTheme, withStyles } from 'material-ui/styles';
import { isArray } from 'lodash'
import { TableFooter } from 'material-ui/Table';
import { withApi, ReactoryApi } from '../../api/ApiProvider';
import DefaultAvatar from '../../assets/images/profile/default.png';
import Profile from './Profile'
import { omitDeep } from '../util';

const UserSearchInputStyles = theme => {
  return {

  }
}

const UserSearchInput = (props, context) => {

  const { classes, value } = props;
  const nilf = () => ({});

  return (
    <FormControl className={classNames(classes.margin, classes.textField)}>
        <InputLabel htmlFor={props.id || 'user-search-control'}>Search User</InputLabel>
        <Input
          id={props.id || 'user-search-control'}
          type={'text'}
          value={value}
          onChange={props.onChange || nilf}
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
  withTheme(),
  withStyles(UserSearchInputStyles)
)(UserSearchInput)

/**
 * List component for user entries
 * @param {*} param0 
 */
class UserTable extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      selected: [],
      newUser: {
        email: '',
        firstName: '',
        lastName: ''
      }  
    }

    this.onEmailChanged = this.onEmailChanged.bind(this);
    this.onFirstNameChanged = this.onFirstNameChanged.bind(this);
    this.onLastNameChanged = this.onLastNameChanged.bind(this);
    this.onCreateEmployee = this.onCreateEmployee.bind(this);
  }

  static propTypes = {
    organizationId: PropTypes.string
  };

  onViewDetails = (userId) => this.setState({ viewDetailsForUser:  userId });
  onEmailChanged = (evt) => this.setState({ newUser: {...this.state.newUser, email: evt.target.value}})
  onFirstNameChanged = (evt) => this.setState({ newUser: {...this.state.newUser, firstName: evt.target.value}})
  onLastNameChanged = (evt) => this.setState({ newUser: {...this.state.newUser, lastName: evt.target.value}})
  onCreateEmployee = (evt) => {
    const { client, organizationId } = this.props;
    const { newUser } = this.state;    
    
  }

  render(){
    const that = this;
    const { loading, error, allUsers } = this.props.data;
    const { email, firstName, lastName } = this.state;
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
        { users.map( (user, index) => {

          const selectUser = () => {
            onViewDetails(user.id);
          };

          return (
            <TableRow selected={isSelected(index)}>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.firstName}</TableCell>
            <TableCell>{user.lastName}</TableCell>
            <TableCell><Button onClick={selectUser}><DetailIcon /></Button></TableCell>
          </TableRow>)}) }        
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
  const { api, organizationId, profile, onCancel, onSave } = props

  const updateCache = (cache, { data: { createUser } }) => {
    const { usersForOrganizationWithId } = cache.readQuery({ query: api.queries.Users.usersForOrganization, variables: { id: organizationId } })
    cache.writeQuery({
      query: api.queries.Users.usersForOrganization,
      data: { usersForOrganizationWithId: [...usersForOrganizationWithId, createUser ] },
      variables: { id: organizationId }
    });
  };

  return (
    <Mutation mutation={api.mutations.Users.createUser} update={updateCache}>
      {(createUser, { loading, error, data }) => {
        let props = {
          loading,
          error,
          profile: profile,
          mode: 'admin',
          isNew: true,
          onCancel,
          onSave: (profileData) => {            
            createUser({
              variables: {input: omitDeep(profileData, '__isnew'), organizationId }
            });
          }
        }

        if(loading) return "Updating please wait"
        if(error) return error.message        
        return <Profile {...props}/>
      }}
    </Mutation>
  )
})


export const EditProfile = compose(
  withApi
)((props) => {
  const { api, organizationId, profile, onCancel } = props  
  return (
    <Mutation mutation={api.mutations.Users.updateUser} >
      {(updateUser, { loading, error, data }) => {
        let props = {
          loading,
          error,
          profile,
          mode: 'admin',
          isNew: false,
          onCancel,
          onSave: (profileData) => {
            console.log('User being saved', profileData)
            updateUser({
              variables: { 
                input: omitDeep(profileData),
              }
            });
          }
        }
        return <Profile {...props} />
      }}
    </Mutation>
  )
})


const UserListItem = (props) => {
  const { user, selected, key, onClick } = props
  const displayText = `${user.firstName} ${user.lastName}`
  return (
    <ListItem onClick={onClick} key={key}>
      <Avatar alt={displayText} src={user.avatar || DefaultAvatar} />
      <ListItemText primary={ user.__isnew ? 'NEW' : displayText} secondary={ user.__isnew ? 'Click here to add a new user / employee' : user.email}/>
    </ListItem>
  )
}

const UserList = ({organizationId, api, onUserSelect}) => {  
  return (
    <Query query={api.queries.Users.usersForOrganization} variables={{ id: organizationId }}>
      {({ loading, error, data } ) => {
        if(loading === true) return "Loading"
        if(error) return error.message
        const newUser = {
          firstName: '',
          lastName: '',
          email: '',
          avatar: DefaultAvatar,
          peers: [],
          surveys: [],
          teams: [],
          __isnew: true
        }
        const users = data.usersForOrganizationWithId || []
        const raiseNewUserSelect = () => {
          if(onUserSelect) onUserSelect(newUser)
        }
        return (
          <List>
            {users.map((user, uid) => {
              const raiseUserSelected = () => {
                if(onUserSelect) onUserSelect(user, uid)
              }              
              const displayText = `${user.firstName} ${user.lastName}`
              return (
                <ListItem onClick={raiseUserSelected} dense button key={uid}>
                  <Avatar alt={displayText} src={user.avatar || DefaultAvatar} />
                  <ListItemText primary={ user.__isnew ? 'NEW' : displayText} secondary={ user.__isnew ? 'Click here to add a new user / employee' : user.email}/>
                </ListItem>
              )
            })}
            <ListItem onClick={raiseNewUserSelect} dense button key={users.length+1}>
              <Avatar alt={'New user'} src={ newUser.avatar } />
              <ListItemText primary={ 'NEW' } secondary={ 'Click here to add a new user / employee' }/>
            </ListItem>
          </List>
        )
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
    usersForOrganizationWithId: []
  }
};

 
export const UserListWithData = compose(
  withTheme(),
  withApi
)(UserList);






