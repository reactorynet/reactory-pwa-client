import React from 'react';
import { DefaultTheme, useTheme } from '@mui/styles';
import { Icon, SvgIcon } from '@mui/material';

export const O365 = React.forwardRef((props: any, ref) => {
  const theme: DefaultTheme = useTheme();
  let fill = "#000000";
  if (props.color) {
    if (props.color.indexOf("#") === 0 || props.color.indexOf('rgb') === 0) fill = props.color;
    if (props.color === 'primary' || props.color === 'secondary') {
      //@ts-ignore
      fill = theme.palette[props.color].main
    }
  }

  return (
    <Icon {...props}>
      <SvgIcon>
      <path fill={fill} d="M3,18L7,16.75V7L14,5V19.5L3.5,18.25L14,22L20,20.75V3.5L13.95,2L3,5.75V18Z"></path>
      </SvgIcon>
  </Icon>)
});

export const OnSyspro = React.forwardRef<any, any>((props, ref) => {
  const theme: any = useTheme();
  // let rectStyle = { fill: "none", stroke: "#9AD86E", strokeMiterlimit: 10, strokeWidth: "1px" };
  let rectStyle: any = { fill: "none", strokeMiterlimit: 10, strokeWidth: "1px" };
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

export const Ruler = React.forwardRef<any, any>((props, ref) => {
  const theme: any = useTheme();
  let _style: any = { fill: "none", stroke: "#000", strokeLinejoin: "round", strokeWidth: "2px" };
  let rectStyle: any = { fill: "none", strokeMiterlimit: 10, strokeWidth: "1px" };
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
    <SvgIcon viewBox="0 0 34 16">
      <rect style={_style} x="1.1" y="1.1" width="30" height="14.5" rx="2.12" ry="2.12" />
      <line style={_style} x1="16.1" y1="1.1" x2="16.1" y2="9.04" />
      <line style={_style} x1="21.1" y1="1.1" x2="21.1" y2="9.04" />
      <line style={_style} x1="26.1" y1="1.1" x2="26.1" y2="9.04" />
      <line style={_style} x1="11.1" y1="1.1" x2="11.1" y2="9.04" />
      <line style={_style} x1="6.1" y1="1.1" x2="6.1" y2="9.04" />
    </SvgIcon>
  </Icon >
});

export const Briefcase = React.forwardRef((props: any, ref) => {
  const theme: any = useTheme();
  let rectStyle = { fill: "none", stroke: "#000", strokeLinejoin: "round", strokeWidth: "2px" };
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
    <SvgIcon viewBox="0 0 51.5 42.61">
      <path d="M31.78,30.53a4.33,4.33,0,0,1-8.31,0H6.5a6.94,6.94,0,0,1-3-.68v8.22a7.91,7.91,0,0,0,7.05,7.56H44.69a7.91,7.91,0,0,0,7.05-7.56V29.85a6.94,6.94,0,0,1-3,.68h-17Z" transform="translate(-1.79 -2.5)" />
      <path d="M48.58,11.3H39c-.58-3.63-5.69-8.8-11.35-8.8h0c-5.33,0-10.77,5.17-11.35,8.8H6.67a5.39,5.39,0,0,0-4.88,4.08v9.23c.71,2.13,2.5,3.92,4.71,3.92H23.28a4.34,4.34,0,0,1,1.33-2.93l.08-.06a4.39,4.39,0,0,1,.55-.44l.22-.12a4.27,4.27,0,0,1,.5-.26,4.36,4.36,0,0,1,.43-.13c.12,0,.24-.09.37-.11a4.31,4.31,0,0,1,.86-.09,4.38,4.38,0,0,1,.86.09c.13,0,.25.08.37.11a4.11,4.11,0,0,1,.43.13,4.32,4.32,0,0,1,.49.26l.22.12a4.29,4.29,0,0,1,.55.44l.08.06A4.34,4.34,0,0,1,32,28.53H48.75a4.49,4.49,0,0,0,3.62-2,5.34,5.34,0,0,0,.93-3.14V15.3A5.06,5.06,0,0,0,48.58,11.3Zm-28.46,0c.51-1.54,3.42-6.13,7.5-5.8h0c4.75-.25,7,4.25,7.5,5.8Z" transform="translate(-1.79 -2.5)" />
    </SvgIcon>
  </Icon >
});

export default {
  O365,
  OnSyspro,
  Ruler,
  Briefcase
};
