import React, { Component } from 'react';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';
import ReactoryApi, { withApi } from '@reactory/client-core/api';
import { UserListItem } from '../user'

interface NotFoundProps {
  message?: string,
  waitingFor?: string,
  wait?: number,
  args?: any,
  api: ReactoryApi,
  theme: any  
};

interface NotFoundState {
  found: boolean,
  wait: number,
  waitingFor: string | null,
  mustCheck: boolean
}

class NotFound extends Component<NotFoundProps, NotFoundState> {

  ComponentToMount: any  = null;

  constructor(props: NotFoundProps, context: any){
    super(props, context);    
    const state = {
        found: false, 
        wait: props.wait || 1000,
        waitingFor: props.waitingFor || null,
        mustCheck: typeof props.waitingFor === 'string' && props.waitingFor.indexOf(".") > 0
    };    

    this.state = state;
    this.checkComponentLoaded = this.checkComponentLoaded.bind(this);
    this.ComponentToMount = undefined;
  }

  checkComponentLoaded() {
    this.ComponentToMount = this.props.api.getComponent(this.state.waitingFor)
      if(this.ComponentToMount === null || undefined) {
        setTimeout(this.checkComponentLoaded, this.state.wait);
      } else {
        this.setState({ found: true, mustCheck: false })
      }
  }

  componentDidMount(){
    if(this.state.mustCheck === true) {
      this.checkComponentLoaded()  
    }
  }

  render(){

    const { found, waitingFor, mustCheck } = this.state;    
    if(found === false) {
      let message = this.props.message;
      if(mustCheck === true) message = `Waiting for component ${waitingFor} to load.`
      return (      
        <UserListItem user={{ firstName: 'Reactory', lastName: 'Bot', id: 'reactory', avatar: 'reactory_bot.png' }} message={this.props.message } />
      )
    } else {
      const { ComponentToMount } = this;
      return (<ComponentToMount {...this.props.args} />)
    }    
  }

};

const NotFoundStyles = (theme: any) => {
  return {};
};

export default compose(withTheme, withStyles(NotFoundStyles), withApi)(NotFound);

