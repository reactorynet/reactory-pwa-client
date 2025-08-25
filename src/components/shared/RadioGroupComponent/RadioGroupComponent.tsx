import React, { useState, useEffect } from 'react'
import {
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl
} from '@mui/material';
import { compose } from 'redux'
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

const RadioGroupWidget = (props: any) => {
  const theme = useTheme();
  const [selectedValue, setSelectedValue] = useState(null);
  
  const {
    api,
    formData,
    uiSchema,
    onChange
  } = props;
    let _selectedValue = selectedValue;

    useEffect(() => {
      if (formData && formData != '') {
        setSelectedValue(formData);
      }
    }, [formData]);

    if (formData && formData != '')
      _selectedValue = formData;

    const uiOptions = uiSchema['ui:options'];
    let labelTitle = uiOptions.label || '';

    const handleChange = event => {
      const value = event.target.value;
      setSelectedValue(value);
      if (onChange && typeof onChange === 'function') {
        props.onChange(value);
      }
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
    );
};

export default RadioGroupWidget;
