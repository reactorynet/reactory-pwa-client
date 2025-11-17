import React, { Fragment } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import { pullAt, find, isArray, isNil, isEmpty } from 'lodash';
import {
  Icon,
  FormControl,
  InputLabel,
  Input,
  OutlinedInput,
  FilledInput,
  MenuItem,
  Select,
  Typography,
  FormHelperText,
} from '@mui/material';

import { compose } from 'redux';

const PREFIX = 'SelectWidgetComponent';

const classes = {
  root: `${PREFIX}-root`,
  formControl: `${PREFIX}-formControl`,
  selectEmpty: `${PREFIX}-selectEmpty`
};

const StyledSelect = styled(Select)(({ theme }) => ({
  [`& .${classes.root}`]: {
    display: 'flex',
    flexWrap: 'wrap',
  },

  [`& .${classes.formControl}`]: {
    minWidth: 120,
  },

  [`& .${classes.selectEmpty}`]: {
    marginTop: theme.spacing(2),
  }
}));

const SelectWidget = (props) => {
  const theme = useTheme();

    let elements = null
    let allowNull = true;
    const {
      schema,
      errorSchema,
      uiSchema,
      formData,
      formContext,
      required,       
      onChange,
    } = props;

    let controlProps = {
      style: {

      },
      className: `${classes.formControl}`,
    };

    let uiOptions = uiSchema['ui:options'] || {};
    const disabled = uiSchema.disabled || uiOptions.disabled || false
    const readonly = uiSchema.disabled || uiOptions.disabled || false
   
    const {
      labelStyle = {},
      selectProps = {}
    } = uiOptions;

    let variant = 'standard' as 'standard' | 'outlined' | 'filled'
    if (theme.components?.MuiInput) {
      // TODO fix the variant type
      //variant = (theme.components.MuiInput.variants[0]?.props as 'standard' | 'outlined' | 'filled' || variant;
    }

    let InputComponent = Input;
    let inputLabelProps: any = {};
    switch (variant) {
      case 'outlined': {
        InputComponent = OutlinedInput;
        if (isNil(formData) === true || `${formData}`.trim() === "" || isEmpty(formData) === true) {
          inputLabelProps.shrink = false;
        } else {
          inputLabelProps.shrink = true;
          inputLabelProps.style = {
            backgroundColor: 'white',
            padding: '3px'
          };
        }
        break;
      }
      case 'filled': {
        InputComponent = FilledInput;
      }
    }

    if (uiOptions.selectOptions && isArray(uiOptions.selectOptions) === true) {
      elements = uiOptions.selectOptions.map((option, index) => {

        return (
          <MenuItem key={option.key || index} value={option.value}>
            {option.icon ? <Icon {...(option.iconProps || {})}>{option.icon}</Icon> : null}
            {option.label}
          </MenuItem>)
      })
    }

    if (uiOptions.FormControl && uiOptions.FormControl.props) {
      controlProps = { ...controlProps, ...uiOptions.FormControl.props }
    };

    const matchOption = value => {
      if (uiSchema['ui:options'] && uiSchema['ui:options'].selectOptions) {
        const option = find(uiSchema['ui:options'].selectOptions, { value: value })
        return option ? option : { value: value, label: value }
      }
    }

    const onSelectChanged = (evt) => {
      const {value, name} = evt.target
      if (value === '') {
        onChange(null)
      } else {
        onChange(value)
      }
    }

    const renderSelectedValue = (value) => {
      if (value == null || value.length == 0){
        return null//<span style={{ color: 'rgba(150, 150, 150, 0.8)' }}>Select</span>;
      }

      let option = matchOption(value);
      return (
        <span style={{ paddingLeft: '12px', paddingTop: '8px', display: 'inline-flex', alignItems: 'center' }}>
          {option?.icon ? <Icon {...(option.iconProps || { style: { margin: '0px', verticalAlign: 'middle' } })}>{option.icon}</Icon> : null}
          <Typography component="span" style={{ marginLeft: option?.icon ? 4 : 0 }}>{option?.label || value}</Typography>
        </span>
      )
    };


    inputLabelProps.style = { ...inputLabelProps.style, ...labelStyle }
    /**
     *   <InputLabel {...inputLabelProps}
          htmlFor={self.props.idSchema.$id}
          required={required === true}>{self.props.schema.title}</InputLabel>
     * 
     */
    return (
      <StyledSelect
        {...selectProps}
        value={formData || ""}
        onChange={onSelectChanged}
        name={props.name}
        displayEmpty={true}
        disabled = {disabled || readonly}
        renderValue={renderSelectedValue}
        // input={<InputComponent id={props.idSchema.$id} value={formData || ""} />}
        >
        {required === false ? <MenuItem value=""><em>None</em></MenuItem> : null}
        {elements}
      </StyledSelect>
    );
}
SelectWidget.propTypes = {
  formData: PropTypes.any,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  readOnly: PropTypes.bool,
  schema: PropTypes.object,
  uiSchema: PropTypes.object
}
SelectWidget.defaultProps = {
  formData: [],
  readOnly: false
}
const SelectWidgetComponent = compose()(SelectWidget)
export default SelectWidgetComponent
