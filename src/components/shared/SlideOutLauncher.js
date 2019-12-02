import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, IconButton, Icon, Typography } from '@material-ui/core';
import { isArray } from 'lodash';
import { compose } from 'recompose';
import { withTheme } from '@material-ui/styles';
import { withApi } from '../../api/ApiProvider';
import { ReactoryApi } from "../../api/ReactoryApi";

class SlideOutLauncher extends Component {

  // CONFIRGURATION OPTIONS
  // buttonVariant - Static | SpeedDial

  // Click Actions:
  // Launch
  // Navigate
  // Emit
  // MountComponent

  // TO ADD
  // SpeedDial needs actions

  constructor(props, context) {
    super(props, context);

    //the handlers must return a function that returns a message call
    this.state = {
      open: false,
    };

    this.onClick = this.onClick.bind(this);

    this.componentDefs = props.api.getComponents(['core.SpeedDial']);
  }

  onClick() {
    this.setState({ open: !this.state.open });
  }

  render() {

    const {
      api,
      formData,
      uiSchema,
      componentFqn,
      buttonTitle,
      windowTitle,
      buttonVariant,
      componentProps,
      actions
    } = this.props;
    const { onClick } = this;

    let icon = 'search';

    let _buttonTitle = buttonTitle ? api.utils.template(buttonTitle)(this.props) : '';
    let _windowTitle = windowTitle ? api.utils.template(windowTitle)(this.props) : '';
    let _buttonVariant = buttonVariant ? api.utils.template(buttonVariant)(this.props) : '';

    const FullScreenModal = api.getComponent('core.FullScreenModal');
    const ChildComponent = api.getComponent(componentFqn || 'core.Loading');

    let childprops = {};

    if (componentProps) {
      childprops = api.utils.objectMapper(this.props, componentProps);
    }

    let LaunchButton = (<Button onClick={onClick}>
      <Icon>{icon}</Icon>
      {_buttonTitle}
    </Button>);

    const { SpeedDial } = this.componentDefs;

    // const testActions = [
    //   {
    //     key: 'testKey',
    //     title: 'Test Action',
    //     clickHandler: (evt) => { },
    //     icon: <Icon>group_add</Icon>,
    //     enabled: true,
    //     ordinal: 0,
    //   }];

    if (_buttonVariant === 'SpeedDial') {

      actions.forEach((action) => {
        action.icon = (<Icon>{action.icon}</Icon>);
        action.clickHandler = () => {
          if(action.clickAction && action.clickAction === 'navigate') {
            api.goto(action.link);
          }
          else if (action.clickAction && action.clickAction === 'launch-slideout') {
            this.onClick();
          }
        }
      });
      LaunchButton = <SpeedDial actions={actions} icon={<Icon>add</Icon>} />
    }

    return (
      <div>
        {LaunchButton}
        <FullScreenModal
          open={this.state.open === true}
          title={_windowTitle}
          slide={this.props.slideDirection}
          onClose={onClick}>
          <ChildComponent {...childprops} />
        </FullScreenModal>
      </div>
    )
  }
}

const SlideOutLauncherComponent = compose(withTheme, withApi)(SlideOutLauncher);

SlideOutLauncherComponent.propTypes = {
  api: PropTypes.instanceOf(ReactoryApi).isRequired,
  //the component we will launch
  componentFqn: PropTypes.string,
  componentProps: PropTypes.object,
  slideDirection: PropTypes.oneOf(['up', 'down', 'left', 'right']),
  title: PropTypes.string,
};

SlideOutLauncherComponent.defaultProps = {
  componentFqn: 'core.Logo',
  slideDirection: 'right',
};

SlideOutLauncherComponent.meta = {
  nameSpace: 'core',
  name: 'SlideOutLauncher',
  version: '1.0.0',
  component: SlideOutLauncherComponent,
  tags: ['widget', 'api-enabled', 'wrapper'],
  description: 'Widget to launch slide out containers with',
};


export default SlideOutLauncherComponent;
