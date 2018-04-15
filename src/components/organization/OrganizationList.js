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
import { List, ListItem, ListItemText } from 'material-ui';

/**
 * List component for user entries
 * @param {*} param0 
 */
class OrganizationList extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      selected: [],      
    }

    this.handleOrganizationSelect = this.handleOrganizationSelect.bind(this);
  }
  
  handleOrganizationSelect(organization){
    if(this.props.onOrganizationClick) this.props.onOrganizationClick(organization);
  }
 
  render(){
    const that = this;
    const { loading, error, allOrganizations } = this.props.data;

    if (loading === true) {
      return <p>Fetching organizations ...</p>;
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
      <List>
        {allOrganizations.map( (organization, index) => {    
          const selectOrganization = () => {
            that.handleOrganizationSelect(organization);
          }
          return (
            <ListItem key={index} dense button onClick={selectOrganization}>              
              <ListItemText primary={organization.name} />
            </ListItem>)}) }              
      </List>);
  }  
};

OrganizationList.propTypes = {
  organizations: PropTypes.object,
  onOrganizationClick: PropTypes.func
};

OrganizationList.defaultProps = {

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

export default graphql(organizationQuery)(OrganizationList);