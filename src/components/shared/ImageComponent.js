import React, { Component, Fragment } from 'react';
import { Avatar } from '@material-ui/core';
import { compose } from 'recompose';
import { withTheme, withStyles } from '@material-ui/styles';

class ImageWidget extends Component {

   render() {
    const { value, theme } = this.props

    let url = value;
    let variant = 'rounded';
    let avatarStyles = {
      height: theme.spacing(7),
      width: theme.spacing(7)
    };

    let uiOptions = this.props['ui:options'];
    if (uiOptions) {
      if (uiOptions.variant) {
        variant = uiOptions.variant
      }

      if (uiOptions.size) {

        // if (uiOptions.size == 'medium') {
        //   avatarStyles = {
        //     height: theme.spacing(3),
        //     width: theme.spacing(3)
        //   }
        // }
        // if (uiOptions.size == 'large') {
        //   avatarStyles = {
        //     height: theme.spacing(7),
        //     width: theme.spacing(7)
        //   }
        // }



      }

    }

    debugger;

    return (
      <Avatar alt="Remy Sharp" src={url} styles={avatarStyles}  variant={variant} />
    )
  }
}


const ImageComponent = compose(withTheme)(ImageWidget)
export default ImageComponent;
