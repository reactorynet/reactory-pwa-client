import React, { Component, Fragment } from 'react';
import { compose } from 'redux';
import {  
  Icon,
  Typography
} from '@mui/material';
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { ReactoryApiEventNames } from '@reactory/client-core/api/ReactoryApi';
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

  onComponentRegistered({ fqn, component }) {
    const { map } = this.props;
    if (fqn === map.componentFqn) {      
      this.setState({ componentLoaded: true });
      this.forceUpdate();
    }
  }

  componentDidMount(): void {
    const that = this;
    const { reactory } = that.props;
    reactory.on(ReactoryApiEventNames.onComponentRegistered, this.onComponentRegistered);
  }

  componentWillUnmount(): void {
    const { reactory } = this.props;
    reactory.removeListener(ReactoryApiEventNames.onComponentRegistered, this.onComponentRegistered);
  }
    
  render() {
    const { map, reactory } = this.props;
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