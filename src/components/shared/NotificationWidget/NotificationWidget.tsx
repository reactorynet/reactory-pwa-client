import React, { Component, Fragment } from 'react';
import {
  Icon,
  Grid,
  Theme
} from '@mui/material';
import { compose } from 'redux';
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import classNames from 'classnames';
import { ReactoryApiEventNames } from '@reactory/client-core/api'
import { v1 as uuidV1 } from 'uuid';

const styles = (theme: Theme) => {
  return {
    notification: {
      backgroundColor: theme.palette.background.paper,
    }
  }
}

const NotificationHOC = ({ reactory, title, type, config, deleteNotification, classes }) => {
  const [additionalComponentsToMount, setAdditionalComponentsToMount] = React.useState(null);

  React.useEffect(() => {
    if (config && config.components && config.components.length > 0) {
      const additionalComponents = config.components || [];
      const mountedComponents = additionalComponents.map(({ componentFqn, componentProps, propsMap }, additionalComponentIndex) => {
        let ComponentToMount = reactory.getComponent(componentFqn);
        reactory.log('NOTIFICATION __ ADITIONAL COMPONENT:: ', { componentProps, componentFqn });
        let additionalComponentFound = true;
        if (ComponentToMount === null || ComponentToMount === undefined) {
          additionalComponentFound = false;
          ComponentToMount = reactory.getComponent("core.NotFound");
        }

        let mappedProps = {};
        if (propsMap)
          mappedProps = reactory.utils.objectMapper({ ...config, reactory }, propsMap)

        if (additionalComponentFound === true)
          return <ComponentToMount {...{ ...componentProps, ...mappedProps, key: additionalComponentIndex }} />
        else
          return <ComponentToMount message={`Could not load component ${componentFqn}, please check your registry loaders and namings`} key={additionalComponentIndex} />
      });
      setAdditionalComponentsToMount(mountedComponents);
    }
  }, [config, reactory]);

  const clickHandler = () => {
    if (!config.canDismiss)
      return;
    deleteNotification(config.id);
  }

  return (
    <div onClick={clickHandler} className={classNames(classes.notification, classes[type])}>
      <Grid container className={classes.root} spacing={2}>
        <Grid item className={classes.messageColumn}>
          <Icon>done</Icon>
          <p>{title}</p>
        </Grid>

        {
          config && config.components && config.components.length > 0 &&
          <Grid item xs={4} className={classes.componentColumn}>
            {additionalComponentsToMount}
          </Grid>
        }

        {config.children &&
          <Grid item xs={4} className={classes.componentColumn}>
            {config.children}
          </Grid>}


      </Grid>
    </div>
  )
}

const NotificationHOCComponent = compose(withTheme, withReactory, withStyles(styles))(NotificationHOC);

const NotificationWidget = ({ reactory, classes }) => {
  const [notifications, setNotifications] = React.useState([]);

  React.useEffect(() => {
    const onShowNotification = ({ title, type, config }) => {
      setNotifications(prevState => ([...prevState, { id: uuidV1(), title, type, config: config }]));
    };
    reactory.on(ReactoryApiEventNames.onShowNotification, onShowNotification);
    return () => reactory.off(ReactoryApiEventNames.onShowNotification, onShowNotification);
  }, [reactory]);

  const deleteNotificationHandler = (id) => {
    setNotifications(prevState => prevState.filter(i => i.id !== id));
  }

  return (
    <div className={classes.container}>
      {
        notifications.map((message, index) => {
          return (
          <NotificationHOCComponent
            key={message.id}
            id={message.id}
            title={message.title}
            type={message.type}
            config={message.config}
            deleteNotification={deleteNotificationHandler}>
          </NotificationHOCComponent>
        )})
      }
    </div>
  )
}

const NotificationComponent = compose(withTheme, withReactory, withStyles(styles))(NotificationWidget);

export default NotificationComponent;
