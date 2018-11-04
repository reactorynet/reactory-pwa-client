import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import compose from 'recompose/compose';
import { withApi, ReactoryApi } from '../../api/ApiProvider';
import StyledComponent from './StyledComponent'

class ApiComponent extends StyledComponent {
  
  render(){
    return (
      <Fragment>
        {this.props.children}
      </Fragment>
    )
  }
}

ApiComponent.propTypes = {
  reactory: PropTypes.func
}


export default ApiComponent = compose(withApi)(ApiComponent)