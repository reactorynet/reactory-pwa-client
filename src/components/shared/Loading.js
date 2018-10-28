import React, { Component } from 'react';
import PropTypes from 'react';
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
    return (<Typography>{this.props.message}</Typography>)
  }
}

Loading.propTypes = {
  message: PropTypes.string
}

Loading.defaultProps = {
  message: "Loading please stand by..."
}

const ThemedLoading = compose(
  withTheme,
  withStyles(Loading.styles)
)(Loading)

export default ThemedLoading;