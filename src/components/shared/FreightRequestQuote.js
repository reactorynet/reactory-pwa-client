import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Icon, Typography, Fab } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme } from '@material-ui/styles';
import { withApi } from '../../api/ApiProvider';
import { ReactoryApi } from "../../api/ReactoryApi";

class FreightRequestQuoteWidget extends Component {

  constructor(props, context) {
    super(props, context);

    this.state = {
      open: false,
    };
  }

  render() {
    let _props = { ...this.props };
    let { formData, uiSchema } = _props;
    let isFormWidget = false;

    if (formData && uiSchema) { isFormWidget = true; }

    if (isFormWidget && uiSchema["ui:options"]) {
      const uiOptions = uiSchema["ui:options"];
      if (uiOptions.props) {
        _props = { ..._props, ...uiOptions.props }
      }
    };


    let {
      api,
      componentFqn,
      buttonTitle,
      windowTitle,
      buttonVariant,
      buttonIcon,
      buttonProps = {},
      componentProps,
      actions,
      childProps = {}
    } = _props;


    const tpl = (format) => {
      try {
        return api.utils.template(format)(this.props);
      }
      catch (templateError) {
        return `Bad Template ${templateError.message}`;
      }
    }

    let ChildComponent = api.getComponent(componentFqn || 'core.Loading');
    let componentFound = true;
    let childprops = { ...childProps };

    if (ChildComponent === null || ChildComponent === undefined) {
      componentFound = false;
      ChildComponent = api.getComponent("core.NotFound");
      childprops = {
        message: `The component you specified ${componentFqn} could not be found`,
      };
    }

    if (componentProps && this.state.open === true && componentFound === true) {
      childprops = { ...childprops, ...api.utils.objectMapper(this.props, componentProps) };
    }

    return (
      <Fragment>
        <h1>THIS IS THE FREIGHT REQUEST COMPONENT</h1>
      </Fragment>
    )
  }
}

const FreightRequestQuoteComponent = compose(withTheme, withApi)(FreightRequestQuoteWidget);

FreightRequestQuoteComponent.propTypes = {
  api: PropTypes.instanceOf(ReactoryApi).isRequired,
  componentFqn: PropTypes.string,
  componentProps: PropTypes.object,
};

FreightRequestQuoteComponent.defaultProps = {};

export default FreightRequestQuoteComponent;
