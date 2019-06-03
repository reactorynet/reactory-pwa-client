import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core';
import styles from './styles';

class Logo extends Component {  
  render(){
    const customStyle = {      
      width: `${this.props.width}px`,
      maxWidth: `${this.props.width}px`,            
    };

    if(this.props.backgroundSrc !== null) {
      customStyle.background = `url(${this.props.backgroundSrc})`
      customStyle.backgroundSize = 'contain'
      customStyle.backgroundRepeat = 'no-repeat'
      customStyle.backgroundPosition = 'center !important'      
    }

    return <div className={this.props.classes.logo} style={this.props.style ? {...this.props.style, ...customStyle } : {...customStyle}} ></div>
  }
}

Logo.propTypes = {
  width: PropTypes.any,
  backgroundSrc: PropTypes.string,
}

Logo.defaultProps = {
  width: 'auto',
  backgroundSrc: null
};

Logo.styles = (theme) => ({
  ...styles(theme)
});

const ThemedLogo = compose( 
  withStyles(Logo.styles),
  withTheme  
)(Logo);

export default ThemedLogo;