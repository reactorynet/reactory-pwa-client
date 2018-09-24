import React, { Component } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@material-ui/core/styles';

import {
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Input,
  Paper,
} from '@material-ui/core'

class ObjectTemplate extends Component {

  static styles = (theme) => ({
    root: {
      padding: theme.spacing.unit
    }
  })

  constructor(props, context){
    super(props, context)
    this.state = {

    }
  }


  render(){
    const { title, description, properties, classes } = this.props
    return (
      <Paper className={classes.root}>
        <Typography gutterBottom variant="headline" component="h2" align="left">{title}</Typography>
        <Typography gutterBottom component="p">{description}</Typography>        
        <CardContent>
          {properties.map(element => element.content)}
        </CardContent>
      </Paper>
    );
  }
}

const MaterialObjectTemplate = compose(
  withStyles(ObjectTemplate.styles), 
  withTheme())(ObjectTemplate)

const MaterialObjectTemplateFunction = (props) => {
  return (<MaterialObjectTemplate {...props} />)
}
export default MaterialObjectTemplateFunction