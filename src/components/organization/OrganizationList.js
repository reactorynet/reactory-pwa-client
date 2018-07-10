import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router'
import { compose } from 'redux';
import gql from 'graphql-tag';
import { graphql } from 'react-apollo';
import Paper from 'material-ui/Paper';
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
    if(this.props.admin===true) this.props.history.push(`/admin/org/${organization.id}/general`);
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

    let newOrganizationLink = null;
    if(this.props.newOrganizationLink === true){
      const selectNewLinkClick = () => { that.handleOrganizationSelect({id: 'new', name: 'NEW'}) };
      newOrganizationLink = (
        <ListItem key={-1} dense button onClick={selectNewLinkClick}>              
            <ListItemText primary={'NEW ORGANIZATION'} secondary='Click here to create a new organization' />
        </ListItem>)
    }

    const list = (
      <List>
        {newOrganizationLink}
        {allOrganizations.map( (organization, index) => {    
          const selectOrganization = () => {
            that.handleOrganizationSelect(organization);
          }
          return (
            <ListItem key={index} dense button onClick={selectOrganization}>              
              <ListItemText primary={organization.name} />
            </ListItem>)}) }              
      </List>);

    let component = null;
    if(this.props.wrapper === true) {
      component = (<Paper>
        {list}
      </Paper>)
    } else component = list;

    return component;
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

export default compose(
  withRouter,
  graphql(organizationQuery))(OrganizationList);