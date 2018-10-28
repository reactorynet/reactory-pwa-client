import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core';
import styles from './styles';

class Logo extends Component {  
  render(){
    const customStyle = {
      width: `${this.props.width}px`
    };

    return <div className={this.props.classes.logo} style={customStyle}></div>
  }
}

Logo.propTypes = {
  width: PropTypes.number
}

Logo.defaultProps = {
  width: 400,
};

Logo.styles = (theme) => ({
  ...styles(theme)
});

const ThemedLogo = compose( 
  withStyles(Logo.styles),
  withTheme()  
)(Logo);

export default ThemedLogo;