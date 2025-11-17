import React, { Fragment } from 'react';
import { throttle } from 'lodash';
import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import Slider from '@mui/material/Slider';
import Reactory from '@reactory/reactory-core';

const StyledSliderContainer = styled('div')(({ theme }: { theme: Theme }) => ({
  width: '85%',
  '& .slider': {
    padding: '22px 0px',
    margin: 'auto'
  },
}));


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
  idSchema: Reactory.Schema.IDSchema,
  uiSchema: SliderWidgetUISchema,
  schema: Reactory.Schema.ISchema,
  reactory: Reactory.Client.IReactoryApi,
}

/**
 * Slider Reactory Widget
 * @param param0 
 * @returns 
 */
const SliderWidget = (props: SliderWidgetWidgetProps) => {
  const theme = useTheme();

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

  const styles: any = {
    font: 'inherit',
    width: '100 %',
    border: '0',
    height: '1.1876em',
    margin: '0',
    display: 'block',
    padding: '6px 0 7px',
    minWidth: '0',
    background: 'none',
    boxSizing: 'content-box',
    animationName: 'mui-auto-fill-cancel',
    'letterSpacing': 'inherit',
    'animationDuration': '10ms',
    '-webkit-tap-highlight-color': 'transparent'
  };

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
      <FormControl>
        <InputLabel shrink={true} htmlFor={idSchema.$id}>{schema.title}</InputLabel>
        <div className={'MuiInputBase-input'} style={{ ...styles, paddingTop: '8px' }}>{slider}</div>
        <FormHelperText>{schema.description}</FormHelperText>
      </FormControl>
    )
  } else {
    
    return <div className={'MuiInputBase-input'} style={{ ...styles, paddingTop: '8px' }}>{slider}</div>;
  }
}

export default SliderWidget;