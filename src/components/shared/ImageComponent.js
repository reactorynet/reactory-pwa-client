import React, { Component, Fragment } from 'react';
import { Avatar } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';

class ImageWidget extends Component {

  render() {
    const { value, theme } = this.props

    let url = value;
    let variant = 'rounded';

    let avatarProps = {
      style: {
        height: theme.spacing(7),
        width: theme.spacing(7)
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
    }

    return (
      <Avatar src={url} {...avatarProps} variant={variant} />
    )
  }
}


const ImageComponent = compose(withTheme)(ImageWidget)
export default ImageComponent;
