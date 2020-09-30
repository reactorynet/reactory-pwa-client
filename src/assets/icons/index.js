import React from 'react';
import { useTheme } from '@material-ui/styles';
import { Icon, SvgIcon } from '@material-ui/core';

export const O365 = React.forwardRef((props, context) => {
  const theme = useTheme();
  let fill = "#000000";
  if (props.color) {
    if (props.color.indexOf("#") === 0 || props.color.indexOf('rgb') === 0) fill = props.color;
    if (props.color === 'primary' || props.color === 'secondary') {
      fill = theme.palette[props.color].main
    }
  }

  return <Icon {...props}>
    <SvgIcon><path fill={fill} d="M3,18L7,16.75V7L14,5V19.5L3.5,18.25L14,22L20,20.75V3.5L13.95,2L3,5.75V18Z" /></SvgIcon>
  </Icon>
});

export const OnSyspro = React.forwardRef((props, context) => {
  const theme = useTheme();
  // let rectStyle = { fill: "none", stroke: "#9AD86E", strokeMiterlimit: 10, strokeWidth: "1px" };
  let rectStyle = { fill: "none", strokeMiterlimit: 10, strokeWidth: "1px" };
  let fill = "#000000";

  if (props.color) {
    if (props.color.indexOf("#") === 0 || props.color.indexOf('rgb') === 0) fill = props.color;
    if (props.color === 'primary' || props.color === 'secondary') {
      fill = theme.palette[props.color].main
    }
  }

  if (props.style.color) {
    rectStyle.stroke = props.style.color;
  }

  return <Icon {...props}>
    <SvgIcon>
      <rect style={rectStyle} x="0.5" y="0.5" width="21" height="21" rx="10.5" ry="10.5" />
      <path d="M13.44,3.62a8.5,8.5,0,1,0,6.94,6.94A8.51,8.51,0,0,0,13.44,3.62Zm-.8,13.78H11.36a.43.43,0,0,1-.45-.41V15.81a.43.43,0,0,1,.45-.41h1.27a.43.43,0,0,1,.45.41V17A.43.43,0,0,1,12.64,17.4Zm0-3.71H11.39A.39.39,0,0,1,11,13.3V6.08a.39.39,0,0,1,.39-.39h1.22a.39.39,0,0,1,.39.39V13.3A.39.39,0,0,1,12.61,13.69Z" transform="translate(-1 -1)" />
    </SvgIcon>
  </Icon >
});

export default {
  O365,
  OnSyspro
};
