import React, { Component, Fragment } from 'react';
import {
  Icon,
  Grid
} from '@material-ui/core';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/styles';
import { withApi } from '../../api/ApiProvider';
import classNames from 'classnames';
import { ReactoryApiEventNames } from '../../api'
import { v1 as uuidV1 } from 'uuid';

class NotificationHOC extends Component {

  timer = null;
  interval = 3000;
  canDismiss = true;
  components = [];

  constructor(props, context) {
    super(props, context);
  }

  static styles = theme => {
    return {
      root: {
        display: 'flex',
        justifyContent: 'space-between'
      },
      messageColumn: {
        display: 'flex',
        alignItems: 'center'
      },
      componentColumn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end'
      },
      container: {
        position: 'relative',
        zIndex: 2000,
        display: 'block'
      },
      notification: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '1rem',
        margin: '1rem',
        borderRadius: '8px',
        boxShadow: '1px 1px 1px 0px rgba(0,0,0,0.3)',
        color: '#fff',
        '& p': {
          color: '#fff',
          fontSize: '0.9rem',
          margin: 0,
          marginLeft: '1rem'
        },
      },
      info: {
        backgroundColor: theme.palette.info.main,
      },
      success: {
        backgroundColor: theme.palette.success.main,
      },
      error: {
        backgroundColor: theme.palette.error.main,
      },
      warning: {
        backgroundColor: theme.palette.warning.main,
      },
    }
  }

  componentDidMount = () => {
    if (this.props.config) {
      let { config } = this.props;
      this.interval = config.timeOut || config.timeout || 3000;
      this.canDismiss = config.canDismiss;
      this.components = config.components || [];
    }

    this.timer = setTimeout(() => {
      this.props.deleteNotification(this.props.id);
    }, this.interval);
  }

  clickHandler = () => {
    if (!this.canDismiss)
      return;
    clearTimeout(this.timer);
    this.props.deleteNotification(this.props.id);
  }

  render() {
    let { props } = this;
    let { api, title, type, config, classes } = props;
    let additionalComponentsToMount = null;


    if (config && config.components && config.components.length > 0) {
      const additionalComponents = config.components || [];
      additionalComponentsToMount = additionalComponents.map(({ componentFqn, componentProps, propsMap }, additionalComponentIndex) => {
        let ComponentToMount = api.getComponent(componentFqn);
        api.log('NOTIFICATION __ ADITIONAL COMPONENT:: ', { componentProps, componentFqn }, 'debug');
        let additionalComponentFound = true;
        if (ComponentToMount === null || ComponentToMount === undefined) {
          additionalComponentFound = false;
          ComponentToMount = api.getComponent("core.NotFound");
        }

        let mappedProps = {};
        if (propsMap)
          mappedProps = api.utils.objectMapper({ ...props.config, api }, propsMap)

        if (additionalComponentFound === true)
          return <ComponentToMount {...{ ...componentProps, ...mappedProps, key: additionalComponentIndex }} />
        else
          return <ComponentToMount message={`Could not load component ${componentFqn}, please check your registry loaders and namings`} key={additionalComponentIndex} />
      });

    }

    return (
      <div onClick={this.clickHandler} className={classNames(classes.notification, classes[type])}>
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
}

const NotificationHOCComponent = compose(withTheme, withApi, withStyles(NotificationHOC.styles))(NotificationHOC);

class NotificationWidget extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = { notifications: [] }
    this.props.api.on(ReactoryApiEventNames.onShowNotification, this.onShowNotification);
  }

  static styles = theme => {
    return {
      container: {
        position: 'relative',
        zIndex: 2000,
        position: 'fixed',
        top: 0,
        right: 0,
        left: 0
      }
    }
  }

  onShowNotification = ({ title, type, config }) => {
    this.setState(prevState => ({ notifications: [...prevState.notifications, { id: uuidV1(), title, type, config: config }] }));
  }

  deleteNotificationHandler = (id) => {
    this.setState(prevState => ({ notifications: prevState.notifications.filter(i => i.id !== id) }));
  }

  render() {
    let {
      classes
    } = this.props;

    return (
      <div className={classes.container}>
        {
          this.state.notifications.map((message, index) => {
            return (
            <NotificationHOCComponent
              key={message.id}
              id={message.id}
              title={message.title}
              type={message.type}
              config={message.config}
              deleteNotification={this.deleteNotificationHandler}>
            </NotificationHOCComponent>
          )})
        }
      </div>
    )
  }
}

const NotificationComponent = compose(withTheme, withApi, withStyles(NotificationWidget.styles))(NotificationWidget);

NotificationComponent.propTypes = {};
NotificationComponent.defaultProps = {};


export default NotificationComponent;
