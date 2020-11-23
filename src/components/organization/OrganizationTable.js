import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gql  } from '@apollo/client';
import { Query } from '@apollo/client/react/components'
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@material-ui/core';


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


/**
 * List component for user entries
 * @param {*} param0 
 */
export default class OrganizationTable extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      selected: [],      
    }
  }
 
  render(){
    const that = this;

    <Query query={ organizationQuery }>
      {({ loading, data, error }, context) => { 
        const { allOrganizations } = data;

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
          that.setState({
            selected: selectedRows
          });
        }
    
        return (
          <Table onRowSelection={handleRowSelection}>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Logo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
            {allOrganizations.map( (organization, index) => {    
              return (
                <TableRow selected={isSelected(index)}>
                <TableCell>{organization.code}</TableCell>
                <TableCell>{organization.name}</TableCell>
                <TableCell>{organization.logo}</TableCell>
              </TableRow>)}) }        
            </TableBody>
          </Table>);
      }}
    </Query>    
  }  
};


