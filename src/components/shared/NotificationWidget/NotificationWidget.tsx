import React, { Component, Fragment } from 'react';
import { styled } from '@mui/material/styles';
import {
  Icon,
  Grid,
  Snackbar,
  Alert,
  AlertTitle
} from '@mui/material';
import { compose } from 'redux';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import classNames from 'classnames';
import { ReactoryApiEventNames } from '@reactory/client-core/api'
import { v1 as uuidV1 } from 'uuid';

const PREFIX = 'NotificationComponent';

const classes = {
  container: `${PREFIX}-container`,
  notification: `${PREFIX}-notification`,
  snackbar: `${PREFIX}-snackbar`
};

const Root = styled('div')(({ theme }: { theme: Theme }) => {
  return {
    [`& .${classes.notification}`]: {
      backgroundColor: theme.palette.background.paper,
    },
    [`& .${classes.snackbar}`]: {
      '& .MuiSnackbarContent-root': {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }
    }
  };
});

const NotificationHOC = ({ reactory, title, type, config, deleteNotification,  open, onClose }) => {
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

  const handleClose = (event, reason) => {
    if (reason === 'clickaway' && !config.canDismiss) {
      return;
    }
    onClose();
  }

  const getSeverity = (type) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={config?.autoHideDuration || 6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      className={classNames(classes.snackbar, classes[type])}
    >
      <Alert 
        onClose={(event) => handleClose(event, 'close')} 
        severity={getSeverity(type)}
        variant="filled"
        className={classNames(classes.notification, classes[type])}
        action={
          config && config.components && config.components.length > 0 && (
            <Root style={{ marginLeft: 16 }}>
              {additionalComponentsToMount}
            </Root>
          )
        }
      >
        <AlertTitle>{title}</AlertTitle>
        {config?.children && (
          <div style={{ marginTop: 8 }}>
            {config.children}
          </div>
        )}
      </Alert>
    </Snackbar>
  );
}

const NotificationHOCComponent = compose(withReactory)(NotificationHOC);

const NotificationWidget = ({ reactory, }) => {
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
            deleteNotification={deleteNotificationHandler}
            open={true}
            onClose={() => deleteNotificationHandler(message.id)}>
          </NotificationHOCComponent>
        )})
      }
    </div>
  )
}

const NotificationComponent = compose(withReactory)(NotificationWidget);

export default NotificationComponent;
