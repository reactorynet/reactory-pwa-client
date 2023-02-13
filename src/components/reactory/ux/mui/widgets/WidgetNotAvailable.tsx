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
import { reactoryDomNode } from 'api/ReactoryApi';


class WidgetNotAvailable extends Component<any, any> {

  constructor(props){
    super(props);
    this.state = {
      componentLoaded: false,      
    };

    this.onComponentRegistered = this.onComponentRegistered.bind(this);
  }

  static styles = (theme) => ({
    root: {
      padding: '8px',
    },        
  });

  onComponentRegistered(componentFqn: string) {
    const { map } = this.props;
    if (componentFqn === map.componentFqn) {      
      this.setState({ componentLoaded: true });
      this.forceUpdate();
    }
  }

  componentDidMount(): void {
    const that = this;
    const { reactory } = that.props;
    reactory.on('componentRegistered', this.onComponentRegistered);
  }

  componentWillUnmount(): void {
    const { reactory } = this.props;
    reactory.removeListener('componentRegistered', this.onComponentRegistered);
  }
    
  render() {
    const { uiSchema, api, formData, formContext, classes, map, reactory } = this.props;
    const { componentLoaded } = this.state;
    const ComponentToMount = reactory.getComponent(map.componentFqn);
    if(ComponentToMount !== null && ComponentToMount !== undefined) {
      return (<ComponentToMount {...this.props} />);
    }

    return (
      <>
        <Typography variant="caption">{map.componentFqn} <Icon>hourglass_empty</Icon></Typography>
      </>
    );
    
  }
}

export const WidgetNotAvailableComponent = compose(
  withReactory, 
  withStyles(WidgetNotAvailable.styles), 
  withTheme)(WidgetNotAvailable);
  
export default WidgetNotAvailableComponent