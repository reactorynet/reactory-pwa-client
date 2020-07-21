import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  Button
} from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';
import { withApi } from '../../api/ApiProvider';

class FreightRequestProductDetailsWidget extends Component {

  render() {

    debugger;

    let {
      api,
      componentFqn,
      componentProps,
      actions,
      childProps = {},
      formData,
      uiSchema,
      classes
    } = this.props;

    return (
      <div>
        <h1>THIS IS THE PRODUCT DETAIL COMPONENT</h1>
      </div>
    )
  }

  static styles = (theme) => {
    return {}
  }
}

const FreightRequestProductDetailsComponent = compose(withTheme, withApi, withStyles(FreightRequestProductDetailsWidget.styles))(FreightRequestProductDetailsWidget);

export default FreightRequestProductDetailsComponent;
