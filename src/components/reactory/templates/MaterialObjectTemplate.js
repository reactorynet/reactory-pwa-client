import React, { Component } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from 'material-ui/styles';

import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Input,
} from 'material-ui'

class ObjectTemplate extends Component {

  static styles = (theme) => ({

  })

  constructor(props, context){
    super(props, context)
    this.state = {

    }
  }


  render(){
    console.log("%cRendering Field Template", "color: green;", this.props)
    const { title, description, properties } = this.props
    return (
      <Card>
        <Typography gutterBottom variant="headline" component="h2">{title}</Typography>
        <Typography gutterBottom component="p">{description}</Typography>        
        <CardContent>
          {properties.map(element => element.content)}
        </CardContent>
      </Card>
    );
  }
}

const MaterialObjectTemplate = compose(withTheme())(ObjectTemplate)
const MaterialObjectTemplateFunction = (props) => {

  return (<MaterialObjectTemplate {...props} />)
}
export default MaterialObjectTemplateFunction