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
} from '@mui/material';
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';


class WidgetNotAvailable extends Component<any, any> {

  constructor(props){
    super(props);
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

export const WidgetNotAvailableComponent = compose(
  withReactory, 
  withStyles(WidgetNotAvailable.styles), 
  withTheme)(WidgetNotAvailable);
  
export default WidgetNotAvailableComponent