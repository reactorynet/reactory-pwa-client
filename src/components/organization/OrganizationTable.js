import React, { Component } from 'react';
import PropTypes from 'prop-types';
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
class OrganizationTable extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      selected: [],      
    }
  }
 
  render(){
    const that = this;
    const { loading, error, allOrganizations } = this.props.data;

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
            <TableHeaderColumn>Code</TableHeaderColumn>
            <TableHeaderColumn>Name</TableHeaderColumn>
            <TableHeaderColumn>Logo</TableHeaderColumn>
          </TableRow>
        </TableHeader>
        <TableBody>
        {allOrganizations.map( (organization, index) => {    
          return (
            <TableRow selected={isSelected(index)}>
            <TableRowColumn>{organization.code}</TableRowColumn>
            <TableRowColumn>{organization.name}</TableRowColumn>
            <TableRowColumn>{organization.logo}</TableRowColumn>
          </TableRow>)}) }        
        </TableBody>
      </Table>);
  }  
};

const organizationQuery = gql`
query OrganizationQuery {
    allOrganizations {
      id
      code
      name
      legacyId
      createdAt
      updatedAt
    }
}
`;

export default graphql(organizationQuery)(OrganizationTable);