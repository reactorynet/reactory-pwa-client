import React, { Component } from 'react';
import gql from 'graphql-tag';
import { graphql } from 'react-apollo';
import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table';

/**
 * List component for user entries
 * @param {*} param0 
 */
class OrganizationList extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      selected: []  
    }
  }


  render(){
    const that = this;
    const { loading, error, allUsers } = this.props.data;

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

    return (
      <Table onRowSelection={handleRowSelection}>
        <TableHeader>
          <TableRow>
            <TableHeaderColumn>Email</TableHeaderColumn>
            <TableHeaderColumn>Firstname</TableHeaderColumn>
            <TableHeaderColumn>Lastname</TableHeaderColumn>
          </TableRow>
        </TableHeader>
        <TableBody>
        {allUsers.map( (user, index) => {    
          return (
            <TableRow selected={isSelected(index)}>
            <TableRowColumn>{user.email}</TableRowColumn>
            <TableRowColumn>{user.firstName}</TableRowColumn>
            <TableRowColumn>{user.lastName}</TableRowColumn>
          </TableRow>)}) }        
        </TableBody>
      </Table>);
  }  
};


const userListQuery = gql`
query UserListQuery {
    allUsers {
      id
      username
      email
      firstName
      lastName
      legacyId
    }
}
`;

export const UserListWithData = graphql(userListQuery)(UserList);