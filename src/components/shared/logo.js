import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core';
import styles from './styles';

class Logo extends Component {  
  render(){
    const customStyle = {
      maxWidth: `${this.props.maxWidth}px`
    };

    return <div className={this.props.classes.logo} style={customStyle}></div>
  }
}

Logo.propTypes = {
  maxWidth: PropTypes.number
}

Logo.defaultProps = {
  maxWidth: 300
}

Logo.styles = (theme) => ({
  ...styles(theme)
});

export default compose( 
  withStyles(Logo.styles),
  withTheme()  
)(Logo);