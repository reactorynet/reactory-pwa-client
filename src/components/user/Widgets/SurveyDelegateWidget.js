import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {    
  CircularProgress,
  Icon,
  IconButton,
} from '@material-ui/core';
import { withTheme, withStyles } from '@material-ui/core/styles'
import { compose } from 'redux';
import { withApi, ReactoryApi } from '../../../api/ApiProvider';
import { UserListItem } from '../Lists';
import { User } from '../../../models';

class SurveyDelegateWidget extends Component {

  static propTypes = {
    api: PropTypes.instanceOf(ReactoryApi).isRequired,
    launched: PropTypes.bool.isRequired,
    invited: PropTypes.bool.isRequired,
    complete: PropTypes.bool.isRequired,
    user: PropTypes.instanceOf(User).isRequired,
    assessments: PropTypes.array
  };

  static defaultProps = {
    launched: false,
    invited: false,
    complete: false,
    user: null,
    assessments: [],
  };

  static styles = (theme) => {
    return {

    }
  };

  constructor(props, context){
    super(props, context)
    // this.componentDef = props.api.getComponents(['core.Loading'])
    this.state = {

    };

    this.getSecondaryAction = this.getSecondaryAction.bind(this);
  }

  getSecondaryAction(){
    return (<IconButton color="primary"><Icon>mail</Icon></IconButton>)
  }

  render(){
    const { api, user, classes } = this.props;
    // <UserListItem user={user} secondaryAction={this.getSecondaryAction()} />    
    return (
      <Fragment>
        <p>Boop</p>        
      </Fragment>
    )
  }
}

export const SurveyDelegateComponent = compose(withApi, withTheme, withStyles(SurveyDelegateWidget.styles))(SurveyDelegateWidget);
export default {
  SurveyDelegateComponent
}