import React, { Component } from 'react'
import { compose } from 'recompose';
import { Paper } from '@material-ui/core';
import { withTheme } from '@material-ui/styles';
import { withApi } from '../../api/ApiProvider';

class HelpMe extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      mode: 'view',            
    }

    this.componentDefs = props.api.getComponents(['core.FullScreenModal', 'core.StaticContent']);    
  }



  render() {
    const { FullScreenModal, StaticContent } = this.componentDefs;
    const { topics = [] } = this.props;
    const helpItems = topics.map((topic, index) => {
      return ( 
        <Paper key={index} style={{margin:this.props.theme.spacing(2)}}>
          <StaticContent slug={topic} slugSource={'property'} >
          </StaticContent>
        </Paper> 
      )
    });
    return (
      <FullScreenModal title={this.props.title} open={this.props.open === true} onClose={this.props.onClose}>
        {helpItems}
      </FullScreenModal>
    )
  }

}

const HelpMeComponent = compose(withTheme, withApi)(HelpMe);

export default HelpMeComponent;
