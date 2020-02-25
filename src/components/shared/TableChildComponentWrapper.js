import React, { Component, Fragment } from 'react';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

class TableChildWrapper extends Component {

  render() {
    const { props } = this;
    const { api } = props;
    let ComponentToMount;

    if (props["ui:options"]) {
      const uiOptions = props["ui:options"];
      ComponentToMount = api.getComponent(uiOptions.componentFqn);
    }

    let mappedProps = api.utils.objectMapper(props, props.propsMap || {});
    let componentProps = {...props, ...mappedProps}
    api.log(`TableChildWrapper.render()`, { componentProps, props });
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

