import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, IconButton, Icon, Typography, Fab } from '@material-ui/core';
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

    let _props = { ...this.props };

    let {      
      formData,
      uiSchema,     
    } = _props;

    let isFormWidget = false;

    if(formData && uiSchema) {
      isFormWidget = true;
    }

    if(isFormWidget && uiSchema["ui:options"]) {
      const uiOptions = uiSchema["ui:options"];
      if(uiOptions.props) {
        _props = { ..._props, ...uiOptions.props }
      }
    };


    let {
      api,
      componentFqn,
      buttonTitle,
      windowTitle,
      buttonVariant,
      buttonIcon,
      buttonProps = {},
      componentProps,
      actions,
      childProps = {}
    } = _props;


    const { onClick } = this;

    let icon = buttonIcon;    
            
    const tpl = (format) => {
      try {
        return api.utils.template(format)(this.props);
      }
      catch(templateError){
        return `Bad Template ${templateError.message}`;
      }
    }

    let _buttonTitle = buttonTitle ? tpl(buttonTitle) : '';
    let _windowTitle = windowTitle ? tpl(windowTitle) : '';
    let _buttonVariant = buttonVariant ? tpl(buttonVariant) : '';

    const FullScreenModal = api.getComponent('core.FullScreenModal');
    let ChildComponent = api.getComponent(componentFqn || 'core.Loading');
    let componentFound = true;
    let childprops = { ...childProps };

    if(ChildComponent === null || ChildComponent === undefined) {
      componentFound = false;
      ChildComponent = api.getComponent("core.NotFound");
      childprops = {
        message: `The component you specified ${componentFqn} could not be found`,
      };
    }

    if (componentProps && this.state.open === true && componentFound === true) {
      childprops = { ...childprops, ...api.utils.objectMapper(this.props, componentProps) };
    }
                
    let LaunchButton = (
      <Button onClick={onClick}>
        <Icon>{icon}</Icon>
        {_buttonTitle}
      </Button>
    );

    const { SpeedDial } = this.componentDefs;

    if(_buttonVariant === 'IconButton'){
      LaunchButton = (
        <IconButton onClick={onClick} color={buttonProps.color || "primary"} style={buttonProps.style || {}}>
          <Icon>{icon}</Icon>
        </IconButton>
      )
    }

    if(_buttonVariant === "Fab") {
      LaunchButton = (
        <Fab size={buttonProps.size || "medium"} variant={buttonProps.variant || "round"} onClick={onClick} color={buttonProps.color || "primary"} style={buttonProps.style || {}}>
          <Icon>{icon}</Icon>
          {buttonProps.variant === "extended" && _buttonTitle}
        </Fab>
      )
    }

    if(_buttonVariant === 'Typography') {
      LaunchButton = (
        <Typography onClick={onClick} variant={buttonProps.variant || "body2"} color={buttonProps.color || 'primary' } style={buttonProps.style || {}}>
          {icon ? <Icon>{icon}</Icon> : null}
          {_buttonTitle}
        </Typography>
      )
    }

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

      LaunchButton = (<SpeedDial actions={actions} icon={<Icon>{icon}</Icon>} />)
    }

    return (
      <Fragment>
        {LaunchButton}
        <FullScreenModal
          open={this.state.open === true}
          title={_windowTitle}
          slide={this.props.slideDirection}
          onClose={onClick}>
          { this.state.open === true ? <ChildComponent {...childprops} /> : null }
        </FullScreenModal>
      </Fragment>
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
