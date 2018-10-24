import React, { Component } from 'react';
import { compose } from 'recompose';
import {
  Typography
} from '@material-ui/core';

import { withTheme, withStyles } from '@material-ui/core/styles';

class Loading extends Component {

  static styles = theme => ({
    spinning: {

    }
  });

  render(){
    return (<Typography>Loading please stand by...</Typography>)
  }
}

const ThemedLoading = compose(
  withTheme,
  withStyles(Loading.styles)
)(Loading)

export default ThemedLoading;