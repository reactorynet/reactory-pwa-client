import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import objectMapper from 'object-mapper'
import { pullAt, find, isString, isObject } from 'lodash'
import {
  FormControl,
} from '@material-ui/core';

import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
import * as utils from '../../util';

class UserWidgetWithSearch extends Component {
  
  static styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing.unit * 2,
    },
  });

  static propTypes = {
    formData: PropTypes.string,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    readOnly: PropTypes.bool,
    schema: PropTypes.object,
    uiSchema: PropTypes.object
  }

  static defaultProps = {
    formData: null,
    readOnly: false
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      modal: false,
      user: null
    };
    this.getModal = this.getModal.bind(this);
    this.componentDefs = props.api.getComponents(['core.Logo', 'core.UserWithQuery', 'core.FullScreenModal', 'core.UserListWithSearch', 'towerstone.SurveyDelegateWidget'])
  }

  getModal(){
    const { FullScreenModal, UserListWithSearch } = this.componentDefs;
    const closeModal = () => { 
      this.setState({modal: false});
      this.forceUpdate();
    }
    const { formContext, formData, onChange, uiSchema } = this.props;

    const userSelected = (user) => {
      this.setState({ user }, ()=>{
        onChange(user.id)
        closeModal()
      })
    };

    return (
      <FullScreenModal open={this.state.modal === true} onClose={closeModal} title="Employees">
        <UserListWithSearch 
          organizationId={formContext.organizationId}
          multiSelect={false}
          onUserSelect={userSelected}
          selected={formData ? [formData.id]:[]}
          businessUnitFilter={false}
          showFilters={false} />
      </FullScreenModal>
    )
  }

  render(){
    console.log('rendering User Widget with search');
    const self = this
    const { UserWithQuery, SurveyDelegateWidget } = this.componentDefs;
    const { formData, uiSchema } = this.props;

    const showModal = () => {      
      self.setState({ modal: !self.state.modal })
    }
    let userId = formData
    if(isObject(formData) && formData.id) userId = formData.id;

    const modal = this.getModal();    
    return (
      <Fragment> 
        {modal}
        <UserWithQuery userId={userId} onClick={showModal} />        
      </Fragment>
    )     
  }
}
const UserWidgetWithSearchComponent = compose(
  withApi,
  withTheme(),
  withStyles(UserWidgetWithSearch.styles)
  )(UserWidgetWithSearch)
export default UserWidgetWithSearchComponent
