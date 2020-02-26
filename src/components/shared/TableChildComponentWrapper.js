import React, { Component, Fragment } from 'react';
import { compose } from 'recompose';
import { isString } from 'lodash';
import { Typography } from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class TableChildWrapper extends Component {

  render() {
    const { props } = this;
    const { api, component } = props;
    let ComponentToMount = (<Typography>Wrapped Component Loading {component.componentFqn}</Typography>);

    if (component && isString(component.componentFqn) === true) {
      ComponentToMount = api.getComponent(component.componentFqn);
    }    
    let mappedProps = api.utils.objectMapper(props, component.propsMap || {});    
    let componentProps = { ...component.props, ...mappedProps };
    api.log(`TableChildWrapper.render()`, { componentProps, props, ComponentToMount });
    return (
      <Fragment>
        {ComponentToMount ? <ComponentToMount {...componentProps}/> : <p>No component to mount.</p>}
      </Fragment>
    );
  }
}

TableChildWrapper.styles = (theme) => {
  return {}
};

const TableChildWrapperComponent = compose(
  withApi,
  withTheme,
  withStyles(TableChildWrapper.styles))(TableChildWrapper);

export default TableChildWrapperComponent;

