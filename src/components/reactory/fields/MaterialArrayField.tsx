import React, { Component } from 'react'
import { compose } from 'redux';
import PropTypes from 'prop-types'
import { withStyles, withTheme } from '@mui/styles';

import {
  Icon,
  IconButton,
  Typography,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  Input,
  Paper,
} from '@mui/material'



const ArrayItemToolbar = () => {

  return (
    <Grid item md={12} xs={12}>
      <IconButton>
        <Icon>keyboard_arrow_up</Icon>
      </IconButton>
      <IconButton>
        <Icon>keyboard_arrow_down</Icon>
      </IconButton>
    </Grid>
  )
}


class DefaultArrayItem extends Component<any, any> {

  static styles = theme => {
    return {}
  }

  render(){
    
    const cardProps = {
      key: this.props.index    
    }

    return (
      <Card {...cardProps}>        
        <CardContent>
        {this.props.hasToolbar ? <ArrayItemToolbar /> : null }
        {this.props.children}
        </CardContent>
      </Card>
    )
  }
}

const MaterialArrayFieldItem = compose(
  withStyles(DefaultArrayItem.styles), 
  withTheme)(DefaultArrayItem);

export default (props) => {
  return (<MaterialArrayFieldItem {...props} />)
};

