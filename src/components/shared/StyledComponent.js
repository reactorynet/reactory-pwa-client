import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import compose from 'recompose/compose';
import { withStyles, withTheme } from '@material-ui/core';
import { styles } from './styles';

class StyledComponent extends Component {
  static styles = theme => {
    return {}
  }
  render(){
    return (
      <Fragment>
        {this.props.children}
      </Fragment>
    )
  }
}

StyledComponent.propTypes = {
  styles: PropTypes.func
}

StyledComponent.defaultProps = {
  styles: styles
}

export default StyledComponent = compose(withTheme(), withStyles(StyledComponent.styles))(StyledComponent)