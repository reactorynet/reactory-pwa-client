import React, { Fragment } from 'react';
import { compose } from 'redux';
import { isString } from 'lodash';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

const TableChildWrapper = (props: any) => {
  const { api, component } = props;
  let ComponentToMount: any = (<Typography>Wrapped Component Loading {component.componentFqn}</Typography>);

  if (component && isString(component.componentFqn) === true) {
    ComponentToMount = api.getComponent(component.componentFqn);
  }    
  let mappedProps = api.utils.objectMapper(props, component.propsMap || {});    
  let componentProps: any = { ...component.props, ...mappedProps };
  api.log(`TableChildWrapper.render()`, { componentProps, props, ComponentToMount });
  return (
    <Fragment>
      {ComponentToMount ? <ComponentToMount {...componentProps}/> : <p>No component to mount.</p>}
    </Fragment>
  );
};

const TableChildWrapperComponent = withReactory(TableChildWrapper, 'TableChildComponentWrapper');

export default TableChildWrapperComponent;

