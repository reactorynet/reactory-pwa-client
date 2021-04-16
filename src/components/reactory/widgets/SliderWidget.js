import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import {
  FormControl,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';

const styles = theme => ({
  root: {
    width: '85%',
  },
  slider: {
    padding: '22px 0px',
    margin: 'auto'
  },
});


const SliderWidget = ({ formData, onChange, uiSchema }) => {

  const handleChange = (event, value) => {
    if (onChange) onChange(value);
  };

  let options = { min: 0, max: 100, step: 1, marks: true }
  if (uiSchema['ui:options']) options = { ...options, ...uiSchema['ui:options'] }

  return (
    <Slider
      value={formData || 0}
      min={options.min}
      step={1}
      marks={options.marks === true}
      max={options.max}
      aria-labelledby="label"
      onChange={handleChange}
    />
  );
}

export const SliderWidgetComponent = withStyles(SliderWidget.styles)(SliderWidget);
export default SliderWidgetComponent