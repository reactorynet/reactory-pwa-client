import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { throttle } from 'lodash';
import {  
  Toolbar,
  Tooltip, 
  IconButton,
  Icon,
  Typography
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../../api/ApiProvider';
import { ReactoryApi } from "../../../api/ReactoryApi";


class WidgetNotAvailable extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      componentLoaded: false,
      componentToMount: null
    };
  }

  static styles = (theme) => ({
    root: {
      padding: '8px',
    },        
  });

  static propTypes = {
    api: PropTypes.instanceOf(ReactoryApi).isRequired,
    map: PropTypes.object
  }

  componentDidMount(){
    const self = this;
    const { api } = self.props;
    api.on('componentRegistered', ( componentFqn ) => {    
      if(componentFqn === self.props.map.componentFqn) {
        const ComponentToMount = api.getComponent(componentFqn);
        self.setState({ componentLoaded: true, ComponentToMount });
      }
    });
  }
    
  render() {
    const { uiSchema, api, formData, formContext, classes } = this.props;
    const { componentLoaded, ComponentToMount } = this.state;
    if(componentLoaded === true && ComponentToMount !== null && ComponentToMount !== undefined) {
      return (<ComponentToMount {...this.props} />);
    }

    return (
      <div className={classes.root}>
        <Typography>Waiting for widget... <Icon>hourglass_empty</Icon></Typography>
      </div>
    );
    
  }
}

WidgetNotAvailable.propTypes = {
  classes: PropTypes.object,
};

export const WidgetNotAvailableComponent = compose(
  withApi, 
  withStyles(WidgetNotAvailable.styles), 
  withTheme)(WidgetNotAvailable);
  
export default WidgetNotAvailableComponent