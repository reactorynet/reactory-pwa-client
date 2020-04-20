import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { isArray, indexOf } from 'lodash';
import { compose } from 'recompose';
import { Icon } from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class LookupWidget extends Component {

  constructor(props, context) {
    super(props, context)

    this.state = {
      open: false,
    };

    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    this.setState({ open: !this.state.open });
  }

  render() {
    const {
      uiSchema,
      componentFqn,
      componentProps = {},
      componentPropertyMap = {},
      classes,
      api,
      formData
    } = this.props;
    const self = this;

    let label = '';
    let selectedValue = formData || '';
    let modalTitle = '';

    const FullScreenModal = api.getComponent('core.FullScreenModal');
    let ChildComponent = api.getComponent((componentFqn || uiSchema.props.componentFqn) || 'core.Loading');
    let componentFound = true;
    let childprops = {};
    let modalProps = {
      open: this.state.open === true,
      title: 'Lookup',
      slide: 'left',
      onClose: this.onClick
    };

    if (uiSchema) {
      const uiOptions = uiSchema['ui:options'];
      if (uiOptions && uiOptions.label) label = uiOptions.label;
      if (uiOptions && uiOptions.title) modalProps.title = uiOptions.title;
      if (uiOptions && uiOptions.modalProps) modalProps = { ...modalProps, ...uiOptions.modalProps };
    }

    if (ChildComponent === null || ChildComponent === undefined) {
      componentFound = false;
      ChildComponent = api.getComponent("core.NotFound");
      childprops = {
        message: `The component you specified ${componentFqn} could not be found`,
      };
    }

    if (componentProps && this.state.open === true && componentFound === true) {
      childprops = api.utils.objectMapper(this.props, componentPropertyMap);
    }

    return (
      <Fragment>
        <div onClick={this.onClick}>
          {label != '' && <label className={classes.label}>{label}</label>}
          <div className={classes.container}>
            {selectedValue == '' && <p className={classes.placeholder}>Search</p>}
            {selectedValue != '' && <p className={classes.value}>{selectedValue}</p>}
            <Icon color="primary">search</Icon>
          </div>
        </div>
        <FullScreenModal
          {...modalProps}>
          {this.state.open === true ? <ChildComponent {...{...componentProps, ...childprops}} /> : null}
        </FullScreenModal>
      </Fragment>
    );
  }
}

LookupWidget.propTypes = {};

LookupWidget.defaultProps = {};

LookupWidget.styles = (theme) => {
  return {
    container: {
      border: 'solid 1px #e2e0e0',
      borderRadius: '5px',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px'
    },
    label: {
      color: 'rgba(0, 0, 0, 0.54)',
      fontSize: '13px',
      paddingBottom: '3px'
    },
    placeholder: {
      color: '#bababa',
      margin: 0,
      fontSize: '16px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    value: {
      color: 'black',
      margin: 0,
      textTransform: 'uppercase',
      fontSize: '16px',
      fontSize: '16px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }
};

const LookupComponent = compose(withApi, withTheme, withStyles(LookupWidget.styles))(LookupWidget);
export default LookupComponent;

