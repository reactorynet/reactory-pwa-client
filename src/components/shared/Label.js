import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { Typography } from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

import { template } from 'lodash';

class Label extends Component {


  render() {

    const { props } = this;
    const {
      value = "?",
      variant = "h6",
      classes,
      reactory,
    } = props;

    let labelText = value;

    debugger
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
}

Label.propTypes = {
  value: PropTypes.any,
  variant: PropTypes.string
};

Label.defaultProps = {
  value: "?",
  variant: "h6"
};



Label.styles = (theme) => {
  return {
    label: {
      margin: theme.spacing(1)
    },
  }
};


const LabelComponent = compose(
  withApi,
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
