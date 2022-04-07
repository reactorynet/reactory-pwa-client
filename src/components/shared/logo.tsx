import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';

import { withStyles, withTheme } from '@mui/styles';
import styles from './styles';

class Logo extends Component<any, any> { 

  static propTypes = {
    width: PropTypes.any,
    backgroundSrc: PropTypes.string,
  }

  static defaultProps = {
    width: 'auto',
    backgroundSrc: null
  };

  static styles = (theme): any => ({
    ...styles(theme)
  });

  render(){
    const customStyle: any = {      
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

const ThemedLogo: any = compose( 
  withStyles(Logo.styles),
  withTheme  
)(Logo);

export default ThemedLogo;