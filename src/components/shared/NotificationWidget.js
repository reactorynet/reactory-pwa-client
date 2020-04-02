import React, { Component, Fragment } from 'react';
import { Icon } from '@material-ui/core';
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
      success: {
        backgroundColor: '#4fbc4f',
      },
      error: {
        backgroundColor: '#e04a47',
      },
      warning: {
        backgroundColor: '#f9cd2c',
      },

    }
  }

  componentDidMount = () => {
    if (this.props.config) {
      let { config } = this.props;
      this.interval = config.timeOut || 3000;
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
    let { title, type, classes } = this.props;

    return (
      <div onClick={this.clickHandler} className={classNames(classes.notification, (type == 'success' ? classes.success : classes.error ? classes.error : classes.warning))}>
        <Icon>done</Icon>
        <p>{title}</p>
      </div>
    )
  }
}

const NotificationHOCComponent = compose(withTheme, withStyles(NotificationHOC.styles))(NotificationHOC);

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
          this.state.notifications.map((message, index) => (
            <NotificationHOCComponent
              key={message.id}
              id={message.id}
              title={message.title}
              type={message.type}
              config={message.config}
              deleteNotification={this.deleteNotificationHandler}>
            </NotificationHOCComponent>
          ))
        }
      </div>
    )
  }
}

const NotificationComponent = compose(withTheme, withApi, withStyles(NotificationWidget.styles))(NotificationWidget);

NotificationComponent.propTypes = {};
NotificationComponent.defaultProps = {};


export default NotificationComponent;
