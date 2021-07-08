import React, { Fragment } from 'react';
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
} from '@material-ui/core';

import { compose } from 'recompose';
import { withStyles, withTheme } from '@material-ui/core/styles';

const SelectWidget = (props)=> {
  const styles = (theme) => ({
    root: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    formControl: {
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  });

    let elements = null
    let allowNull = true;
    const {
      schema,
      errorSchema,
      uiSchema,
      formData,
      formContext,
      required,
      classes, 
      onChange,
      theme,
    } = props;

    let controlProps = {
      style: {

      },
      className: `${classes.formControl}`
    };

    let uiOptions = uiSchema['ui:options'] || {};

    const {
      labelStyle = {},
      selectProps = {}
    } = uiOptions;

    let variant = 'standard'
    if (theme.MaterialInput) {
      variant = theme.MaterialInput.variant || variant;
    }


    let InputComponent = Input;
    let inputLabelProps = {};
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
      onChange(evt.target.value)
    }

    const renderSelectedValue = (value) => {



      if (value == null || value.length == 0){
        return null//<span style={{ color: 'rgba(150, 150, 150, 0.8)' }}>Select</span>;
      }

      let option = matchOption(value);
      return (
        <>
          {option.icon ? <Icon {...(option.iconProps || { style: { margin: '0px', verticalAlign: 'middle' } })}>{option.icon}</Icon> : null}
          <Typography >{option.label}</Typography>
        </>
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
      <Select
        {...selectProps}
        value={formData || ""}
        onChange={onSelectChanged}
        name={props.name}
        displayEmpty={true}
        renderValue={renderSelectedValue}
        input={<InputComponent id={props.idSchema.$id} value={formData || ""} />}>
        {required === false ? <MenuItem value=""><em>None</em></MenuItem> : null}
        {elements}
      </Select>
    )
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
const SelectWidgetComponent = compose(withTheme, withStyles(SelectWidget.styles))(SelectWidget)
export default SelectWidgetComponent
