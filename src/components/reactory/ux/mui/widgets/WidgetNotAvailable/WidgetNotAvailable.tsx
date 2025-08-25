import React, { Fragment, useState, useEffect } from 'react';
import { compose } from 'redux';
import {  
  Icon,
  Typography
} from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryApiEventNames } from '@reactory/client-core/api/ReactoryApi';

const WidgetNotAvailable = (props: any) => {
  const [componentLoaded, setComponentLoaded] = useState(false);

  const onComponentRegistered = ({ fqn, component }) => {
    const { map } = props;
    if (fqn === map.componentFqn) {      
      setComponentLoaded(true);
    }
  };

  useEffect(() => {
    const { reactory } = props;
    reactory.on(ReactoryApiEventNames.onComponentRegistered, onComponentRegistered);
    
    return () => {
      reactory.removeListener(ReactoryApiEventNames.onComponentRegistered, onComponentRegistered);
    };
  }, []);
    
  const { map, reactory } = props;
  const ComponentToMount = reactory.getComponent(map.componentFqn);
  if (ComponentToMount !== null && ComponentToMount !== undefined) {
    return (<ComponentToMount {...props} />);
  }

  return (
    <>
      <Typography variant="caption">{map.componentFqn} <Icon>hourglass_empty</Icon></Typography>
    </>
  );
}

export const WidgetNotAvailableComponent = compose(
  withReactory
)(WidgetNotAvailable);
  
export default WidgetNotAvailableComponent