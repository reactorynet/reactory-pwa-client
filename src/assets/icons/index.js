import React from 'react';
import { useTheme } from '@material-ui/styles';
import { Icon, SvgIcon } from '@material-ui/core';

export const O365 = React.forwardRef((props, context)=>{
  const theme = useTheme();
  let fill= "#000000"; 
  if(props.color) {
    if(props.color.indexOf("#") === 0 || props.color.indexOf('rgb') === 0) fill = props.color;
    if(props.color === 'primary' ||  props.color === 'secondary') {
      fill = theme.palette[props.color].main
    }                
  }

  return <Icon {...props}>
          <SvgIcon><path fill={fill} d="M3,18L7,16.75V7L14,5V19.5L3.5,18.25L14,22L20,20.75V3.5L13.95,2L3,5.75V18Z" /></SvgIcon>
         </Icon>
});

export default {
  O365
};
