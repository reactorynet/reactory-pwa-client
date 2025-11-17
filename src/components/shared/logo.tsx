import React from 'react';
import { compose } from 'redux';

import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import styles from './styles';

const Logo = (props: any) => {  
  // Default to 16:9 aspect ratio, but allow override
  const aspectRatio = props.aspectRatio || '16/9';
  
  console.log('LOGO: props', props);

  // Determine the background image URL
  let backgroundImage = '';
  if(props.backgroundSrc && typeof props.backgroundSrc === 'string' && props.backgroundSrc.trim()) {
    backgroundImage = `url(${props.backgroundSrc})`;
  } else {
    // Fallback to placeholder when no valid backgroundSrc (16:9 placeholder)
    backgroundImage = `url(https://placehold.it/400x225/cccccc/666666?text=LOGO)`;
    console.warn('Logo: No valid backgroundSrc provided, using fallback image');
  }

  // Simplified single-container approach with fallback for older browsers
  const logoStyle: any = {      
    width: '100%',
    maxWidth: props.maxWidth || '100%',
    aspectRatio: aspectRatio, // Modern CSS aspect-ratio property
    backgroundImage: backgroundImage,
    backgroundSize: 'contain', // This ensures the image fits within the container
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    // Fallback for older browsers - if aspect-ratio isn't supported, use padding-bottom
    paddingBottom: aspectRatio === '16/9' ? '56.25%' : '100%', // 9/16 * 100 = 56.25%
    minHeight: '0', // Ensure height can be determined by aspect-ratio when supported
  };

  // Merge with any custom styles passed in
  const finalStyle = props.style ? {...logoStyle, ...props.style} : logoStyle;

  return <div style={finalStyle} />;
};

export default Logo;