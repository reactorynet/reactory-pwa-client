import React, { Fragment } from 'react';
import { Avatar } from '@mui/material';
import { compose } from 'redux';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';


type AvatarVariant = "square" | "circular" | "rounded";

const ImageWidget = (props: any) => {
  const theme = useTheme();
  
  const { value, formData } = props;

    let url = value ? value : formData;
    let variant: AvatarVariant = 'rounded';

    let avatarProps = {
      style: {
        height: theme.spacing(5),
        width: theme.spacing(5)
      }
    }

    let uiOptions = props['ui:options'];
    if (uiOptions) {
      if (uiOptions.variant) {
        variant = uiOptions.variant
      }

      if (uiOptions.size) {

        if (uiOptions.size == 'medium') {
          avatarProps.style = {
            height: theme.spacing(10),
            width: theme.spacing(10)
          }
        }
        if (uiOptions.size == 'large') {
          avatarProps.style = {
            height: theme.spacing(15),
            width: theme.spacing(15)
          }
        }
      }

      if(uiOptions.style) {
        avatarProps.style = {...avatarProps.style, ...uiOptions.style}
      }
    }

    return (
      <Avatar src={url} {...avatarProps} variant={variant} />
    );
};


export default ImageWidget;
