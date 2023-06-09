import React, { Component } from 'react'
import {
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl
} from '@mui/material';
import { compose } from 'redux'
import { withStyles, withTheme } from '@mui/styles';
import { withReactory } from '../../api/ApiProvider';

class RadioGroupWidget extends Component<any, any> {
  static styles: (theme: any) => { label: { color: string; fontSize: string; fontWeight: number; }; };

  constructor(props, context) {
    super(props, context)
    this.state = {
      selectedValue: null
    }
  }

  componentDidMount() {
    if (this.props.formData && this.props.formData != '')
      this.setState({ selectedValue: this.props.formData });
  }

  render() {
    const {
      api,
      formData,
      uiSchema,
      classes,
      onChange
    } = this.props;
    const { selectedValue } = this.state;
    let _selectedValue = selectedValue;

    if (formData && formData != '')
      _selectedValue = formData;

    const uiOptions = uiSchema['ui:options'];
    let labelTitle = uiOptions.label || '';

    const self = this;
    const handleChange = event => {
      const value = event.target.value;
      self.setState({ selectedValue: value }, () => {
        if (onChange && typeof onChange === 'function') {
          this.props.onChange(value);
        }
      });
    };

    return (
      <FormControl>
        <RadioGroup style={{ flexDirection: 'row', marginTop: '18px' }} aria-label="gender" name="radio group" value={_selectedValue} onChange={handleChange}>
          {
            uiOptions.radioOptions.map((option, optionIndex) => {
              return (
                <FormControlLabel
                  control={<Radio color="primary" />}
                  label={option.label}
                  key={option.value}
                  labelPlacement="start"
                  value={option.value}
                />
              )
            })
          }
        </RadioGroup>
      </FormControl>
    )

  }
}

RadioGroupWidget.styles = (theme) => {
  return {
    label: {      
      fontSize: '13px',
      fontWeight: 400,
      color: 'rgba(0,0,0,0.54)'
    }
  }
};

const RadioGroupComponent = compose(withTheme, withReactory, withStyles(RadioGroupWidget.styles))(RadioGroupWidget)
export default RadioGroupComponent
