import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { Typography } from '@mui/material';
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

import { template } from 'lodash';

class Label extends Component<any, any> {


  render() {

    const { props } = this;
    const {
      value = "?",
      variant = "h6",
      classes,
      reactory,
    } = props;

    let labelText = value;

    if (props.uiSchema && props.uiSchema["ui:options"]) {
      const { format, $format } = props.uiSchema["ui:options"];

      if (format) labelText = template(format)(props);
      if ($format && typeof reactory.$func[$format] === 'function') {
        labelText = reactory.$func[$format](props);
      }
    }

    return (
      <Typography variant={variant} className={classes.label}>{labelText}</Typography>
    );
  }

  static propTypes = {
    value: PropTypes.any,
    variant: PropTypes.string
  };
  
  static defaultProps = {
    value: "?",
    variant: "h6"
  };


  static styles = (theme) => {
    return {
      label: {
        margin: theme.spacing(1)
      },
    }
  };
}






const LabelComponent = compose(
  withReactory,
  withTheme,
  withStyles(Label.styles))(Label);

export default {
  nameSpace: 'core',
  name: 'Label',
  version: '1.0.0',
  component: LabelComponent,
  tags: ['label'],
  description: 'Basic Label',
};
