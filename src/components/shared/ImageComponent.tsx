import React, { Component, Fragment } from 'react';
import { Avatar } from '@mui/material';
import { compose } from 'redux';
import { withTheme, withStyles } from '@mui/styles';


type AvatarVariant = "square" | "circular" | "rounded";

class ImageWidget extends Component<any, any> {

  render() {
    const { value, theme, formData } = this.props

    let url = value ? value : formData;
    let variant: AvatarVariant = 'rounded';

    let avatarProps = {
      style: {
        height: theme.spacing(5),
        width: theme.spacing(5)
      }
    }

    let uiOptions = this.props['ui:options'];
    if (uiOptions) {
      if (uiOptions.variant) {
        variant = uiOptions.variant
      }

      if (uiOptions.size) {

        if (uiOptions.size == 'medium') {
          avatarProps.style = {
            height: `${theme.spacing(10)}px`,
            width: `${theme.spacing(10)}px`
          }
        }
        if (uiOptions.size == 'large') {
          avatarProps.style = {
            height: `${theme.spacing(15)}px`,
            width: `${theme.spacing(15)}px`
          }
        }
      }

      if(uiOptions.style) {
        avatarProps.style = {...avatarProps.style, ...uiOptions.style}
      }
    }

    return (
      <Avatar src={url} {...avatarProps} variant={variant} />
    )
  }
}


const ImageComponent = compose(withTheme)(ImageWidget)
export default ImageComponent;
