import React, { Fragment, Component } from 'react'
import PropTypes from 'prop-types'
import { pullAt, find } from 'lodash'
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
    };
    this.getModal = this.getModal.bind(this);
    this.componentDefs = props.api.getComponents(['core.Logo', 'core.UserListItem', 'core.FullScreenModal', 'core.UserListWithSearch'])
  }

  getModal(){
    const { FullScreenModal, UserListWithSearch } = this.componentDefs;
    const closeModal = () => { 
      this.setState({modal: false});
      this.forceUpdate();
    }
    const { formContext, formData } = this.props;
    const userSelected = (user) => {
      console.log('user selected', user);
    };

    return (
      <FullScreenModal open={this.state.modal === true} onClose={closeModal}>
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
    const { UserListItem } = this.componentDefs;
    const { formData, uiSchema } = this.props;

    const showModal = () => {
      console.log('show user modal')
      self.setState({ modal: !self.state.modal })
    }

    const modal = this.getModal();

    return (
      <Fragment> 
        {modal}
        <UserListItem user={formData} onClick={showModal}/>         
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
