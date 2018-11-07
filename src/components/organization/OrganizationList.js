import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router'
import { compose } from 'redux';
import gql from 'graphql-tag';
import { graphql, Query, Mutation } from 'react-apollo';
import Paper from '@material-ui/core/Paper';
import { intersection, remove } from 'lodash'
import { List, ListItem, ListItemText, Typography } from '@material-ui/core';
import { withApi } from '../../api/ApiProvider';

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
    if(intersection(this.state.selected, [organization.id]).length === 1){
      //deselect  
      this.setState({selected: remove(this.state.selected,organization.id)}, ()=>{
        if(this.props.onOrganizationClick) this.props.onOrganizationClick(organization, 'deselect');
        if(this.props.admin===true) this.props.history.push(`/admin/`);
      });
    } else {
      this.setState({selected: [organization.id]}, ()=>{
        if(this.props.onOrganizationClick) this.props.onOrganizationClick(organization, 'select');
        if(this.props.admin===true) this.props.history.push(`/admin/org/${organization.id}/general`);
      });
    }    
  }
 
  render(){
    const that = this;
    const { loading, error, allOrganizations } = this.props.data;
    const { match } = this.props;
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

    const organizationId = match.params.organizationId
        
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
          const organizationSelected = intersection(that.state.selected, [organization.id]).length === 1;
          return (
            <ListItem selected={organizationSelected === true || organization.id === organizationId} key={index} dense button onClick={selectOrganization}>              
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


const OrganizationLabelForId = ({ organizationId, api } ) => {
  return <Query query={gql`query OrganizationWithId($id: ObjID) {
    organizationWithId(id: $id)
    name
    logo
  }`} variables={{ id: organizationId }} options={{ name: 'organization' }}>
  {({ loading, data, error}, context) => {

    if(loading) return <p>loading organization</p>
    if(error) return <p>Error Occured Fetching Organization</p>

    return <Typography>{data.organization.name}</Typography>
  }}
  </Query>
}

export const OrganizationLabelForIdComponent = compose(withApi)(OrganizationLabelForId);

const organizationQuery = gql`
  query OrganizationQuery {
      allOrganizations {
        id
        code
        name
        logo
        avatar
        legacyId
        createdAt
        updatedAt
      }
  }
`;

export default compose(
  withRouter,
  graphql(organizationQuery))(OrganizationList);