import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  Typography,
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Slider from '@material-ui/core/Slider';
import Reactory from 'types/reactory';

const styles = (theme) => ({
  root: {
    width: '85%',
  },
  slider: {
    padding: '22px 0px',
    margin: 'auto'
  },
});


interface SliderWidgetUISchema {
  'ui:options': {
    min: number,
    max: number,
    step: number,
    marks: boolean,
    range?: boolean
  },
  'ui:widget': string
}

interface SliderWidgetWidgetProps {
  formData: number | number[],
  onChange: (formData: number | number[]) => void,
  idSchema: Reactory.IDSchema,
  uiSchema: SliderWidgetUISchema,
  schema: Reactory.ISchema,
  reactory: Reactory.Client.IReactoryApi,
}

/**
 * Slider Reactory Widget
 * @param param0 
 * @returns 
 */
const SliderWidget = (props: SliderWidgetWidgetProps) => {

  const { formData, onChange, uiSchema, reactory, schema, idSchema } = props;

  const handleChange = (event, value) => {
    if (onChange) onChange(value);
  };

  let options: any = { min: 0, max: 100, step: 1, marks: true }

  if (uiSchema['ui:options']) options = { ...options, ...uiSchema['ui:options'] }

  /**
   * 
   *  getAriaValueText={valuetext}
        aria-labelledby="discrete-slider"
        valueLabelDisplay="auto"
   * 
   */

  const getAriaValueText = (value: number) => {
    return options.valueTextFormat ? reactory.utils.template(options.valueTextForm)({ value }) : `${value}`;
  }

  const slider = (
    <Slider
      id={idSchema.$id}
      value={formData || 0}
      min={options.min}
      step={options.step || 1}
      marks={options.marks === true}
      max={options.max}
      aria-labelledby="label"
      onChange={handleChange}
      getAriaValueText={getAriaValueText}
      valueLabelDisplay={options.valueLabelDisplay || "auto"}
    />
  );

  if (schema.type === 'array') {
    return (
      <FormControl style={{ marginTop: '8px' }}>
        <InputLabel shrink={true} htmlFor={idSchema.$id}>{schema.title}</InputLabel>
        <div style={{ paddingTop: '8px' }}>{slider}</div>
        <FormHelperText>{schema.description}</FormHelperText>
      </FormControl>
    )
  } else {
    return slider;
  }
}

export const SliderWidgetComponent = withStyles(styles)(SliderWidget);
export default SliderWidgetComponent