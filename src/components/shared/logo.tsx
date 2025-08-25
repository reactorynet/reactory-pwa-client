import React from 'react';
import { compose } from 'redux';

import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import styles from './styles';

const Logo = (props: any) => {
  const theme = useTheme();
  const customStyle: any = {      
    width: `${props.width}px`,
    maxWidth: `${props.width}px`,            
  };

  if(props.backgroundSrc !== null) {
    customStyle.background = `url(${props.backgroundSrc})`
    customStyle.backgroundSize = 'contain'
    customStyle.backgroundRepeat = 'no-repeat'
    customStyle.backgroundPosition = 'center'      
  }

  return <div style={props.style ? {...props.style, ...customStyle } : {...customStyle}} ></div>
};

export default Logo;