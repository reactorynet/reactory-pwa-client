import React, { Component } from 'react'
import { compose } from 'recompose';
import { withTheme } from '@material-ui/styles';
import { withApi } from '../../api/ApiProvider';

class HelpMe extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      mode: 'view',      
    }

    this.componentDefs = props.api.getComponents(['core.FullScreenModal'])
  }



  render() {
    const { FullScreenModal } = this.componentDefs;
    return (
      <FullScreenModal title={this.props.title} open={this.props.open === true} onClose={this.props.onClose}>
        
      </FullScreenModal>
    )
  }

}

const HelpMeComponent = compose(withTheme, withApi)(HelpMe);

export default HelpMeComponent;
