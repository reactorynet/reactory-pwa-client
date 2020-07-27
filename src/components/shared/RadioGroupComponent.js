import React, { Component } from 'react'
import {
  Radio,
  RadioGroup,
  FormControlLabel
} from '@material-ui/core';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '../../api/ApiProvider';

class RadioGroupWidget extends Component {

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
      <div>
        {labelTitle != '' && <label className={classes.label}>{labelTitle}</label>}
        <div>
          {
            <RadioGroup style={{ flexDirection: 'row' }} aria-label="gender" name="radio group" value={_selectedValue} onChange={handleChange}>
              {
                uiOptions.radioOptions.map((option, optionIndex) => {
                  return (
                    <FormControlLabel
                      control={<Radio color="primary" />}
                      label={option.label}
                      key={option.value}
                      labelPlacement="left"
                      value={option.value}
                    />
                  )
                })
              }
            </RadioGroup>
          }
        </div>
      </div >
    )

  }
}

RadioGroupWidget.styles = (theme) => {
  return {
    label: {
      color: 'red',
      fontSize: '13px',
      fontWeight: 400,
      color: 'rgba(0,0,0,0.54)'
    }
  }
};

const RadioGroupComponent = compose(withTheme, withApi, withStyles(RadioGroupWidget.styles))(RadioGroupWidget)
export default RadioGroupComponent
